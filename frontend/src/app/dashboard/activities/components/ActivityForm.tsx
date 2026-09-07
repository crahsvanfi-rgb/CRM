"use client";

import { getApiUrl } from '@/lib/api-url';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ActivityForm({ initialData, activityId }: any) {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    titulo: initialData?.titulo || '',
    tipo: initialData?.tipo || 'REUNION',
    fecha: initialData?.fecha ? new Date(initialData.fecha).toISOString().split('T')[0] : '',
    hora: initialData?.hora || '',
    descripcion: initialData?.descripcion || '',
    responsableId: initialData?.responsableId || '',
    clienteId: initialData?.clienteId || '',
    leadId: initialData?.leadId || '',
    notificar: initialData?.notificar || false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiUrl = getApiUrl();

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || localStorage.getItem('token') || '';
    const tenantId = session?.user?.user_metadata?.tenant_id || localStorage.getItem('tenantId') || '00000000-0000-0000-0000-000000000000';
    const userId = session?.user?.id || localStorage.getItem('userId') || '00000000-0000-0000-0000-000000000000';

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'x-user-id': userId,
    };
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await getHeaders();
      const url = activityId ? `${apiUrl}/activities/${activityId}` : `${apiUrl}/activities`;
      const method = activityId ? 'PATCH' : 'POST';

      const payload: any = {
        titulo: formData.titulo.trim(),
        tipo: formData.tipo,
      };

      if (formData.descripcion?.trim()) payload.descripcion = formData.descripcion.trim();
      if (formData.fecha) payload.fecha = new Date(formData.fecha).toISOString();
      if (formData.hora?.trim()) payload.hora = formData.hora.trim();
      if (formData.responsableId?.trim()) payload.responsableId = formData.responsableId.trim();
      if (formData.clienteId?.trim()) payload.clienteId = formData.clienteId.trim();
      if (formData.leadId?.trim()) payload.leadId = formData.leadId.trim();
      if (formData.notificar) payload.notificar = true;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar la actividad');
      }

      setSuccess('Actividad guardada correctamente.');
      setTimeout(() => {
        router.push('/dashboard/activities');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Título *
          </label>
          <input
            type="text"
            name="titulo"
            required
            placeholder="Ej. Reunión de presentación, Llamada de seguimiento"
            value={formData.titulo}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Tipo *
          </label>
          <select
            name="tipo"
            required
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          >
            <option value="REUNION">Reunión</option>
            <option value="LLAMADA">Llamada</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="SEGUIMIENTO">Seguimiento</option>
            <option value="TAREA">Tarea</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Fecha (Opcional - por defecto Hoy)
          </label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Hora (Opcional)
          </label>
          <input
            type="time"
            name="hora"
            value={formData.hora}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            ID Responsable (Opcional)
          </label>
          <input
            type="text"
            name="responsableId"
            placeholder="Asignado automáticamente si está vacío"
            value={formData.responsableId}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Descripción / Notas (Opcional)
          </label>
          <textarea
            name="descripcion"
            rows={3}
            placeholder="Detalles sobre los puntos a tratar..."
            value={formData.descripcion}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="notificar"
            name="notificar"
            checked={formData.notificar}
            onChange={handleChange}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
          />
          <label htmlFor="notificar" className="text-sm text-slate-700 dark:text-slate-300 select-none">
            Enviar recordatorio o notificación
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-sm disabled:opacity-50 transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Actividad'
          )}
        </button>
      </div>
    </form>
  );
}
