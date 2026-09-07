"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Share2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  getZernioConfig,
  saveZernioConfig,
  testZernioConnection,
  enviarMensajeWhatsApp,
  publicarContenido,
  ZernioConfigData,
} from '@/services/zernio.service';

export default function ZernioConfigPage() {
  const [config, setConfig] = useState<ZernioConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form State
  const [apiKey, setApiKey] = useState('');
  const [habilitado, setHabilitado] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick action states
  const [quickPhone, setQuickPhone] = useState('');
  const [quickMsg, setQuickMsg] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);
  const [quickPostText, setQuickPostText] = useState('');
  const [publishingQuick, setPublishingQuick] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getZernioConfig();
      setConfig(data);
      setHabilitado(data.habilitado ?? false);
      setApiKey(data.apiKey || '');
      setPhoneNumberId(data.phone_number_id || '');
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', text: 'No se pudo cargar la configuración de Zernio.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);
      const res = await saveZernioConfig({
        apiKey: apiKey.trim(),
        habilitado,
        phone_number_id: phoneNumberId.trim(),
      });
      setNotification({ type: 'success', text: '¡Configuración de Zernio guardada con éxito!' });
      await loadConfig();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error al guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await testZernioConnection(apiKey);
      setTestResult(res);
      if (res.status === 'CONECTADO') {
        setNotification({ type: 'success', text: res.message });
      } else {
        setNotification({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setTestResult({ status: 'ERROR', message: err.message || 'Error en prueba de conexión' });
    } finally {
      setTesting(false);
    }
  };

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPhone || !quickMsg) return;
    try {
      setSendingQuick(true);
      const res = await enviarMensajeWhatsApp(quickPhone, quickMsg);
      setNotification({ type: 'success', text: `Mensaje enviado correctamente vía Zernio (ID: ${res.messageId})` });
      setQuickMsg('');
    } catch (err: any) {
      setNotification({ type: 'error', text: `Error al enviar WhatsApp: ${err.message}` });
    } finally {
      setSendingQuick(false);
    }
  };

  const handleQuickPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPostText) return;
    try {
      setPublishingQuick(true);
      const res = await publicarContenido(['whatsapp', 'facebook', 'instagram'], quickPostText);
      setNotification({ type: 'success', text: `Contenido publicado exitosamente en: ${res.plataformas.join(', ')}` });
      setQuickPostText('');
    } catch (err: any) {
      setNotification({ type: 'error', text: `Error al publicar: ${err.message}` });
    } finally {
      setPublishingQuick(false);
    }
  };

  const currentStatus = config?.status || 'SIN_CONFIGURAR';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <MessageSquare className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Integración Oficial Zernio
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Conecta tu CRM con WhatsApp y redes sociales a través de Zernio para envío de mensajes, publicaciones y agendamiento automático con IA.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {currentStatus === 'CONECTADO' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Conectado
            </span>
          )}
          {currentStatus === 'ERROR' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Error de Conexión
            </span>
          )}
          {currentStatus === 'DESACTIVADO' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-sm">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Desactivado
            </span>
          )}
          {currentStatus === 'SIN_CONFIGURAR' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              Sin Configurar
            </span>
          )}
          <button
            onClick={loadConfig}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            title="Actualizar estado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" />
                  Credenciales de Zernio
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  La API Key se almacena cifrada en el backend y nunca es transmitida al navegador.
                </p>
              </div>

              {/* Toggle Activar/Desactivar */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {habilitado ? 'Canal Activo' : 'Canal Inactivo'}
                </span>
                <button
                  type="button"
                  onClick={() => setHabilitado(!habilitado)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    habilitado ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={habilitado}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      habilitado ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                API Key de Zernio
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showApiKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Obtén tu API Key desde el panel de control de tu cuenta en{' '}
                <a href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">
                  zernio.com
                </a>.
              </p>
            </div>

            {/* Phone Number ID */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone Number ID (Opcional para WhatsApp Directo)
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Ej: 104598234852934"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!apiKey && !config?.apiKey)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Probando...' : 'Probar conexión'}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  testResult.status === 'CONECTADO'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.status === 'CONECTADO' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </form>

          {/* Quick Actions Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick WhatsApp Send */}
            <form onSubmit={handleQuickSend} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                Probar Envío WhatsApp (Proxy)
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Teléfono (ej: +59171234567)"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
                <textarea
                  placeholder="Mensaje de prueba..."
                  value={quickMsg}
                  onChange={(e) => setQuickMsg(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingQuick || !habilitado}
                  className="w-full py-2 px-3 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingQuick ? 'Enviando...' : 'Enviar vía Backend'}
                </button>
              </div>
            </form>

            {/* Quick Multi-channel Publish */}
            <form onSubmit={handleQuickPublish} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-500" />
                Publicar Contenido Multicanal
              </h3>
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Publica simultáneamente en WhatsApp, Facebook e Instagram mediante Zernio.
                </p>
                <textarea
                  placeholder="Texto de la publicación..."
                  value={quickPostText}
                  onChange={(e) => setQuickPostText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={publishingQuick || !habilitado}
                  className="w-full py-2 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {publishingQuick ? 'Publicando...' : 'Publicar Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info / Webhook URL */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Agendamiento con IA
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cuando un cliente escribe por WhatsApp solicitando agendar una visita o reunión (palabras como{' '}
              <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded">
                agendar
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded">
                cita
              </code>
              ,{' '}
              <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded">
                mañana
              </code>
              ), el sistema:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pl-4 list-disc">
              <li>Crea o asocia el Lead automáticamente.</li>
              <li>Agenda una cita en tu Calendario (/dashboard/activities/calendar).</li>
              <li>Genera respuesta con el Agente de IA comercial.</li>
            </ul>
          </div>

          {/* Webhook details */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              URL del Webhook (Zernio)
            </h4>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all">
              https://tu-dominio.com/zernio/webhook
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Token de verificación predeterminado:{' '}
              <code className="font-semibold text-slate-700 dark:text-slate-300">
                crm_zernio_secure_2026
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
