'use client';

import { apiPath } from '@/lib/api-url';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ImportationsPage() {
  const [importations, setImportations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchImportations();
  }, []);

  const fetchImportations = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiPath(`/importations?search=${search}`), {
        headers: { 'x-tenant-id': 'test-tenant' }
      });
      if (!res.ok) throw new Error('Error fetching importations');
      const json = await res.json();
      setImportations(json.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      PLANIFICADA: 'bg-gray-100 text-gray-800',
      ORDENADA: 'bg-blue-100 text-blue-800',
      EN_PRODUCCION: 'bg-yellow-100 text-yellow-800',
      EMBARCADA: 'bg-indigo-100 text-indigo-800',
      EN_TRANSITO: 'bg-purple-100 text-purple-800',
      ADUANA: 'bg-orange-100 text-orange-800',
      RECIBIDA: 'bg-green-100 text-green-800',
      CERRADA: 'bg-teal-100 text-teal-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Importaciones</h1>
        <Link 
          href="/dashboard/importations/form" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + Nueva Importación
        </Link>
      </div>

      <div className="mb-6 flex gap-4">
        <input 
          type="text" 
          placeholder="Buscar por código o proveedor..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchImportations()}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
        />
        <button onClick={fetchImportations} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
          Buscar
        </button>
      </div>

      {loading ? (
        <p>Cargando importaciones...</p>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {importations.map((imp) => (
                <tr key={imp.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{imp.codigo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {imp.proveedor?.nombre}
                    <div className="text-xs text-gray-400">{imp.paisOrigen}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(imp.estado)}`}>
                      {imp.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {imp.eta ? new Date(imp.eta).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/importations/${imp.id}`} className="text-blue-600 hover:text-blue-900">Ver Detalles</Link>
                  </td>
                </tr>
              ))}
              {importations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No se encontraron importaciones.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
