'use client';

import { getApiUrl } from '@/lib/api-url';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function CustomerForm({
  onClose,
  onSaved,
  initialData,
}: {
  onClose: () => void;
  onSaved: () => void;
  initialData?: any;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombreComercial: initialData?.nombreComercial || '',
    razonSocial: initialData?.razonSocial || '',
    nitCi: initialData?.nitCi || '',
    personaContacto: initialData?.personaContacto || '',
    email: initialData?.email || '',
    telefono: initialData?.telefono || '',
    direccion: initialData?.direccion || '',
    ciudad: initialData?.ciudad || '',
    departamento: initialData?.departamento || '',
    tipoCliente: initialData?.tipoCliente || 'NUEVO',
    estado: initialData?.estado || 'ACTIVO',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
      const isEditing = !!initialData;
      const url = isEditing ? `${apiUrl}/customers/${initialData.id}` : `${apiUrl}/customers`;

      // Enviar únicamente campos con valor real para evitar errores de validación
      const payload: Record<string, any> = {
        nombreComercial: formData.nombreComercial.trim() || 'Cliente Sin Nombre',
      };

      if (formData.razonSocial.trim()) payload.razonSocial = formData.razonSocial.trim();
      if (formData.nitCi.trim()) payload.nitCi = formData.nitCi.trim();
      if (formData.personaContacto.trim()) payload.personaContacto = formData.personaContacto.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.telefono.trim()) payload.telefono = formData.telefono.trim();
      if (formData.direccion.trim()) payload.direccion = formData.direccion.trim();
      if (formData.ciudad.trim()) payload.ciudad = formData.ciudad.trim();
      if (formData.departamento.trim()) payload.departamento = formData.departamento.trim();
      if (formData.tipoCliente) payload.tipoCliente = formData.tipoCliente;
      if (formData.estado) payload.estado = formData.estado;

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
        throw new Error(msg || 'Error al guardar el cliente');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving customer:', err);
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur z-10">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">
                Nombre Comercial <span className="text-blue-400 font-semibold">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Ej. Comercial Los Andes"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.nombreComercial}
                onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Razón Social (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Los Andes S.R.L."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">NIT / CI (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. 1029384756"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.nitCi}
                onChange={(e) => setFormData({ ...formData, nitCi: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Persona de Contacto (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.personaContacto}
                onChange={(e) => setFormData({ ...formData, personaContacto: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Email (Opcional)</label>
              <input
                type="email"
                placeholder="contacto@losandes.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Teléfono (Opcional)</label>
              <input
                type="tel"
                placeholder="Ej. +59170011223"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Departamento / Estado (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Santa Cruz"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.departamento}
                onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Tipo de Cliente</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.tipoCliente}
                onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })}
              >
                <option value="NUEVO">NUEVO</option>
                <option value="MAYORISTA">MAYORISTA</option>
                <option value="MINORISTA">MINORISTA</option>
                <option value="DISTRIBUIDOR">DISTRIBUIDOR</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Estado</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-500/20 transition-all"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>{loading ? 'Guardando...' : 'Guardar Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
