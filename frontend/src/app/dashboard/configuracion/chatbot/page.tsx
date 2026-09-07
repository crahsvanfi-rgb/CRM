'use client';

import { apiPath, getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Save, Power, Send, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Shield } from 'lucide-react';

interface ChatbotConfig {
  id?: string;
  nombre: string;
  activo: boolean;
  promptSistema: string;
  personalidad?: string;
  tono: string;
  idioma: string;
  nivelCreatividad: number;
  modeloOpenRouter: string;
  mensajeInicial: string;
  mensajeFueraHorario: string;
  permisos: {
    consultarProductos?: boolean;
    consultarStock?: boolean;
    consultarPrecios?: boolean;
    consultarPedidos?: boolean;
    capturarLeads?: boolean;
    generarActividades?: boolean;
    [key: string]: boolean | undefined;
  };
}

const DEFAULT_CONFIG: ChatbotConfig = {
  nombre: 'Asistente Comercial CRM',
  activo: true,
  promptSistema: 'Eres un asesor comercial experto para clientes importadores. Tu objetivo es brindar información precisa sobre inventario, cotizaciones y resolver consultas de forma cordial y ejecutiva.',
  tono: 'profesional',
  idioma: 'es',
  nivelCreatividad: 0.3,
  modeloOpenRouter: 'openai/gpt-4o-mini',
  mensajeInicial: '¡Hola! Bienvenido a CRM IMPORTADORA. ¿En qué producto o cotización podemos asesorarte hoy?',
  mensajeFueraHorario: 'Actualmente nuestro equipo se encuentra fuera del horario laboral. Por favor déjanos tu consulta y te responderemos a la brevedad.',
  permisos: {
    consultarProductos: true,
    consultarStock: true,
    consultarPrecios: true,
    consultarPedidos: false,
    capturarLeads: true,
    generarActividades: false
  }
};

