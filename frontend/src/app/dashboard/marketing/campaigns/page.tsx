'use client';

import { apiPath } from '@/lib/api-url';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiPath('/campaigns'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(apiPath(`/campaigns/${id}/duplicate`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCampaigns();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(apiPath(`/campaigns/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCampaigns();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Campañas</h1>
        <button
          onClick={() => router.push('/dashboard/marketing/campaigns/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Nueva Campaña
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Nombre</th>
              <th className="p-2">Canal</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Destinatarios</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{c.nombre}</td>
                <td className="p-2">{c.canal}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    c.estado === 'BORRADOR' ? 'bg-gray-200' :
                    c.estado === 'PROGRAMADA' ? 'bg-blue-200' : 'bg-green-200'
                  }`}>
                    {c.estado}
                  </span>
                </td>
                <td className="p-2">{c._count?.recipients || 0}</td>
                <td className="p-2 space-x-2">
                  <button onClick={() => router.push(`/dashboard/marketing/campaigns/${c.id}`)} className="text-blue-500">Ver</button>
                  <button onClick={() => handleDuplicate(c.id)} className="text-gray-500">Duplicar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500">Eliminar</button>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">No hay campañas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
