'use client';

import { getApiUrl } from '@/lib/api-url';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MovementsListPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/inventory/movements?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMovements(data.data || []);
    } catch (error) {
      console.error("Error fetching movements", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Historial Global de Movimientos</h1>
        <Link href="/dashboard/inventory">
          <button className="text-blue-600 hover:underline font-medium">Volver al Resumen</button>
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay movimientos registrados.</td></tr>
              ) : (
                movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link href={`/dashboard/inventory/${m.productId}`} className="text-blue-600 hover:underline">
                        {m.product?.nombre || 'Producto Desconocido'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {m.tipo.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-800">{m.cantidad}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.usuario?.name || 'Sistema'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
