'use client';

import { getApiUrl } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ProductInventoryPage() {
  const params = useParams();
  const productId = params.productId as string;
  const [stock, setStock] = useState<any>(null);
  const [movements, setMovements] = useState([]);
  const [submitError, setSubmitError] = useState('' );
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ tipo: 'AJUSTE_POSITIVO', cantidad: 1, motivo: '', documentoRef: '' });

  useEffect(() => {
    if (productId) {
      fetchStock();
      fetchMovements();
    }
  }, [productId]);

  const fetchStock = async () => {
    const res = await fetch(`${getApiUrl()}/inventory/stock/${productId}`, { headers: getAuthHeaders() });
    setStock(await res.json());
  };

  const fetchMovements = async () => {
    const res = await fetch(`${getApiUrl()}/inventory/movements?productId=${productId}&limit=20`, { headers: getAuthHeaders() });
    const data = await res.json();
    setMovements(data.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const requestUrl = `${getApiUrl()}/inventory/movements`;
    const requestBody = { ...formData, productId, cantidad: Number(formData.cantidad) };
    const requestHeaders = getAuthHeaders();
    console.info('[Inventario] POST movimiento', { url: requestUrl, body: requestBody, headers: { ...requestHeaders, Authorization: requestHeaders.Authorization ? '[present]' : '[missing]' } });

    try {
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });
      const json = await res.json().catch(() => ({}));
      console.info('[Inventario] respuesta movimiento', { status: res.status, ok: res.ok, response: json });
      if (!res.ok) throw new Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Error al guardar movimiento');
      setShowModal(false);
      await Promise.all([fetchStock(), fetchMovements()]);
    } catch (error: any) {
      console.error('[Inventario] error al guardar movimiento', error);
      setSubmitError(error.message || 'Error al guardar movimiento');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Detalle de Inventario del Producto</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors shadow">
          Nuevo Movimiento
        </button>
      </div>

      {stock && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 shadow-sm rounded border-l-4 border-gray-500">
            <p className="text-sm text-gray-500 font-medium">Stock Físico</p>
            <p className="text-3xl font-bold mt-1 text-gray-800">{stock.fisico}</p>
          </div>
          <div className="bg-white p-4 shadow-sm rounded border-l-4 border-orange-500">
            <p className="text-sm text-gray-500 font-medium">Reservado</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{stock.reservado}</p>
          </div>
          <div className="bg-white p-4 shadow-sm rounded border-l-4 border-green-500">
            <p className="text-sm text-gray-500 font-medium">Disponible</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{stock.disponible}</p>
          </div>
          <div className="bg-white p-4 shadow-sm rounded border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 font-medium">En Tránsito</p>
            <p className="text-3xl font-bold mt-1 text-blue-600">{stock.transito}</p>
          </div>
        </div>
      )}

      {/* Tabla de Movimientos */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <h2 className="p-4 font-bold border-b bg-gray-50 text-gray-700">Últimos Movimientos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">S. Anterior</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">S. Posterior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {movements.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{m.tipo.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">{m.cantidad}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{m.stockAnterior}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-gray-800">{m.stockPosterior}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay movimientos registrados para este producto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Básico */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Registrar Nuevo Movimiento</h3>
            {submitError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento</label>
                <select className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste Negativo (-)</option>
                  <option value="ENTRADA_IMPORTACION">Entrada por Importación (+)</option>
                  <option value="DEVOLUCION">Devolución (+)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input type="number" min="1" className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value as any})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                <input type="text" className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} placeholder="Ej. Inventario inicial" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documento Ref. (Opcional)</label>
                <input type="text" className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" value={formData.documentoRef} onChange={e => setFormData({...formData, documentoRef: e.target.value})} placeholder="Ej. FACT-001" />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm transition-colors">Guardar Movimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
