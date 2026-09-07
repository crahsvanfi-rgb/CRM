'use client';

import { apiPath } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    canal: 'WHATSAPP',
    objetivo: 'VENTAS',
    responsableId: '',
    fechaProgramada: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(apiPath('/users?limit=100'));
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setUsers(list);
        if (list.length > 0) {
          setForm(prev => ({ ...prev, responsableId: list[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath('/campaigns'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear campaña');
      router.push(`/dashboard/marketing/campaigns/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/marketing/campaigns/board" className="text-xs text-indigo-600 hover:underline font-semibold">
          &larr; Volver a la Bandeja
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nueva Campaña</h1>
        <p className="text-xs text-gray-500">Crea una campaña de marketing manual y asigna sus destinatarios y plantillas.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Campaña *</label>
          <input
            type="text"
            required
            placeholder="Ej: Promoción Fiestas Patrias"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
          <textarea
            rows={2}
            placeholder="Detalles u objetivo de la campaña..."
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Canal *</label>
            <select
              value={form.canal}
              onChange={(e) => setForm({ ...form, canal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Objetivo *</label>
            <select
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="VENTAS">Ventas</option>
              <option value="RETENCION">Retención</option>
              <option value="INFORMATIVO">Informativo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Responsable Comercial *</label>
          <select
            required
            value={form.responsableId}
            onChange={(e) => setForm({ ...form, responsableId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.nombre || u.email}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Link
            href="/dashboard/marketing/campaigns/board"
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !form.responsableId}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Campaña'}
          </button>
        </div>
      </form>
    </div>
  );
}
