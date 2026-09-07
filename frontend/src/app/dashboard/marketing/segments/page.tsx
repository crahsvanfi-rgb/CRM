'use client';

import { apiPath } from '@/lib/api-url';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiPath('/segments'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSegments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este segmento?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(apiPath(`/segments/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSegments();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Segmentos</h1>
        <button
          onClick={() => router.push('/dashboard/marketing/segments/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Nuevo Segmento
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Nombre</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {segments.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{s.nombre}</td>
                <td className="p-2">{s.tipoSegmento}</td>
                <td className="p-2">{s.descripcion}</td>
                <td className="p-2 space-x-2">
                  <button onClick={() => handleDelete(s.id)} className="text-red-500">Eliminar</button>
                </td>
              </tr>
            ))}
            {segments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">No hay segmentos creados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
