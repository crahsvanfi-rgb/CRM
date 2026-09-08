import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { OrderStatus, MovementType, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService
  ) {}

  async create(tenantId: string, dto: CreateOrderDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);

    // Validar cliente y vendedor
    const [cliente, vendedor] = await Promise.all([
      tenantClient.customer.findUnique({ where: { id: dto.clienteId, tenantId } }),
      tenantClient.user.findUnique({ where: { id: dto.vendedorId, tenantId } })
    ]);

    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

    // Verificar productos
    const productIds = dto.items.map(i => i.productId);
    const products = await tenantClient.product.findMany({ where: { id: { in: productIds }, tenantId } });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Algunos productos no fueron encontrados');
    }

    // Calcular totales
    let subtotal = 0;
    const itemsToCreate = dto.items.map(item => {
      const itemSubtotal = item.cantidad * item.precioUnitario;
      const itemDiscount = item.descuento || 0;
      const total = itemSubtotal - itemDiscount;
      subtotal += total;
      return {
        tenantId,
        productId: item.productId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: itemDiscount,
        total,
      };
    });

    const total = subtotal;

    return tenantClient.$transaction(async (tx: any) => {
      const lastOrder = await tx.order.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });

      let nextNumber = 1;
      if (lastOrder && lastOrder.numero.startsWith('PED-')) {
        const parts = lastOrder.numero.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
          nextNumber = parseInt(parts[1], 10) + 1;
        }
      }
      const numero = `PED-${nextNumber.toString().padStart(4, '0')}`;

      return tx.order.create({
        data: {
          tenantId,
          numero,
          clienteId: dto.clienteId,
          vendedorId: dto.vendedorId,
          fechaEsperada: dto.fechaEsperada ? new Date(dto.fechaEsperada) : null,
          total,
          observaciones: dto.observaciones,
          estado: OrderStatus.PENDIENTE,
          items: {
            create: itemsToCreate
          }
        },
        include: { items: true }
      });
    });
  }

  async findAll(tenantId: string, page: number, limit: number, search?: string, estado?: OrderStatus, clienteId?: string, vendedorId?: string, fechaInicio?: string, fechaFin?: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    let whereClause: Prisma.OrderWhereInput = { tenantId, activo: true };

    if (search) {
      whereClause.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { cliente: { nombreComercial: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (estado) whereClause.estado = estado;
    if (clienteId) whereClause.clienteId = clienteId;
    if (vendedorId) whereClause.vendedorId = vendedorId;
    
    if (fechaInicio || fechaFin) {
      whereClause.fecha = {};
      if (fechaInicio) whereClause.fecha.gte = new Date(fechaInicio);
      if (fechaFin) whereClause.fecha.lte = new Date(fechaFin);
    }

    const [total, data] = await Promise.all([
      tenantClient.order.count({ where: whereClause }),
      tenantClient.order.findMany({
        where: whereClause,
        include: {
          cliente: { select: { nombreComercial: true, email: true } },
          vendedor: { select: { name: true, email: true } },
          _count: { select: { items: true } }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  async findOne(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const order = await tenantClient.order.findUnique({
      where: { id, tenantId },
      include: {
        cliente: true,
        vendedor: true,
        items: {
          include: { product: true }
        }
      }
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async update(tenantId: string, id: string, dto: UpdateOrderDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const order = await this.findOne(tenantId, id);

    if (order.estado === OrderStatus.ENTREGADO || order.estado === OrderStatus.CANCELADO) {
      throw new BadRequestException('No se puede modificar un pedido Entregado o Cancelado');
    }

    return tenantClient.$transaction(async (tx: any) => {
      let dataToUpdate: any = {
        clienteId: dto.clienteId,
        vendedorId: dto.vendedorId,
        fechaEsperada: dto.fechaEsperada ? new Date(dto.fechaEsperada) : undefined,
        observaciones: dto.observaciones
      };

      if (dto.items && dto.items.length > 0) {
        if (order.estado === OrderStatus.CONFIRMADO) {
          throw new BadRequestException('No se pueden modificar los items de un pedido ya confirmado (Requiere cancelar y rehacer o ajustar lógica compleja).');
        }

        await tx.orderItem.deleteMany({ where: { orderId: id, tenantId } });

        let subtotal = 0;
        const itemsToCreate = dto.items.map(item => {
          const itemSubtotal = item.cantidad * item.precioUnitario;
          const itemDiscount = item.descuento || 0;
          const total = itemSubtotal - itemDiscount;
          subtotal += total;
          return {
            tenantId,
            productId: item.productId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: itemDiscount,
            total,
          };
        });

        dataToUpdate.total = subtotal;
        dataToUpdate.items = { create: itemsToCreate };
      }

      return tx.order.update({
        where: { id },
        data: dataToUpdate,
        include: { items: true }
      });
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const order = await this.findOne(tenantId, id);

    if (order.estado !== OrderStatus.PENDIENTE && order.estado !== OrderStatus.CANCELADO) {
      throw new BadRequestException('Solo se pueden eliminar pedidos en estado PENDIENTE o CANCELADO');
    }

    return tenantClient.order.update({
      where: { id },
      data: { activo: false }
    });
  }

  async confirm(tenantId: string, userId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const order = await this.findOne(tenantId, id);

    if (order.estado !== OrderStatus.PENDIENTE) {
      throw new BadRequestException('El pedido debe estar en estado PENDIENTE para ser confirmado');
    }

    return tenantClient.$transaction(async (tx: any) => {
      // 1. Validar stock físico para cada item ANTES de reservar, o dejar que inventoryService lance error.
      for (const item of order.items) {
        await this.inventory.reserveStock(tenantId, userId, {
          productId: item.productId,
          cantidad: item.cantidad,
          documentoRef: order.numero
        }, tx);
      }

      // 2. Cambiar estado a CONFIRMADO
      return tx.order.update({
        where: { id },
        data: { estado: OrderStatus.CONFIRMADO }
      });
    });
  }

  async cancel(tenantId: string, userId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const order = await this.findOne(tenantId, id);

    if (order.estado === OrderStatus.ENTREGADO || order.estado === OrderStatus.CANCELADO) {
      throw new BadRequestException('Transición de estado inválida para cancelación.');
    }

    return tenantClient.$transaction(async (tx: any) => {
      // Si el pedido estaba confirmado (o posterior), liberar reservas
      if (order.estado === OrderStatus.CONFIRMADO) {
        for (const item of order.items) {
          await this.inventory.releaseStock(tenantId, userId, {
            productId: item.productId,
            cantidad: item.cantidad,
            documentoRef: order.numero
          }, tx);
        }
      }

      return tx.order.update({
        where: { id },
        data: { estado: OrderStatus.CANCELADO }
      });
    });
  }

  async deliver(tenantId: string, userId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const order = await this.findOne(tenantId, id);

    if (order.estado !== OrderStatus.CONFIRMADO) {
      throw new BadRequestException('El pedido debe estar confirmado para poder entregarlo');
    }

    return tenantClient.$transaction(async (tx: any) => {
      // Liberar las reservas y generar salidas definitivas
      for (const item of order.items) {
        // Liberar reserva primero
        await this.inventory.releaseStock(tenantId, userId, {
          productId: item.productId,
          cantidad: item.cantidad,
          documentoRef: order.numero
        }, tx);

        // Registrar salida
        await this.inventory.createMovement(tenantId, userId, {
          productId: item.productId,
          tipo: MovementType.SALIDA_VENTA,
          cantidad: item.cantidad,
          documentoRef: order.numero,
          motivo: 'Entrega de pedido ' + order.numero
        }, tx);
      }

      return tx.order.update({
        where: { id },
        data: { estado: OrderStatus.ENTREGADO }
      });
    });
  }

  async generatePdf(tenantId: string, id: string): Promise<Buffer> {
    const order = await this.findOne(tenantId, id);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const customerName = order.cliente?.nombreComercial || order.cliente?.razonSocial || 'Sin nombre';
      const customerEmail = order.cliente?.email || 'Sin email';

      doc.fontSize(18).text(`Pedido ${order.numero}`, { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`Fecha: ${order.fecha.toLocaleDateString()}`);
      doc.text(`Cliente: ${customerName} (${customerEmail})`);
      doc.text(`Estado: ${order.estado}`);
      doc.moveDown();

      doc.fontSize(12).text('Items', { underline: true });
      doc.moveDown(0.5);
      order.items.forEach((item: any, index: number) => {
        doc.fontSize(10).text(
          `${index + 1}. ${item.product?.nombre || 'Producto'} | Cantidad: ${item.cantidad} | Precio: ${Number(item.precioUnitario).toFixed(2)} | Total: ${Number(item.total).toFixed(2)}`,
        );
      });

      doc.moveDown();
      doc.fontSize(13).text(`Total final: ${Number(order.total).toFixed(2)}`, { align: 'right' });

      if (order.observaciones) {
        doc.moveDown();
        doc.fontSize(12).text('Observaciones:', { underline: true });
        doc.fontSize(10).text(order.observaciones);
      }

      doc.end();
    });
  }
}

