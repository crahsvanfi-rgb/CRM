'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  useEffect(() => {
    fetchQuotes();
  }, [search]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const rawToken = localStorage.getItem('token') || localStorage.getItem('supabase_token') || '';
      const token = rawToken.startsWith('Bearer ') ? rawToken : (rawToken ? `Bearer ${rawToken}` : '');
      const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenant_id') || process.env.NEXT_PUBLIC_TENANT_ID || '12345678-1234-1234-1234-123456789012';

      const res = await fetch(`${apiUrl}/quotes?search=${encodeURIComponent(search)}`, {
        headers: {
          'x-tenant-id': tenantId,
          ...(token ? { 'Authorization': token } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.data || data.items || (Array.isArray(data) ? data : []));
      }
    } catch (e) {
      console.error('Error fetching quotes:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BORRADOR': return 'bg-gray-100 text-gray-800';
      case 'ENVIADA': return 'bg-blue-100 text-blue-800';
      case 'ACEPTADA': return 'bg-green-100 text-green-800';
      case 'RECHAZADA': return 'bg-red-100 text-red-800';
      case 'VENCIDA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
        <Link 
          href="/dashboard/quotes/form"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Nueva Cotización
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input 
          type="text"
          placeholder="Buscar por número o cliente..."
          className="w-full md:w-1/3 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center">Cargando...</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay cotizaciones</td></tr>
            ) : (
              quotes.map((q: any) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{q.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{q.cliente?.nombreComercial || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{q.moneda} {q.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(q.estado)}`}>
                      {q.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/quotes/${q.id}`} className="text-blue-600 hover:text-blue-900">Ver Detalles</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
