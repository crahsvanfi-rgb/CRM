"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ExportCsvButton from '../components/ExportCsvButton';

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const d = new Date();
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(firstDay);
  const [fechaFin, setFechaFin] = useState(lastDay);

  const isNoDateReport = reportId === 'stock-summary';

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';
      
      let url = `/api/reports/${reportId}`;
      if (!isNoDateReport) {
        url += `?fechaInicio=${fechaInicio}T00:00:00.000Z&fechaFin=${fechaFin}T23:59:59.999Z`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      if (!res.ok) throw new Error('Error fetching report');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [reportId, fechaInicio, fechaFin, isNoDateReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const renderData = () => {
    if (loading) return <p className="text-gray-500 py-4">Generando reporte...</p>;
    if (!data) return <p className="text-gray-500 py-4">No hay datos.</p>;

    // Case 1: Array data
    if (Array.isArray(data)) {
      if (data.length === 0) return <p className="text-gray-500 py-4">No se encontraron resultados.</p>;
      const keys = Object.keys(data[0]);
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {keys.map(k => <th key={k} className="px-4 py-2 text-left font-medium text-gray-500 uppercase">{k}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className={row.alerta ? 'bg-red-50' : ''}>
                  {keys.map(k => (
                    <td key={k} className="px-4 py-2 text-gray-700">
                      {typeof row[k] === 'object' && row[k] !== null ? JSON.stringify(row[k]) : String(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Case 2: Object data (like sales-by-period or lead conversion)
    const keys = Object.keys(data);
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {keys.map(k => {
          if (Array.isArray(data[k])) {
            return (
              <div key={k} className="col-span-2 md:col-span-4 mt-4">
                <h3 className="font-semibold text-gray-700 capitalize mb-2">{k}</h3>
                <ul className="bg-gray-50 p-4 rounded border text-sm space-y-1">
                  {data[k].map((item: any, i: number) => (
                    <li key={i}>{JSON.stringify(item)}</li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={k} className="bg-gray-50 p-4 rounded border text-center">
              <p className="text-xs text-gray-500 uppercase">{k}</p>
              <p className="text-xl font-bold text-gray-800">{Number.isNaN(Number(data[k])) ? data[k] : Number(data[k]).toFixed(2)}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const getCsvData = () => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    // Flat object
    return [data];
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← Volver</button>
          <h1 className="text-2xl font-bold text-gray-800 capitalize">{String(reportId).replace(/-/g, ' ')}</h1>
        </div>
        <ExportCsvButton data={getCsvData()} filename={`reporte-${reportId}`} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!isNoDateReport && (
          <div className="flex items-end space-x-4 mb-6 pb-6 border-b">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha Inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-2 rounded text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha Fin</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-2 rounded text-sm" />
            </div>
            <button onClick={fetchReport} className="bg-blue-600 text-white px-4 py-2 rounded text-sm shadow hover:bg-blue-700">Actualizar</button>
          </div>
        )}

        {renderData()}
      </div>
    </div>
  );
}
