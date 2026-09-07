"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ActivityDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('supabase_token') || ''}`,
    'x-tenant-id': localStorage.getItem('tenant_id') || '',
    'Content-Type': 'application/json'
  });

  const fetchActivity = async () => {
    try {
      const res = await fetch(`/api/activities/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Activity not found');
      const data = await res.json();
      setActivity(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/activities/${id}/${action}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchActivity();
      } else {
        alert(`Error al intentar ${action} la actividad`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error || !activity) return <div className="p-6 text-red-500">{error || 'Actividad no encontrada.'}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← Volver</button>
        <h1 className="text-2xl font-bold text-gray-800">Detalles de la Actividad</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold mb-2">{activity.titulo}</h2>
            <div className="flex space-x-2 mb-4">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">{activity.tipo}</span>
              <span className={`px-2 py-1 rounded text-sm ${activity.estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {activity.estado}
              </span>
            </div>
          </div>
          <div className="space-x-2">
            {activity.estado === 'PENDIENTE' && (
              <>
                <button onClick={() => handleAction('complete')} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">Completar</button>
                <button onClick={() => handleAction('cancel')} className="bg-red-50 text-red-600 px-4 py-2 rounded shadow hover:bg-red-100">Cancelar</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-500">Fecha y Hora</p>
            <p className="font-medium">{new Date(activity.fecha).toLocaleDateString()} {activity.hora}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Responsable</p>
            <p className="font-medium">{activity.responsable?.name || 'Desconocido'}</p>
          </div>
          {activity.cliente && (
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <Link href={`/dashboard/customers/${activity.cliente.id}`} className="font-medium text-blue-600 hover:underline">
                {activity.cliente.nombreComercial || 'Cliente'}
              </Link>
            </div>
          )}
          {activity.lead && (
            <div>
              <p className="text-sm text-gray-500">Lead</p>
              <Link href={`/dashboard/leads/${activity.lead.id}`} className="font-medium text-blue-600 hover:underline">
                {activity.lead.name}
              </Link>
            </div>
          )}
        </div>
        
        {activity.descripcion && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-2">Descripción</p>
            <div className="bg-gray-50 p-4 rounded border border-gray-100 text-gray-700 whitespace-pre-wrap">
              {activity.descripcion}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
