'use client';

import React, { useState, useEffect } from 'react';

export default function CampaignConfigPage() {
  const [config, setConfig] = useState<any>({
    campanasActivas: true,
    aprobacionObligatoria: true,
    limiteMensajesPorDia: 1000,
    limiteMensajesPorHora: 100,
    horarioPermitidoInicio: '09:00',
    horarioPermitidoFin: '19:00',
    costoPorMensajeWhatsapp: 0.05,
    costoPorMensajeSms: 0.02,
    mensajePredeterminado: '',
    firma: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/campaign-config', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/campaign-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
        },
        body: JSON.stringify({
          ...config,
          limiteMensajesPorDia: Number(config.limiteMensajesPorDia),
          limiteMensajesPorHora: Number(config.limiteMensajesPorHora),
          costoPorMensajeWhatsapp: Number(config.costoPorMensajeWhatsapp),
          costoPorMensajeSms: Number(config.costoPorMensajeSms)
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        setFeedback({ type: 'success', message: 'Configuración general de campañas guardada exitosamente.' });
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.message || 'Error al guardar la configuración.' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Error de conexión.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch('/campaign-config/toggle', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        setFeedback({
          type: 'success',
          message: updated.campanasActivas 
            ? 'Campañas activadas para el tenant.' 
            : 'Campañas pausadas globalmente para el tenant.'
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Error al cambiar estado general de campañas.' });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center text-slate-500">
        Cargando configuración de campañas...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configuración General de Campañas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control centralizado de envíos, límites de velocidad, horarios permitidos y tarifas por canal.
          </p>
        </div>

        {/* Global Toggle Button */}
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            config.campanasActivas ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {config.campanasActivas ? 'Campañas Habilitadas' : 'Campañas Inactivas'}
          </span>
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
              config.campanasActivas 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {toggling ? 'Actualizando...' : config.campanasActivas ? 'Deshabilitar Campañas' : 'Habilitar Campañas'}
          </button>
        </div>
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Políticas y Seguridad */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Políticas de Aprobación y Cumplimiento
          </h2>
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="aprobacionObligatoria"
              checked={config.aprobacionObligatoria}
              onChange={(e) => setConfig({ ...config, aprobacionObligatoria: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="aprobacionObligatoria" className="text-sm">
              <span className="font-medium text-slate-900 block">Exigir aprobación obligatoria de campañas</span>
              <span className="text-slate-500 text-xs">
                Cuando está activo, ningún vendedor ni usuario podrá iniciar o programar un envío sin aprobación previa de un Administrador o Gerente.
              </span>
            </label>
          </div>
        </div>

        {/* Límites de Velocidad y Ventana Horaria */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Velocidad y Horarios Permitidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Límite de Mensajes por Día
              </label>
              <input
                type="number"
                min="1"
                value={config.limiteMensajesPorDia}
                onChange={(e) => setConfig({ ...config, limiteMensajesPorDia: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Límite de Mensajes por Hora
              </label>
              <input
                type="number"
                min="1"
                value={config.limiteMensajesPorHora}
                onChange={(e) => setConfig({ ...config, limiteMensajesPorHora: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hora de Inicio Permitida
              </label>
              <input
                type="time"
                value={config.horarioPermitidoInicio}
                onChange={(e) => setConfig({ ...config, horarioPermitidoInicio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hora de Fin Permitida
              </label>
              <input
                type="time"
                value={config.horarioPermitidoFin}
                onChange={(e) => setConfig({ ...config, horarioPermitidoFin: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Tarifas de Costos por Canal */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Tarifas Estimadas por Mensaje (USD)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Costo Unitario WhatsApp (USD)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={config.costoPorMensajeWhatsapp}
                onChange={(e) => setConfig({ ...config, costoPorMensajeWhatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Costo Unitario SMS (USD)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={config.costoPorMensajeSms}
                onChange={(e) => setConfig({ ...config, costoPorMensajeSms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Mensaje Predeterminado y Firma */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Mensaje Predeterminado y Firma Institucional
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Mensaje Predeterminado de Respaldo
            </label>
            <textarea
              rows={3}
              value={config.mensajePredeterminado || ''}
              onChange={(e) => setConfig({ ...config, mensajePredeterminado: e.target.value })}
              placeholder="Hola {{nombre}}, le escribimos de {{empresa}}..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Se utiliza cuando una campaña no especifica plantilla ni mensaje personalizado.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Firma Institucional
            </label>
            <textarea
              rows={2}
              value={config.firma || ''}
              onChange={(e) => setConfig({ ...config, firma: e.target.value })}
              placeholder="Atentamente,\nEquipo de Ventas"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Se anexa automáticamente al final de cada mensaje preparado en las campañas.</p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            {saving ? 'Guardando Cambios...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
