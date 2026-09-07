'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderFormPage() {
  const router = useRouter();
  const [items, setItems] = useState([{ productId: '', cantidad: 1, precioUnitario: 0, descuento: 0 }]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [formData, setFormData] = useState({
    clienteId: '',
    vendedorId: '77777777-7777-4777-8777-777777777777', // Mock del vendedor actual
    fechaEsperada: '',
    observaciones: ''
  });

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  const getHeaders = (isJson = false) => {
    const rawToken = localStorage.getItem('token') || localStorage.getItem('supabase_token') || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken : (rawToken ? `Bearer ${rawToken}` : '');
    const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenant_id') || process.env.NEXT_PUBLIC_TENANT_ID || '12345678-1234-1234-1234-123456789012';
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '77777777-7777-4777-8777-777777777777';

    const h: Record<string, string> = {
      'x-tenant-id': tenantId,
      'x-user-id': userId,
      'x-role': 'Admin',
    };
    if (token) h['Authorization'] = token;
    if (isJson) h['Content-Type'] = 'application/json';
    return h;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, productsRes] = await Promise.all([
          fetch(`${apiUrl}/customers`, { headers: getHeaders() }),
          fetch(`${apiUrl}/products`, { headers: getHeaders() })
        ]);
        
        if (customersRes.ok) {
          const cData = await customersRes.json();
          setClientes(cData.data || cData.items || cData);
        }
        
        if (productsRes.ok) {
          const pData = await productsRes.json();
          setProductos(pData.data || pData.items || pData);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [apiUrl]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', cantidad: 1, precioUnitario: 0, descuento: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems: any = [...items];
    newItems[index][field] = value;
    
    // Auto-completar precio si se selecciona producto
    if (field === 'productId') {
      const prod: any = productos.find((p: any) => p.id === value);
      if (prod) newItems[index].precioUnitario = prod.precioVenta;
    }
    
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario - item.descuento), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, items };
      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/dashboard/orders');
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Error de servidor' }));
        alert('Error al crear el pedido: ' + (errorData.message || JSON.stringify(errorData)));
      }
    } catch (error: any) {
      console.error(error);
      alert('No se pudo conectar con el servidor: ' + (error.message || 'Error de red'));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Nuevo Pedido</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <select 
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                value={formData.clienteId}
                onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombreComercial || c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Esperada (Opcional)</label>
              <input 
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                value={formData.fechaEsperada}
                onChange={(e) => setFormData({...formData, fechaEsperada: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Observaciones</label>
              <textarea 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                rows={2}
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Notas adicionales del pedido..."
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg">Productos</h3>
              <button type="button" onClick={handleAddItem} className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ Agregar Ítem</button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end bg-gray-50 p-3 rounded-md border">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500">Producto</label>
                    <select 
                      required
                      className="mt-1 block w-full rounded-md border p-2 text-sm"
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {productos.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500">Cantidad</label>
                    <input type="number" min="1" required className="mt-1 block w-full rounded-md border p-2 text-sm" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', Number(e.target.value))} />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500">Precio</label>
                    <input type="number" step="0.01" required className="mt-1 block w-full rounded-md border p-2 text-sm" value={item.precioUnitario} onChange={(e) => handleItemChange(index, 'precioUnitario', Number(e.target.value))} />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500">Desc.</label>
                    <input type="number" step="0.01" className="mt-1 block w-full rounded-md border p-2 text-sm" value={item.descuento} onChange={(e) => handleItemChange(index, 'descuento', Number(e.target.value))} />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500">Total</label>
                    <div className="mt-1 p-2 text-sm font-semibold bg-gray-100 rounded-md">
                      ${(item.cantidad * item.precioUnitario - item.descuento).toFixed(2)}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-red-500 hover:text-red-700">✕</button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end text-xl font-bold">
              Total: ${calculateSubtotal().toFixed(2)}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Crear Pedido</button>
          </div>
        </form>
      </div>
    </div>
  );
}
