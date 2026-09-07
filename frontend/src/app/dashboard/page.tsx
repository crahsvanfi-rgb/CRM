"use client";

import { apiPath } from '@/lib/api-url';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { RefreshCw, Clock, Sparkles, ArrowRight } from 'lucide-react';

const defaultData = {
  ventas: { ventasDelMes: 0, pedidosDelMes: 0, cotizacionesAceptadas: 0, cotizacionesDelMes: 0, tasaConversion: 0, masVendidos: [] },
  clientes: { nuevosDelMes: 0, activos: 0, inactivos: 0 },
  seguimientos: { actividadesPendientes: 0, cotizacionesPendientes: 0, pedidosPendientes: 0 },
  inventario: { agotados: 0, stockBajo: 0, reservadoTotal: 0 },
  importaciones: { activas: 0, enTransito: 0, proximasLlegadas: 0 },
};

const defaultMarketingData = {
  campanasActivas: 0,
  campanasProgramadas: 0,
  mensajesEnviados: 0,
  respuestas: 0,
  leadsGenerados: 0,
  clientesReactivados: 0,
  campanaConMejorRendimiento: null
};

// Intervalo de polling: 30 segundos
const POLLING_INTERVAL_MS = 30000;

export default function DashboardPage() {
  const [data, setData] = useState<any>(defaultData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [marketingData, setMarketingData] = useState<any>(defaultMarketingData);

  // Live status and relative timestamp
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const isTabVisibleRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(Date.now());

  const getHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_token') || '' : '';
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000000' : '00000000-0000-0000-0000-000000000000';
    const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || '' : '';
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'x-tenant-id': tenantId,
      'x-user-id': userId,
      'x-role': 'Admin'
    };
  }, []);

  // Función centralizada para obtener todos los datos del dashboard
  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const headers = getHeaders();

      // Ejecución paralela de resumen operativo, marketing y recomendaciones
      const [summaryRes, marketingRes, recsRes] = await Promise.allSettled([
        fetch(apiPath('/dashboard/summary'), { headers }),
        fetch(apiPath('/dashboard/marketing-summary'), { headers }),
        fetch(apiPath('/recommendations/active'), { headers }),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        const json = await summaryRes.value.json();
        setData(json);
      }

      if (marketingRes.status === 'fulfilled' && marketingRes.value.ok) {
        const json = await marketingRes.value.json();
        setMarketingData(json);
      }

      if (recsRes.status === 'fulfilled' && recsRes.value.ok) {
        const json = await recsRes.value.json();
        setRecommendations(Array.isArray(json) ? json : []);
      }

      const now = new Date();
      setLastUpdated(now);
      setSecondsAgo(0);
      lastFetchTimeRef.current = now.getTime();
    } catch (err) {
      console.error('Error al actualizar datos del dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getHeaders]);

  // Cargar datos al montar y configurar polling inteligente
  useEffect(() => {
    fetchDashboardData(false);

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isTabVisibleRef.current = isVisible;

      if (isVisible) {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch >= POLLING_INTERVAL_MS) {
          fetchDashboardData(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollingTimer = setInterval(() => {
      if (isTabVisibleRef.current && document.visibilityState === 'visible') {
        fetchDashboardData(true);
      }
    }, POLLING_INTERVAL_MS);

    const tickerTimer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollingTimer);
      clearInterval(tickerTimer);
    };
  }, [fetchDashboardData]);

  const updateRecommendationStatus = async (id: string, estado: string) => {
    try {
      const res = await fetch(apiPath(`/recommendations/${id}?estado=${estado}`), {
        method: 'PATCH',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const ventas = data?.ventas || defaultData.ventas;
  const clientes = data?.clientes || defaultData.clientes;
  const inventario = data?.inventario || defaultData.inventario;
  const importaciones = data?.importaciones || defaultData.importaciones;
  const seguimientos = data?.seguimientos || defaultData.seguimientos;

  // Tarjetas adaptadas a estética redondeada iOS (rounded-2xl en móvil / rounded-3xl en desktop)
  const MetricCard = ({ title, value, alertType = 'none' }: { title: string, value: any, alertType?: 'danger' | 'warning' | 'none' }) => {
    let colorClass = "text-slate-900 dark:text-white";
    const num = Number(value) || 0;
    if (alertType === 'danger' && num > 0) colorClass = "text-[#FF3B30] dark:text-[#FF453A]";
    if (alertType === 'warning' && num > 0) colorClass = "text-[#FF9500] dark:text-[#FF9F0A]";
    
    return (
      <div className="bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-200/70 dark:border-white/5 flex flex-col justify-between hover:border-primary/40 transition active:scale-[0.98] duration-150">
        <h3 className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{title}</h3>
        <p className={`text-xl sm:text-2xl font-bold tracking-tight ${colorClass}`}>{value ?? 0}</p>
      </div>
    );
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'CRITICA': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'ALTA': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIA': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const formatRelativeTime = () => {
    if (refreshing) return 'Actualizando...';
    if (!lastUpdated) return 'Cargando...';
    if (secondsAgo < 5) return 'Justo ahora';
    if (secondsAgo < 60) return `hace ${secondsAgo} s`;
    const minutes = Math.floor(secondsAgo / 60);
    return `hace ${minutes} min`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* HEADER CON INDICADOR DE TIEMPO REAL Y REFRESCO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Panel de Control
            </h1>
            {/* Indicador sutil de polling en vivo iOS */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              En vivo
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm">
            Resumen operativo y comercial del mes en curso
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Indicador de última actualización */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1C1C1E] px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/5 shadow-sm">
            <Clock className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#007AFF]' : 'text-slate-400'}`} />
            <span className="font-medium">{formatRelativeTime()}</span>
          </div>

          <button
            onClick={() => fetchDashboardData(false)}
            disabled={loading || refreshing}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 bg-[#007AFF] hover:bg-[#0062CC] active:scale-95 text-white px-4 py-2 rounded-xl sm:rounded-2xl shadow-sm text-xs sm:text-sm font-semibold transition duration-150 disabled:opacity-60"
            title="Refrescar métricas manualmente"
          >
            <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            <span>{loading || refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* MARKETING Y CAMPAÑAS (Sección con auto-refresco) */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-end border-b border-slate-200/60 dark:border-white/5 pb-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Marketing & Campañas</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Rendimiento de difusión masiva, conversiones y reactivación</p>
          </div>
          <Link href="/dashboard/marketing/campaigns/board" className="text-[#007AFF] dark:text-[#0A84FF] text-xs sm:text-sm font-semibold hover:underline inline-flex items-center gap-1 min-h-[44px] items-center">
            Ver campañas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
          <MetricCard title="Campañas Activas" value={marketingData?.campanasActivas} />
          <MetricCard title="Programadas" value={marketingData?.campanasProgramadas} />
          <MetricCard title="Mensajes Enviados" value={marketingData?.mensajesEnviados} />
          <MetricCard title="Respuestas" value={marketingData?.respuestas} />
          <MetricCard title="Leads Gen." value={marketingData?.leadsGenerados} />
          <MetricCard title="Reactivados" value={marketingData?.clientesReactivados} />
        </div>

        {marketingData?.campanaConMejorRendimiento && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#007AFF] text-white">
                  Mejor Rendimiento
                </span>
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {marketingData.campanaConMejorRendimiento.nombre}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({marketingData.campanaConMejorRendimiento.canal})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Tasa de respuesta del <strong className="text-slate-900 dark:text-white">{marketingData.campanaConMejorRendimiento.tasaRespuesta}%</strong> con {marketingData.campanaConMejorRendimiento.totalRespuestas} respuestas y {marketingData.campanaConMejorRendimiento.totalLeadsGenerados} leads generados.
              </p>
            </div>
            <Link
              href={`/dashboard/marketing/campaigns/${marketingData.campanaConMejorRendimiento.id}`}
              className="min-h-[44px] px-4 py-2.5 bg-[#007AFF] hover:bg-[#0062CC] active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition duration-150 whitespace-nowrap inline-flex items-center justify-center"
            >
              Ver Campaña →
            </Link>
          </div>
        )}
      </section>

      {/* RECOMENDACIONES INTELIGENTES */}
      {recommendations.length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Recomendaciones Inteligentes IA</h2>
            </div>
            <span className="bg-[#007AFF] text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold">{recommendations.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recommendations.map(r => (
              <div key={r.id} className="bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/70 dark:border-white/5 flex flex-col justify-between hover:border-primary/40 transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityColor(r.severidad)}`}>
                      {r.severidad}
                    </span>
                    <span className="text-[11px] text-slate-400">{new Date(r.fechaGeneracion || r.fechaCreacion || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{r.titulo}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{r.descripcion}</p>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button onClick={() => updateRecommendationStatus(r.id, 'RESUELTA')} className="min-h-[44px] flex-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold py-2 rounded-xl border border-emerald-500/20 active:scale-95 transition">
                    Resolver
                  </button>
                  <button onClick={() => updateRecommendationStatus(r.id, 'DESCARTADA')} className="min-h-[44px] flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold py-2 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition">
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* VENTAS */}
      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-white/5 pb-2">Ventas y Cotizaciones</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard title="Ventas del Mes" value={`$${Number(ventas.ventasDelMes || 0).toFixed(2)}`} />
          <MetricCard title="Pedidos" value={ventas.pedidosDelMes} />
          <MetricCard title="Coti. Aceptadas" value={ventas.cotizacionesAceptadas} />
          <MetricCard title="Coti. Totales" value={ventas.cotizacionesDelMes} />
          <MetricCard title="Conversión" value={`${Number(ventas.tasaConversion || 0).toFixed(1)}%`} />
        </div>
      </section>

      {/* CLIENTES & SEGUIMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-white/5 pb-2">Clientes</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <MetricCard title="Nuevos" value={clientes.nuevosDelMes} />
            <MetricCard title="Activos" value={clientes.activos} />
            <MetricCard title="Inactivos" value={clientes.inactivos} alertType="warning" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-white/5 pb-2">Seguimientos</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <MetricCard title="Actividades" value={seguimientos.actividadesPendientes} alertType="warning" />
            <MetricCard title="Coti. Pend." value={seguimientos.cotizacionesPendientes} alertType="warning" />
            <MetricCard title="Pedidos Pend." value={seguimientos.pedidosPendientes} alertType="warning" />
          </div>
        </section>
      </div>

      {/* INVENTARIO */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-end border-b border-slate-200/60 dark:border-white/5 pb-2">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Inventario</h2>
          <Link href="/dashboard/inventory" className="text-[#007AFF] dark:text-[#0A84FF] text-xs sm:text-sm font-semibold hover:underline inline-flex items-center gap-1 min-h-[44px] items-center">
            Ver inventario <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="col-span-1 grid grid-cols-2 gap-3 sm:gap-4">
            <MetricCard title="Agotados" value={inventario.agotados} alertType="danger" />
            <MetricCard title="Stock Bajo" value={inventario.stockBajo} alertType="warning" />
            <div className="col-span-2">
              <MetricCard title="Total Reservado" value={inventario.reservadoTotal} />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/70 dark:border-white/5 overflow-x-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Top 5 Productos más Vendidos</h3>
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="text-left py-2 font-semibold text-slate-500 dark:text-slate-400">Producto</th>
                  <th className="text-right py-2 font-semibold text-slate-500 dark:text-slate-400">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {ventas.masVendidos && ventas.masVendidos.length > 0 ? (
                  ventas.masVendidos.map((prod: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{prod.nombre}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{prod.cantidad}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={2} className="py-6 text-center text-slate-400">No hay ventas registradas este mes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* IMPORTACIONES */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-end border-b border-slate-200/60 dark:border-white/5 pb-2">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Logística / Importaciones</h2>
          <Link href="/dashboard/importations" className="text-[#007AFF] dark:text-[#0A84FF] text-xs sm:text-sm font-semibold hover:underline inline-flex items-center gap-1 min-h-[44px] items-center">
            Ver importaciones <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <MetricCard title="Activas" value={importaciones.activas} />
          <MetricCard title="En Tránsito" value={importaciones.enTransito} />
          <MetricCard title="Próximas" value={importaciones.proximasLlegadas} alertType="warning" />
        </div>
      </section>
    </div>
  );
}
