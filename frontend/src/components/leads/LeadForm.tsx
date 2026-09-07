'use client';

import { getApiUrl } from '@/lib/api-url';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function LeadForm({
  onClose,
  onSaved,
  initialData,
}: {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: Partial<{
    nombre: string;
    empresa: string;
    email: string;
    telefono: string;
    ciudad: string;
    fuente: string;
    productoInteres: string;
    observaciones: string;
    estado: string;
  }>;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    empresa: initialData?.empresa || '',
    email: initialData?.email || '',
    telefono: initialData?.telefono || '',
    ciudad: initialData?.ciudad || '',
    fuente: initialData?.fuente || 'WHATSAPP_ZERNIO',
    productoInteres: initialData?.productoInteres || '',
    observaciones: initialData?.observaciones || '',
    estado: initialData?.estado || 'NUEVO',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId =
        session?.user?.user_metadata?.tenant_id ||
        localStorage.getItem('tenantId') ||
        '00000000-0000-0000-0000-000000000000';
      const userId =
        session?.user?.id ||
        localStorage.getItem('userId') ||
        '00000000-0000-0000-0000-000000000000';
      const token = session?.access_token || localStorage.getItem('token') || '';

      const apiUrl = getApiUrl();

      // Enviar únicamente campos con valor para evitar fallos de validación
      const payload: Record<string, any> = {
        nombre: formData.nombre.trim() || 'Prospecto sin nombre',
      };

      if (formData.empresa.trim()) payload.empresa = formData.empresa.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.telefono.trim()) payload.telefono = formData.telefono.trim();
      if (formData.ciudad.trim()) payload.ciudad = formData.ciudad.trim();
      if (formData.fuente) payload.fuente = formData.fuente;
      if (formData.productoInteres.trim()) payload.productoInteres = formData.productoInteres.trim();
      if (formData.observaciones.trim()) payload.observaciones = formData.observaciones.trim();
      if (formData.estado) payload.estado = formData.estado;

      const res = await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
        throw new Error(msg || 'Error al crear el lead');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error creating lead:', err);
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur z-10">
          <h2 className="text-xl font-bold text-white">Nuevo Prospecto (Lead)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">
              Nombre Completo <span className="text-blue-400 font-semibold">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="Ej. Carlos Mendoza"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Empresa (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Importadora Sol"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Ciudad (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Santa Cruz"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Teléfono / WhatsApp (Opcional)</label>
              <input
                type="tel"
                placeholder="Ej. +59170012345"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Email (Opcional)</label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Fuente</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.fuente}
                onChange={(e) => setFormData({ ...formData, fuente: e.target.value })}
              >
                <option value="WHATSAPP_ZERNIO">WhatsApp (Zernio)</option>
                <option value="FORMULARIO_WEB">Formulario Web</option>
                <option value="LLAMADA">Llamada Telefónica</option>
                <option value="REFERIDO">Referido</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Estado Inicial</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="NUEVO">Nuevo</option>
                <option value="CONTACTADO">Contactado</option>
                <option value="INTERESADO">Interesado</option>
                <option value="COTIZACION">Cotización</option>
                <option value="NEGOCIACION">Negociación</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">Producto de Interés (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Inversores Híbridos 5kW"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
              value={formData.productoInteres}
              onChange={(e) => setFormData({ ...formData, productoInteres: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">Observaciones (Opcional)</label>
            <textarea
              rows={3}
              placeholder="Detalles sobre la oportunidad, requerimientos especiales o notas..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none text-sm"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>{loading ? 'Guardando...' : 'Guardar Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
