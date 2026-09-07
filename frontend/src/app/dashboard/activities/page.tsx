"use client";

import { apiPath } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';
      
      const res = await fetch(apiPath('/activities'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setActivities(data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Actividades</h1>
        <div className="space-x-2">
          <Link href="/dashboard/activities/calendar" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors">
            Ver Calendario
          </Link>
          <Link href="/dashboard/activities/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block">
            Nueva Actividad
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Cargando...</td></tr>
            ) : activities.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No hay actividades registradas.</td></tr>
            ) : (
              activities.map((act: any) => (
                <tr key={act.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{act.titulo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{act.tipo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(act.fecha).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${act.estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {act.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/activities/${act.id}`} className="text-blue-600 hover:text-blue-900">Ver</Link>
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