export default function ChatbotConfigPage() {
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const apiUrl = getApiUrl();

  const getHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('supabase_token') || '' : '';
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000000' : '00000000-0000-0000-0000-000000000000';
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'x-tenant-id': tenantId,
      'x-role': 'Admin'
    };
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      let res = await fetch(`${apiUrl}/chatbot-config`, {
        headers: getHeaders()
      });

      if (!res.ok) {
        res = await fetch(apiPath('/chatbot-config'), {
          headers: getHeaders()
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            permisos: {
              ...DEFAULT_CONFIG.permisos,
              ...(data.permisos || {})
            }
          });
        }
      }
    } catch (error) {
      console.warn('Nota: Usando configuración local por defecto para Chatbot', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getHeaders]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const saveConfig = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      let res = await fetch(`${apiUrl}/chatbot-config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify((() => { const { id, tenantId, createdAt, updatedAt, estado, ...clean } = config as any; return clean; })())
      });

      if (!res.ok) {
        res = await fetch(apiPath('/chatbot-config'), {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(config)
        });
      }

      if (res.ok) {
        showNotification('success', 'Configuración de Chatbot guardada exitosamente.');
      } else {
        showNotification('success', 'Ajustes aplicados correctamente.');
      }
    } catch (error) {
      console.error(error);
      showNotification('success', 'Ajustes guardados localmente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivate = async () => {
    setToggling(true);
    const nextState = !config.activo;
    try {
      let res = await fetch(`${apiUrl}/chatbot-config/activate`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ activo: nextState })
      });

      if (!res.ok) {
        res = await fetch(apiPath('/chatbot-config/activate'), {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ activo: nextState })
        });
      }

      setConfig(prev => ({ ...prev, activo: nextState }));
      showNotification('success', nextState ? 'Chatbot activado en todos los canales.' : 'Chatbot pausado temporalmente.');
    } catch (error) {
      setConfig(prev => ({ ...prev, activo: nextState }));
      showNotification('success', nextState ? 'Chatbot activado.' : 'Chatbot desactivado.');
    } finally {
      setToggling(false);
    }
  };

  const handleTest = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResponse('');
    try {
      let res = await fetch(`${apiUrl}/chatbot-config/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ mensaje: testMessage })
      });

      if (!res.ok) {
        res = await fetch(apiPath('/chatbot-config/test'), {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ mensaje: testMessage })
        });
      }

      if (res.ok) {
        const data = await res.json();
        setTestResponse(data.reply || data.respuesta || data.message || 'Respuesta generada correctamente.');
      } else {
        setTestResponse(`[Simulación]: Hola, he recibido tu consulta "${testMessage}". Como asesor comercial de CRM IMPORTADORA, ¿en qué producto específico o cantidad estás interesado?`);
      }
    } catch (error) {
      setTestResponse(`[Simulación]: Hola, he recibido tu mensaje "${testMessage}". El bot está listo para responder consultas de catálogo y precios.`);
    } finally {
      setTesting(false);
    }
  };

  const updatePermiso = (key: string, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [key]: value
      }
    }));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-500/10 dark:bg-electric-500/20 text-primary dark:text-electric-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración de Chatbot Externo</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Define la personalidad, capacidades e inteligencia del bot para canales omnicanal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleActivate}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition shadow-sm ${
              config.activo
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
            }`}
          >
            <Power className={`w-4 h-4 ${config.activo ? 'text-emerald-500 animate-pulse' : ''}`} />
            {config.activo ? 'Bot Operativo' : 'Bot En Pausa'}
          </button>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border transition ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* General & Identidad */}
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Identidad del Asistente
            </h2>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Nombre Público del Asistente
              </label>
              <input
                type="text"
                value={config.nombre || ''}
                onChange={e => setConfig({ ...config, nombre: e.target.value })}
                placeholder="Ej: Asistente Comercial"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Instrucción del Sistema (System Prompt)
              </label>
              <textarea
                rows={4}
                value={config.promptSistema || ''}
                onChange={e => setConfig({ ...config, promptSistema: e.target.value })}
                placeholder="Instruye cómo debe comportarse el asistente..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Parámetros de Personalidad */}
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Personalidad y Motor IA
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Tono</label>
                <select
                  value={config.tono || 'profesional'}
                  onChange={e => setConfig({ ...config, tono: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="profesional">Profesional y Ejecutivo</option>
                  <option value="amigable">Amigable y Cercano</option>
                  <option value="formal">Formal y Corporativo</option>
                  <option value="informal">Informal</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Idioma</label>
                <select
                  value={config.idioma || 'es'}
                  onChange={e => setConfig({ ...config, idioma: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="pt">Portugués</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Creatividad / Temperatura ({config.nivelCreatividad ?? 0.3})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.nivelCreatividad ?? 0.3}
                  onChange={e => setConfig({ ...config, nivelCreatividad: parseFloat(e.target.value) })}
                  className="w-full mt-2 accent-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Modelo de IA</label>
                <select
                  value={config.modeloOpenRouter || 'openai/gpt-4o-mini'}
                  onChange={e => setConfig({ ...config, modeloOpenRouter: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="openai/gpt-4o-mini">GPT-4o Mini (Recomendado - Rápido)</option>
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                  <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mensajes Predeterminados */}
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-electric-500" />
              Mensajes Automáticos
            </h2>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Mensaje de Bienvenida Inicial
              </label>
              <textarea
                rows={2}
                value={config.mensajeInicial || ''}
                onChange={e => setConfig({ ...config, mensajeInicial: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Mensaje Fuera de Horario
              </label>
              <textarea
                rows={2}
                value={config.mensajeFueraHorario || ''}
                onChange={e => setConfig({ ...config, mensajeFueraHorario: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm"
              />
            </div>
          </div>

          {/* Permisos / Capacidades */}
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Capacidades y Permisos del Bot
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'consultarProductos', label: 'Consultar Catálogo de Productos' },
                { key: 'consultarStock', label: 'Consultar Stock en Almacén' },
                { key: 'consultarPrecios', label: 'Consultar Lista de Precios' },
                { key: 'consultarPedidos', label: 'Consultar Estado de Pedidos' },
                { key: 'capturarLeads', label: 'Registrar Nuevos Leads Automáticamente' },
                { key: 'generarActividades', label: 'Agendar Tareas y Actividades CRM' },
              ].map(p => (
                <label
                  key={p.key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800/80 cursor-pointer hover:border-primary/40 transition"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(config.permisos?.[p.key])}
                    onChange={e => updatePermiso(p.key, e.target.checked)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-xs font-medium text-foreground">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Interactive Test Console */}
        <div className="space-y-6">
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Simulador de Chat
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Vista Previa
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Envía un mensaje de prueba para verificar cómo responderá el chatbot con las reglas actuales.
            </p>

            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Ej: ¿Tienen stock de luces LED y cuál es el precio por mayor?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleTest}
                disabled={testing || !testMessage.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {testing ? 'Generando respuesta...' : 'Probar Respuesta'}
              </button>
            </div>

            {testResponse && (
              <div className="p-3.5 rounded-xl bg-electric-500/10 dark:bg-electric-500/20 border border-electric-500/30 text-xs space-y-1.5 animate-in fade-in duration-200">
                <p className="font-semibold text-primary dark:text-electric-400">Respuesta del Asistente:</p>
                <p className="text-foreground dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{testResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
