'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CampaignsBoardPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Filtros
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [canalFilter, setCanalFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modales
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [selectedCampaignForSim, setSelectedCampaignForSim] = useState<any>(null);

  // Form states
  const [recoverForm, setRecoverForm] = useState({ nombre: '', diasInactivo: 90, canal: 'WHATSAPP', priorizarConIA: true });
  const [productForm, setProductForm] = useState({ nombre: '', productoId: '', canal: 'WHATSAPP' });
  const [vendorForm, setVendorForm] = useState({ nombre: '', vendedorId: '', canal: 'WHATSAPP' });
  const [simulateForm, setSimulateForm] = useState({ recipientId: '', mensaje: 'Hola, me interesa la cotización del producto.' });

  // Listas para selects
  const [productsList, setProductsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [recipientsList, setRecipientsList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, [page, estadoFilter, tipoFilter, canalFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (estadoFilter) params.append('estado', estadoFilter);
      if (tipoFilter) params.append('tipo', tipoFilter);
      if (canalFilter) params.append('canal', canalFilter);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`/api/campaigns/board?${params.toString()}`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.data || []);
        if (json.meta) setMeta(json.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCampaigns();
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProductsList(Array.isArray(data) ? data : data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=100');
      if (res.ok) {
        const data = await res.json();
        setUsersList(Array.isArray(data) ? data : data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openRecoverModal = () => {
    setRecoverForm({ nombre: '', diasInactivo: 90, canal: 'WHATSAPP', priorizarConIA: true });
    setShowRecoverModal(true);
  };

  const openProductModal = () => {
    loadProducts();
    setProductForm({ nombre: '', productoId: '', canal: 'WHATSAPP' });
    setShowProductModal(true);
  };

  const openVendorModal = () => {
    loadUsers();
    setVendorForm({ nombre: '', vendedorId: '', canal: 'WHATSAPP' });
    setShowVendorModal(true);
  };

  const openSimulateModal = async (campaign: any) => {
    setSelectedCampaignForSim(campaign);
    setSimulateForm({ recipientId: '', mensaje: 'Hola, me interesa más información sobre las ofertas.' });
    setShowSimulateModal(true);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/recipients`);
      if (res.ok) {
        const data = await res.json();
        setRecipientsList(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSimulateForm(prev => ({ ...prev, recipientId: data[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns/auto/recover-inactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recoverForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear campaña');
      setShowRecoverModal(false);
      setAlertMsg({ text: `Campaña creada con éxito. Destinatarios identificados: ${data.totalDestinatarios}`, type: 'success' });
      fetchCampaigns();
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns/auto/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear campaña');
      setShowProductModal(false);
      setAlertMsg({ text: `Campaña por producto creada. Destinatarios: ${data.totalDestinatarios}`, type: 'success' });
      fetchCampaigns();
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/campaigns/auto/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear campaña');
      setShowVendorModal(false);
      setAlertMsg({ text: `Campaña de vendedor creada. Destinatarios: ${data.totalDestinatarios}`, type: 'success' });
      fetchCampaigns();
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignForSim) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignForSim.id}/process-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al procesar respuesta');
      setShowSimulateModal(false);
      setAlertMsg({
        text: `Respuesta procesada correctamente (${data.resultType}).`,
        type: 'success'
      });
      fetchCampaigns();
    } catch (err: any) {
      setAlertMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs agregados
  const totalDestinatarios = campaigns.reduce((sum, c) => sum + (c.totalDestinatarios || 0), 0);
  const totalRespuestas = campaigns.reduce((sum, c) => sum + (c.totalRespuestas || 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.totalLeads || c.totalLeadsGenerados || 0), 0);
  const totalClientes = campaigns.reduce((sum, c) => sum + (c.totalClientesVinculados || 0), 0);

  const statusColors: any = {
    'BORRADOR': 'bg-gray-100 text-gray-800 border-gray-300',
    'PROGRAMADA': 'bg-blue-100 text-blue-800 border-blue-300',
    'ENVIANDO': 'bg-yellow-100 text-yellow-800 border-yellow-300 animate-pulse',
    'PAUSADA': 'bg-orange-100 text-orange-800 border-orange-300',
    'COMPLETADA': 'bg-green-100 text-green-800 border-green-300',
    'CANCELADA': 'bg-red-100 text-red-800 border-red-300',
  };

  const typeLabels: any = {
    'MANUAL': { label: 'Manual', color: 'bg-gray-50 text-gray-700' },
    'AUTOMATICA_RECUPERACION': { label: 'Recuperación IA', color: 'bg-purple-100 text-purple-800' },
    'AUTOMATICA_PRODUCTO': { label: 'Por Producto', color: 'bg-indigo-100 text-indigo-800' },
    'AUTOMATICA_VENDEDOR': { label: 'Por Vendedor', color: 'bg-emerald-100 text-emerald-800' },
    'EVENTO': { label: 'Evento', color: 'bg-amber-100 text-amber-800' },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Alerta de notificación */}
      {alertMsg && (
        <div className={`p-4 rounded-md flex justify-between items-center ${alertMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="font-bold ml-4 text-sm">&times;</button>
        </div>
      )}

      {/* Header y Acciones */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bandeja de Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión integral de campañas automáticas y manuales con seguimiento de conversión.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openRecoverModal}
            className="px-3.5 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>⚡</span> Recuperar Inactivos (IA)
          </button>
          <button
            onClick={openProductModal}
            className="px-3.5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>📦</span> Campaña Producto
          </button>
          <button
            onClick={openVendorModal}
            className="px-3.5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>👤</span> Campaña Vendedor
          </button>
          <Link
            href="/dashboard/marketing/campaigns/create"
            className="px-3.5 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-900 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>➕</span> Nueva Campaña
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Destinatarios Totales</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalDestinatarios.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Respuestas Totales</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{totalRespuestas.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Leads Generados</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{totalLeads.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clientes Vinculados</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totalClientes.toLocaleString()}</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
          <input
            type="text"
            placeholder="Buscar por nombre de campaña..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700"
          >
            <option value="">Todos los Estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="ENVIANDO">Enviando</option>
            <option value="PAUSADA">Pausada</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700"
          >
            <option value="">Todos los Tipos</option>
            <option value="MANUAL">Manual</option>
            <option value="AUTOMATICA_RECUPERACION">Recuperación IA</option>
            <option value="AUTOMATICA_PRODUCTO">Por Producto</option>
            <option value="AUTOMATICA_VENDEDOR">Por Vendedor</option>
            <option value="EVENTO">Evento</option>
          </select>

          <select
            value={canalFilter}
            onChange={(e) => { setCanalFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700"
          >
            <option value="">Todos los Canales</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>

          {(search || estadoFilter || tipoFilter || canalFilter) && (
            <button
              onClick={() => { setSearch(''); setEstadoFilter(''); setTipoFilter(''); setCanalFilter(''); setPage(1); }}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando campañas y métricas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaña y Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatarios</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Respuestas</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversión</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const typeInfo = typeLabels[c.tipo] || { label: c.tipo, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{c.nombre}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                          <span className="font-medium text-gray-600">{c.canal}</span>
                          <span>•</span>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          {c.responsable && (
                            <>
                              <span>•</span>
                              <span>Resp: {c.responsable.name}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${statusColors[c.estado] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-semibold text-gray-900">{c.totalDestinatarios}</div>
                        <div className="text-xs text-gray-500">Env: {c.totalEnviados} | Ent: {c.totalEntregados}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-semibold text-indigo-600">{c.totalRespuestas}</div>
                        <div className="text-xs text-gray-500">
                          {c.totalEnviados > 0 ? `${((c.totalRespuestas / c.totalEnviados) * 100).toFixed(1)}% tasa` : '0%'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-semibold text-green-700">Leads: {c.totalLeads ?? c.totalLeadsGenerados ?? 0}</div>
                        <div className="text-xs font-semibold text-blue-700">Clientes: {c.totalClientesVinculados ?? 0}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        <div className="flex justify-center items-center gap-2">
                          <Link
                            href={`/dashboard/marketing/campaigns/${c.id}`}
                            className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-semibold transition"
                          >
                            Detalle
                          </Link>
                          <button
                            onClick={() => openSimulateModal(c)}
                            title="Procesar respuesta de un destinatario"
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition"
                          >
                            💬 Respuesta
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron campañas con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Mostrando página {meta.page} de {meta.totalPages || 1} ({meta.total} campañas en total)
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-gray-200 rounded disabled:opacity-50 hover:bg-gray-50 font-medium"
            >
              Anterior
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-white border border-gray-200 rounded disabled:opacity-50 hover:bg-gray-50 font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Recuperar Clientes Inactivos */}
      {showRecoverModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>⚡</span> Recuperar Clientes Inactivos
            </h3>
            <p className="text-xs text-gray-500">Identifica clientes cuya última compra supere el umbral y genera un segmento y campaña de reactivación.</p>
            <form onSubmit={handleCreateRecover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Campaña (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Reactivación Primavera"
                  value={recoverForm.nombre}
                  onChange={(e) => setRecoverForm({ ...recoverForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Días Inactivo</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={recoverForm.diasInactivo}
                    onChange={(e) => setRecoverForm({ ...recoverForm, diasInactivo: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Canal</label>
                  <select
                    value={recoverForm.canal}
                    onChange={(e) => setRecoverForm({ ...recoverForm, canal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <input
                  type="checkbox"
                  id="priorizarConIA"
                  checked={recoverForm.priorizarConIA}
                  onChange={(e) => setRecoverForm({ ...recoverForm, priorizarConIA: e.target.checked })}
                  className="h-4 w-4 text-purple-600 rounded"
                />
                <label htmlFor="priorizarConIA" className="text-xs text-purple-900 font-medium">
                  Priorizar destinatarios con IA (ALTA/MEDIA/BAJA según valor de compra y frecuencia)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecoverModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Crear Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Campaña por Producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>📦</span> Campaña por Producto
            </h3>
            <p className="text-xs text-gray-500">Segmenta automáticamente a todos los clientes que compraron un producto específico en pedidos entregados.</p>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Seleccionar Producto *</label>
                <select
                  required
                  value={productForm.productoId}
                  onChange={(e) => setProductForm({ ...productForm, productoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">-- Seleccionar producto --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.sku || 'Sin SKU'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de Campaña (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Novedad Reposición Stock"
                  value={productForm.nombre}
                  onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Canal</label>
                <select
                  value={productForm.canal}
                  onChange={(e) => setProductForm({ ...productForm, canal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !productForm.productoId}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Crear Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Campaña por Vendedor */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>👤</span> Campaña por Cartera de Vendedor
            </h3>
            <p className="text-xs text-gray-500">Crea una campaña automática dirigida exclusivamente a los clientes asignados a un vendedor.</p>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Seleccionar Vendedor *</label>
                <select
                  required
                  value={vendorForm.vendedorId}
                  onChange={(e) => setVendorForm({ ...vendorForm, vendedorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">-- Seleccionar vendedor --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.nombre || u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de Campaña (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Seguimiento Mensual Cartera"
                  value={vendorForm.nombre}
                  onChange={(e) => setVendorForm({ ...vendorForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Canal</label>
                <select
                  value={vendorForm.canal}
                  onChange={(e) => setVendorForm({ ...vendorForm, canal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !vendorForm.vendedorId}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Crear Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Simular / Procesar Respuesta */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>💬</span> Simular Respuesta en Campaña
            </h3>
            <p className="text-xs text-gray-500">
              Prueba la conversión inmediata: si el contacto es Cliente existente se creará una Actividad, o si no lo es, se convertirá automáticamente a Lead.
            </p>
            <form onSubmit={handleProcessResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Destinatario que responde *</label>
                <select
                  required
                  value={simulateForm.recipientId}
                  onChange={(e) => setSimulateForm({ ...simulateForm, recipientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">-- Seleccionar destinatario --</option>
                  {recipientsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.cliente?.nombreComercial || r.cliente?.razonSocial || r.lead?.name || 'Destinatario'} ({r.cliente?.telefono || r.lead?.phone || 'Sin tel'})
                    </option>
                  ))}
                </select>
                {recipientsList.length === 0 && (
                  <div className="text-[11px] text-amber-600 mt-1">Esta campaña aún no tiene destinatarios cargados.</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mensaje de Respuesta del Contacto</label>
                <textarea
                  rows={3}
                  required
                  value={simulateForm.mensaje}
                  onChange={(e) => setSimulateForm({ ...simulateForm, mensaje: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !simulateForm.recipientId}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Procesar Respuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
