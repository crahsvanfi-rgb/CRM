'use client';

import { apiPath } from '@/lib/api-url';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CampaignDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Estados de Costos
  const [costsData, setCostsData] = useState<any>(null);
  const [calculatingCosts, setCalculatingCosts] = useState(false);

  // Estados para pestaña de configuración
  const [velocityForm, setVelocityForm] = useState({
    limiteMensajesPorHora: 100,
    intervaloEntreEnviosMs: 1000,
    concurrencia: 1,
    maxReintentos: 3
  });
  const [savingVelocity, setSavingVelocity] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchRecipients();
      fetchCosts();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiPath(`/campaigns/${id}`));
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
        setVelocityForm({
          limiteMensajesPorHora: data.limiteMensajesPorHora || 100,
          intervaloEntreEnviosMs: data.intervaloEntreEnviosMs || 1000,
          concurrencia: data.concurrencia || 1,
          maxReintentos: data.maxReintentos || 3
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      const res = await fetch(apiPath(`/campaigns/${id}/recipients`));
      if (res.ok) {
        const data = await res.json();
        setRecipients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (action: 'pause' | 'resume' | 'cancel' | 'approve') => {
    try {
      const res = await fetch(apiPath(`/campaigns/${id}/${action}`), { method: 'POST' });
      if (res.ok) {
        setAlertMsg(`Acción '${action}' ejecutada correctamente.`);
        fetchCampaign();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveVelocity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVelocity(true);
    try {
      const res = await fetch(apiPath(`/campaigns/${id}/velocity`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(velocityForm)
      });
      if (res.ok) {
        setAlertMsg('Parámetros de velocidad actualizados.');
        fetchCampaign();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingVelocity(false);
    }
  };

  const fetchCosts = async () => {
    try {
      const res = await fetch(apiPath(`/campaigns/${id}/costs`));
      if (res.ok) {
        const data = await res.json();
        setCostsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculateCosts = async () => {
    setCalculatingCosts(true);
    try {
      const res = await fetch(apiPath(`/campaigns/${id}/costs/calculate`), { method: 'POST' });
      if (res.ok) {
        setAlertMsg('Costos recalculados y registrados exitosamente.');
        fetchCosts();
        fetchCampaign();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCalculatingCosts(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Cargando detalles de campaña...</div>;
  if (!campaign) return <div className="p-12 text-center text-red-500">Campaña no encontrada.</div>;

  const priorityBadges: any = {
    'ALTA': 'bg-red-100 text-red-800 border-red-200',
    'MEDIA': 'bg-blue-100 text-blue-800 border-blue-200',
    'BAJA': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // Contactos que han interactuado/convertido
  const convertedRecipients = recipients.filter(r => r.respondio || r.clienteVinculadoId || r.leadGeneradoId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Alerta */}
      {alertMsg && (
        <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg flex justify-between items-center text-sm">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg(null)} className="font-bold ml-4">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <button
            onClick={() => router.push('/dashboard/marketing/campaigns/board')}
            className="text-xs text-indigo-600 mb-2 block hover:underline font-semibold"
          >
            &larr; Volver a la Bandeja de Campañas
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.nombre}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border">
              {campaign.estado}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{campaign.descripcion || 'Sin descripción'}</p>
        </div>

        <div className="flex items-center gap-2">
          {!campaign.aprobada && (
            <button
              onClick={() => handleUpdateStatus('approve')}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              ✓ Aprobar Campaña
            </button>
          )}
          {campaign.estado === 'PROGRAMADA' && (
            <button
              onClick={() => handleUpdateStatus('pause')}
              className="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold"
            >
              ⏸ Pausar
            </button>
          )}
          {campaign.estado === 'PAUSADA' && (
            <button
              onClick={() => handleUpdateStatus('resume')}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              ▶ Reanudar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'resumen', label: 'Resumen' },
            { id: 'destinatarios', label: `Destinatarios (${recipients.length})` },
            { id: 'conversiones', label: `Conversiones (${convertedRecipients.length})` },
            { id: 'configuracion', label: 'Configuración y Velocidad' },
            { id: 'costos', label: 'Costos y Presupuesto' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de Tabs */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
        {/* TAB 1: RESUMEN */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="text-xs text-gray-500 font-semibold uppercase">Destinatarios Totales</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{campaign.totalDestinatarios}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="text-xs text-gray-500 font-semibold uppercase">Enviados / Entregados</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{campaign.totalEnviados} / {campaign.totalEntregados}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-4 bg-indigo-50">
                <div className="text-xs text-indigo-700 font-semibold uppercase">Respuestas Recibidas</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{campaign.totalRespuestas}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-4 bg-emerald-50">
                <div className="text-xs text-emerald-700 font-semibold uppercase">Tasa de Respuesta</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {campaign.totalEnviados > 0 ? `${((campaign.totalRespuestas / campaign.totalEnviados) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-green-100 rounded-xl p-4 bg-green-50">
                <div className="text-xs text-green-700 font-semibold uppercase">Leads Nuevos Generados</div>
                <div className="text-2xl font-bold text-green-700 mt-1">{campaign.totalLeads ?? campaign.totalLeadsGenerados ?? 0}</div>
                <div className="text-[11px] text-green-600 mt-1">Contactos convertidos automáticamente a Leads</div>
              </div>
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50">
                <div className="text-xs text-blue-700 font-semibold uppercase">Clientes Vinculados</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{campaign.totalClientesVinculados ?? 0}</div>
                <div className="text-[11px] text-blue-600 mt-1">Clientes existentes reactivados</div>
              </div>
              <div className="border border-purple-100 rounded-xl p-4 bg-purple-50">
                <div className="text-xs text-purple-700 font-semibold uppercase">Actividades de Seguimiento</div>
                <div className="text-2xl font-bold text-purple-700 mt-1">{campaign.totalActividadesGeneradas ?? 0}</div>
                <div className="text-[11px] text-purple-600 mt-1">Tareas registradas en CRM para vendedores</div>
              </div>
            </div>

            {/* Metadatos */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Parámetros de la Campaña</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div><span className="text-gray-400">Canal:</span> <span className="font-semibold">{campaign.canal}</span></div>
                <div><span className="text-gray-400">Objetivo:</span> <span className="font-semibold">{campaign.objetivo}</span></div>
                <div><span className="text-gray-400">Tipo:</span> <span className="font-semibold">{campaign.tipo}</span></div>
                <div><span className="text-gray-400">Disparador:</span> <span className="font-semibold">{campaign.eventoDisparador || 'Ninguno (Manual)'}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DESTINATARIOS */}
        {activeTab === 'destinatarios' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">Lista de Contactos en la Campaña</h3>
              <span className="text-xs text-gray-500">Total: {recipients.length} destinatarios</span>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Contacto</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Teléfono</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase">Prioridad</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Motivo</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase">¿Respondió?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recipients.map((r) => {
                    const name = r.cliente?.nombreComercial || r.cliente?.razonSocial || r.lead?.name || 'Contacto';
                    const tel = r.cliente?.telefono || r.cliente?.whatsapp || r.lead?.phone || 'Sin tel';
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{name}</td>
                        <td className="px-4 py-3 text-gray-600">{tel}</td>
                        <td className="px-4 py-3 text-center">
                          {r.prioridad ? (
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${priorityBadges[r.prioridad] || 'bg-gray-100'}`}>
                              {r.prioridad}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{r.motivo || 'General'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                            {r.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.respondio ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
                              ✓ Sí ({new Date(r.fechaRespuesta).toLocaleDateString()})
                            </span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {recipients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No hay destinatarios vinculados a esta campaña aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CONVERSIONES */}
        {activeTab === 'conversiones' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Leads y Clientes Convertidos</h3>
            <p className="text-xs text-gray-500">Destinatarios que respondieron a la campaña y generaron actividades de seguimiento o nuevos leads.</p>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Contacto</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Tipo de Conversión</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Identificador Creado</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase">Fecha Respuesta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {convertedRecipients.map((r) => {
                    const name = r.cliente?.nombreComercial || r.cliente?.razonSocial || r.lead?.name || 'Contacto';
                    const isCustomer = Boolean(r.clienteVinculadoId || r.clienteId);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{name}</td>
                        <td className="px-4 py-3">
                          {isCustomer ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                              Cliente Vinculado + Actividad
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
                              Lead Creado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                          {r.actividadGeneradaId ? `Actividad: ${r.actividadGeneradaId.slice(0, 8)}...` : r.leadGeneradoId ? `Lead: ${r.leadGeneradoId.slice(0, 8)}...` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {r.fechaRespuesta ? new Date(r.fechaRespuesta).toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {convertedRecipients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        Aún no se registran respuestas ni conversiones para esta campaña.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURACIÓN */}
        {activeTab === 'configuracion' && (
          <div className="space-y-6 max-w-xl">
            <h3 className="text-sm font-bold text-gray-900">Control de Velocidad y Parámetros</h3>
            <form onSubmit={handleSaveVelocity} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Límite de Mensajes por Hora</label>
                <input
                  type="number"
                  value={velocityForm.limiteMensajesPorHora}
                  onChange={(e) => setVelocityForm({ ...velocityForm, limiteMensajesPorHora: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Intervalo Entre Envíos (ms)</label>
                <input
                  type="number"
                  value={velocityForm.intervaloEntreEnviosMs}
                  onChange={(e) => setVelocityForm({ ...velocityForm, intervaloEntreEnviosMs: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Concurrencia</label>
                  <input
                    type="number"
                    value={velocityForm.concurrencia}
                    onChange={(e) => setVelocityForm({ ...velocityForm, concurrencia: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Máx. Reintentos</label>
                  <input
                    type="number"
                    value={velocityForm.maxReintentos}
                    onChange={(e) => setVelocityForm({ ...velocityForm, maxReintentos: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingVelocity}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {savingVelocity ? 'Guardando...' : 'Guardar Parámetros de Velocidad'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: COSTOS Y PRESUPUESTO */}
        {activeTab === 'costos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo Total Acumulado</span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">
                  ${Number(campaign.costoTotal || costsData?.costoTotal || 0).toFixed(4)} <span className="text-sm font-medium text-slate-500">USD</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Envíos computados: <strong>{campaign.totalEnviados || 0}</strong> mensajes
                </div>
              </div>
              <button
                onClick={handleCalculateCosts}
                disabled={calculatingCosts}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {calculatingCosts ? 'Recalculando...' : '💰 Recalcular y Registrar Costos'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-white border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">Historial y Desglose de Costos por Envío</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">Canal</th>
                    <th className="px-6 py-3 text-left">Tarifa Unit. (USD)</th>
                    <th className="px-6 py-3 text-left">Mensajes Computados</th>
                    <th className="px-6 py-3 text-left">Costo Total</th>
                    <th className="px-6 py-3 text-left">Fecha Registro</th>
                    <th className="px-6 py-3 text-left">Moneda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {!costsData?.desglose || costsData.desglose.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No hay registros de costos calculados aún. Haz clic en "Recalcular y Registrar Costos".
                      </td>
                    </tr>
                  ) : (
                    costsData.desglose.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-semibold text-slate-900">{c.canal}</td>
                        <td className="px-6 py-3">${Number(c.costoUnitario).toFixed(4)}</td>
                        <td className="px-6 py-3">{c.cantidadMensajes}</td>
                        <td className="px-6 py-3 font-bold text-emerald-600">${Number(c.costoTotal).toFixed(4)}</td>
                        <td className="px-6 py-3 text-slate-500">{new Date(c.fechaRegistro).toLocaleString()}</td>
                        <td className="px-6 py-3">{c.moneda}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
