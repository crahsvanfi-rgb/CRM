import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  clienteId: string;

  @IsUUID()
  @IsNotEmpty()
  vendedorId: string;

  @IsOptional()
  @IsDateString()
  fechaEsperada?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
