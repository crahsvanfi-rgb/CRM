"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [marketingData, setMarketingData] = useState<any>(null);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  const getHeaders = (isJson = false) => {
    const rawToken = localStorage.getItem('supabase_token') || localStorage.getItem('token') || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken : (rawToken ? `Bearer ${rawToken}` : '');
    const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('tenantId') || '12345678-1234-1234-1234-123456789012';
    const userId = localStorage.getItem('user_id') || localStorage.getItem('userId') || '';
    const role = localStorage.getItem('userRole') || 'Admin';

    const h: Record<string, string> = {
      'x-tenant-id': tenantId,
      'x-user-id': userId,
      'x-role': role,
    };
    if (token) h['Authorization'] = token;
    if (isJson) h['Content-Type'] = 'application/json';
    return h;
  };

  const fetchMarketingSummary = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/dashboard/marketing-summary`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setMarketingData(json);
      }
    } catch (err) {
      console.error('Error fetching marketing summary:', err);
    }
  }, [apiUrl]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/dashboard/summary`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch(`${apiUrl}/recommendations/active`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setRecommendations(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }, [apiUrl]);

  const updateRecommendationStatus = async (id: string, estado: string) => {
    try {
      const res = await fetch(`${apiUrl}/recommendations/${id}?estado=${estado}`, {
        method: 'PATCH',
        headers: getHeaders(true)
      });
      if (res.ok) {
        fetchRecommendations();
      }
    } catch (err) {
      console.error('Error updating recommendation status:', err);
    }
  };

  const [diagResult, setDiagResult] = useState<any>(null);
  const [testingHealth, setTestingHealth] = useState(false);

  const runHealthTest = async () => {
    setTestingHealth(true);
    setDiagResult(null);
    try {
      const res = await fetch(`${apiUrl}/health`);
      const body = await res.json();
      setDiagResult({ ok: res.ok, status: res.status, body });
      console.log('BACKEND OK', body);
    } catch (err: any) {
      console.error('ERROR FETCH', err);
      setDiagResult({ ok: false, error: err.message || 'Failed to fetch' });
    } finally {
      setTestingHealth(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchRecommendations();
    fetchMarketingSummary();
  }, [fetchSummary, fetchRecommendations, fetchMarketingSummary]);

  if (loading) {
    return <div className="p-6 text-gray-500">Cargando métricas del dashboard...</div>;
  }

  if (!data) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-red-700 mb-2">No se pudo conectar con el Backend CRM</h2>
          <p className="text-gray-600 text-sm mb-4">
            El frontend no recibió respuesta de la API. Verifica la variable en Vercel o prueba el health check:
          </p>
          <div className="bg-white p-3 rounded border text-xs font-mono space-y-1 mb-4 text-gray-700">
            <div><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || '(NO DEFINIDA - usa default localhost)'}</div>
            <div><strong>URL Destino:</strong> {apiUrl}/health</div>
          </div>
          <button
            onClick={runHealthTest}
            disabled={testingHealth}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {testingHealth ? 'Probando...' : '🔍 Probar Conexión Backend (/health)'}
          </button>
          {diagResult && (
            <div className={`mt-4 p-3 rounded text-xs font-mono ${diagResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <pre>{JSON.stringify(diagResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { ventas, clientes, inventario, importaciones, seguimientos } = data;

  const MetricCard = ({ title, value, alertType = 'none' }: { title: string, value: any, alertType?: 'danger' | 'warning' | 'none' }) => {
    let colorClass = "text-gray-800";
    if (alertType === 'danger' && value > 0) colorClass = "text-red-600";
    if (alertType === 'warning' && value > 0) colorClass = "text-yellow-600";
    
    return (
      <div className="bg-white p-4 rounded shadow border border-gray-100 flex flex-col justify-between">
        <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase">{title}</h3>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
    );
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'CRITICA': return 'bg-red-100 text-red-800 border-red-200';
      case 'ALTA': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
          <p className="text-gray-500">Resumen operativo del mes en curso.</p>
        </div>
        <button onClick={() => { fetchSummary(); fetchRecommendations(); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm">
          Actualizar Métricas
        </button>
      </div>

      {/* RECOMENDACIONES INTELIGENTES */}
      {recommendations.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <h2 className="text-xl font-bold text-gray-700">Recomendaciones Inteligentes</h2>
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{recommendations.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(r => (
              <div key={r.id} className="bg-white p-4 rounded shadow border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded border ${getSeverityColor(r.severidad)}`}>
                      {r.severidad}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(r.fechaGeneracion).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{r.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-4">{r.descripcion}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateRecommendationStatus(r.id, 'RESUELTA')} className="flex-1 bg-green-50 text-green-700 text-xs font-medium py-1.5 rounded border border-green-200 hover:bg-green-100">
                    Resolver
                  </button>
                  <button onClick={() => updateRecommendationStatus(r.id, 'DESCARTADA')} className="flex-1 bg-gray-50 text-gray-700 text-xs font-medium py-1.5 rounded border border-gray-200 hover:bg-gray-100">
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* VENTAS */}
      <section>
        <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Ventas y Cotizaciones</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard title="Ventas del Mes" value={`$${Number(ventas.ventasDelMes).toFixed(2)}`} />
          <MetricCard title="Pedidos" value={ventas.pedidosDelMes} />
          <MetricCard title="Coti. Aceptadas" value={ventas.cotizacionesAceptadas} />
          <MetricCard title="Coti. Totales" value={ventas.cotizacionesDelMes} />
          <MetricCard title="Conversión" value={`${ventas.tasaConversion.toFixed(1)}%`} />
        </div>
      </section>

      {/* CLIENTES & SEGUIMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Clientes</h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard title="Nuevos" value={clientes.nuevosDelMes} />
            <MetricCard title="Activos" value={clientes.activos} />
            <MetricCard title="Inactivos" value={clientes.inactivos} alertType="warning" />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Seguimientos</h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard title="Actividades Pend." value={seguimientos.actividadesPendientes} alertType="warning" />
            <MetricCard title="Coti. Pendientes" value={seguimientos.cotizacionesPendientes} alertType="warning" />
            <MetricCard title="Pedidos Pend." value={seguimientos.pedidosPendientes} alertType="warning" />
          </div>
        </section>
      </div>

      {/* INVENTARIO */}
      <section>
        <div className="flex justify-between items-end mb-4 border-b pb-2">
          <h2 className="text-xl font-bold text-gray-700">Inventario</h2>
          <Link href="/dashboard/inventory" className="text-blue-600 text-sm hover:underline">Ver inventario completo →</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 grid grid-cols-2 gap-4">
            <MetricCard title="Agotados" value={inventario.agotados} alertType="danger" />
            <MetricCard title="Stock Bajo" value={inventario.stockBajo} alertType="warning" />
            <div className="col-span-2">
              <MetricCard title="Total Reservado" value={inventario.reservadoTotal} />
            </div>
          </div>
          <div className="col-span-2 bg-white p-4 rounded shadow border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase">Top 5 Productos más Vendidos</h3>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Producto</th>
                  <th className="text-right py-2 font-medium text-gray-600">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {ventas.masVendidos.length > 0 ? (
                  ventas.masVendidos.map((prod: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 text-gray-800">{prod.nombre}</td>
                      <td className="py-2 text-right text-gray-800 font-semibold">{prod.cantidad}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={2} className="py-4 text-center text-gray-500">No hay ventas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* IMPORTACIONES */}
      <section>
        <div className="flex justify-between items-end mb-4 border-b pb-2">
          <h2 className="text-xl font-bold text-gray-700">Logística / Importaciones</h2>
          <Link href="/dashboard/importations" className="text-blue-600 text-sm hover:underline">Ver importaciones →</Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Activas" value={importaciones.activas} />
          <MetricCard title="En Tránsito" value={importaciones.enTransito} />
          <MetricCard title="Próximas Llegadas" value={importaciones.proximasLlegadas} alertType="warning" />
        </div>
      </section>

      {/* MARKETING Y CAMPAÑAS */}
      <section>
        <div className="flex justify-between items-end mb-4 border-b pb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-700">Marketing & Campañas</h2>
            <p className="text-xs text-gray-500">Rendimiento de difusión, conversiones y reactivación</p>
          </div>
          <Link href="/dashboard/marketing/campaigns/board" className="text-blue-600 text-sm hover:underline">
            Ver bandeja de campañas →
          </Link>
        </div>
        {marketingData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <MetricCard title="Activas" value={marketingData.campanasActivas} />
              <MetricCard title="Programadas" value={marketingData.campanasProgramadas} />
              <MetricCard title="Enviados" value={marketingData.mensajesEnviados} />
              <MetricCard title="Respuestas" value={marketingData.respuestas} />
              <MetricCard title="Leads Gen." value={marketingData.leadsGenerados} />
              <MetricCard title="Reactivados" value={marketingData.clientesReactivados} />
            </div>

            {marketingData.campanaConMejorRendimiento && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">
                      Mejor Rendimiento
                    </span>
                    <span className="font-bold text-gray-800 text-base">
                      {marketingData.campanaConMejorRendimiento.nombre}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({marketingData.campanaConMejorRendimiento.canal})
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Tasa de respuesta del <strong>{marketingData.campanaConMejorRendimiento.tasaRespuesta}%</strong> con {marketingData.campanaConMejorRendimiento.totalRespuestas} respuestas y {marketingData.campanaConMejorRendimiento.totalLeadsGenerados} leads generados.
                  </p>
                </div>
                <Link
                  href={`/dashboard/marketing/campaigns/${marketingData.campanaConMejorRendimiento.id}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm transition-colors whitespace-nowrap"
                >
                  Ver Campaña →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-white rounded border border-gray-100 text-gray-400 text-sm">
            Cargando métricas de marketing...
          </div>
        )}
      </section>

    </div>
  );
}
