'use client';

import { apiPath } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';

export default function OptOutListPage() {
  const [optOuts, setOptOuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    tipoContacto: 'CUSTOMER',
    contactoId: '',
    telefono: '',
    motivo: 'Solicitado por el cliente'
  });

  useEffect(() => {
    fetchOptOuts();
  }, []);

  const fetchOptOuts = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiPath('/opt-out'), {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOptOuts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching opt-outs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactoId && !form.telefono) {
      setFeedback({ type: 'error', message: 'Debe ingresar al menos un ID de contacto o un número de teléfono.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(apiPath('/opt-out'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setShowModal(false);
        setForm({
          tipoContacto: 'CUSTOMER',
          contactoId: '',
          telefono: '',
          motivo: 'Solicitado por el cliente'
        });
        setFeedback({ type: 'success', message: 'Contacto agregado exitosamente a la lista de exclusión y su consentimiento fue revocado.' });
        fetchOptOuts();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.message || 'Error al agregar a lista de exclusión.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (contactoId: string) => {
    if (!confirm('¿Está seguro de remover este contacto de la lista de exclusión? Podrá volver a recibir campañas.')) {
      return;
    }

    try {
      const res = await fetch(apiPath(`/opt-out/${encodeURIComponent(contactoId)}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
        }
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Contacto removido de la lista de exclusión.' });
        fetchOptOuts();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.message || 'Error al remover de la lista.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión.' });
    }
  };

  const filteredOptOuts = optOuts.filter((item) => {
    const term = search.toLowerCase();
    return (
      (item.contactoId && item.contactoId.toLowerCase().includes(term)) ||
      (item.telefono && item.telefono.toLowerCase().includes(term)) ||
      (item.motivo && item.motivo.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lista de Exclusión ("No Contactar" / Opt-Out)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Contactos bloqueados de cualquier campaña masiva por solicitud expresa o revocación de consentimiento.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <span>+ Agregar a Exclusión</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-lg text-sm border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Filter and Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <input
          type="text"
          placeholder="Buscar por ID de contacto, teléfono o motivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <span className="text-xs font-semibold text-slate-500">
          Total excluidos: <strong className="text-slate-800">{filteredOptOuts.length}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Contacto / Teléfono</th>
                <th className="px-6 py-3 text-left">Motivo de Exclusión</th>
                <th className="px-6 py-3 text-left">Fecha Registro</th>
                <th className="px-6 py-3 text-left">Registrado Por</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Cargando lista de exclusión...
                  </td>
                </tr>
              ) : filteredOptOuts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No hay contactos en la lista de exclusión.
                  </td>
                </tr>
              ) : (
                filteredOptOuts.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        row.tipoContacto === 'CUSTOMER' 
                          ? 'bg-blue-100 text-blue-800' 
                          : row.tipoContacto === 'LEAD' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.tipoContacto}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs text-slate-900">{row.contactoId || 'Sin ID'}</div>
                      {row.telefono && (
                        <div className="text-xs text-slate-500">{row.telefono}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{row.motivo || 'Sin motivo'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(row.fechaRegistro).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {row.usuario?.name || 'Sistema'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <button
                        onClick={() => handleRemove(row.contactoId || row.telefono || row.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium transition-colors"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar a Exclusión */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Agregar Contacto a Exclusión</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOptOut} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Contacto
                </label>
                <select
                  value={form.tipoContacto}
                  onChange={(e) => setForm({ ...form, tipoContacto: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="CUSTOMER">Cliente (Customer)</option>
                  <option value="LEAD">Lead</option>
                  <option value="EXTERNO">Externo / Teléfono</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID del Contacto (Opcional si tiene teléfono)
                </label>
                <input
                  type="text"
                  value={form.contactoId}
                  onChange={(e) => setForm({ ...form, contactoId: e.target.value })}
                  placeholder="UUID o identificador del cliente / lead"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+591 70000000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo de Exclusión
                </label>
                <textarea
                  rows={2}
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej: Solicitó baja vía WhatsApp, no desea recibir promociones..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Exclusión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
