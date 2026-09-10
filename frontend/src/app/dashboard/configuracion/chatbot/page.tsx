'use client';

import { apiPath, getApiUrl } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Save, Power, Send, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Shield, Key, RefreshCw, Edit3, ListFilter } from 'lucide-react';


type ModelOption = { id: string; name: string; desc: string; badge?: string; isFree?: boolean };
type ModelGroup = { group: string; models: ModelOption[] };

const MODEL_GROUPS: ModelGroup[] = [
  {
    group: 'Modelos Gratuitos y Routers (Free Tier)',
    models: [
      { id: 'free-models-router', name: 'Free Models Router', desc: 'Enrutador inteligente que selecciona modelos gratuitos', badge: 'Gratis', isFree: true },
      { id: 'openrouter/auto', name: 'OpenRouter Auto Router', desc: 'Router automatico segun disponibilidad', badge: 'Auto' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (Free)', desc: 'Modelo gratuito potente de Meta', badge: 'Gratis', isFree: true },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B Instruct (Free)', desc: 'Modelo gratuito rapido para consultas estandar', badge: 'Gratis', isFree: true },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)', desc: 'Modelo multimodal gratuito de Google', badge: 'Gratis', isFree: true },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', desc: 'Razonamiento profundo sin costo', badge: 'Gratis', isFree: true },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)', desc: 'Modelo compacto gratuito', badge: 'Gratis', isFree: true },
    ],
  },
  { group: 'OpenAI', models: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Rapido, economico y capaz', badge: 'Recomendado' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', desc: 'Alta capacidad analitica multimodal' },
  ]},
  { group: 'Anthropic Claude', models: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Razonamiento comercial y redaccion avanzada' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', desc: 'Respuestas instantaneas y concisas' },
  ]},
  { group: 'Google Gemini', models: [
    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', desc: 'Ventana de contexto amplia' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', desc: 'Analisis exhaustivo y razonamiento complejo' },
  ]},
  { group: 'Meta Llama', models: [
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', desc: 'Equilibrio entre velocidad y precision' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', desc: 'Mayor capacidad linguistica y logica' },
  ]},
  { group: 'Mistral AI', models: [
    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct', desc: 'Modelo compacto europeo' },
  ]},
];

const ALL_FLAT_MODELS = MODEL_GROUPS.flatMap(group => group.models);
interface ChatbotConfig {
  id?: string;
  nombre: string;
  activo: boolean;
  apiKey?: string | null;
  estado?: string;
  promptSistema: string;
  personalidad?: string;
  tono: string;
  idioma: string;
  nivelCreatividad: number;
  modeloOpenRouter: string;
  modelo?: string;
  maxTokens?: number;
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
  apiKey: '',
  estado: 'SIN_CONFIGURAR',
  promptSistema: 'Eres un asesor comercial experto para clientes importadores. Tu objetivo es brindar informaciÃ³n precisa sobre inventario, cotizaciones y resolver consultas de forma cordial y ejecutiva.',
  tono: 'profesional',
  idioma: 'es',
  nivelCreatividad: 0.3,
  modeloOpenRouter: 'openai/gpt-4o-mini',
  modelo: 'openai/gpt-4o-mini',
  maxTokens: 1000,
  mensajeInicial: 'Â¡Hola! Bienvenido a CRM IMPORTADORA. Â¿En quÃ© producto o cotizaciÃ³n podemos asesorarte hoy?',
  mensajeFueraHorario: 'Actualmente nuestro equipo se encuentra fuera del horario laboral. Por favor dÃ©janos tu consulta y te responderemos a la brevedad.',
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
  const [testingConnection, setTestingConnection] = useState(false);
    const [customModelMode, setCustomModelMode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const apiUrl = getApiUrl();
  const selectedModel = config.modeloOpenRouter || config.modelo || 'openai/gpt-4o-mini';
  const currentModelMeta = ALL_FLAT_MODELS.find(model => model.id === selectedModel);
  const setModel = (model: string) => setConfig(prev => ({ ...prev, modeloOpenRouter: model, modelo: model }));

  const getHeaders = useCallback(() => getAuthHeaders(), []);

  const buildPayload = () => {
    const { id, tenantId, createdAt, updatedAt, estado, modelo, ...clean } = config as any;
    clean.modeloOpenRouter = selectedModel.trim();
    clean.apiKey = '';
    return clean;
  };
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
      console.warn('Nota: Usando configuraciÃ³n local por defecto para Chatbot', error);
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
    if (!selectedModel.trim()) {
      showNotification('error', 'El modelo del chatbot no puede estar vacio.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload = buildPayload();
      let res = await fetch(`${apiUrl}/chatbot-config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(apiPath('/chatbot-config'), {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const incomingModel = data.modeloOpenRouter || data.modelo || payload.modeloOpenRouter;
        setConfig(prev => ({ ...prev, ...data, modeloOpenRouter: incomingModel, modelo: incomingModel, apiKey: data.apiKey || prev.apiKey }));
        showNotification('success', 'Configuracion de Chatbot guardada exitosamente.');
      } else {
        showNotification('error', data.message || 'Error al guardar la configuracion del chatbot.');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Error de conexion al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setFeedback(null);
    try {
      const payload = buildPayload();
      let res = await fetch(`${apiUrl}/chatbot-config/test-connection`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(apiPath('/chatbot-config/test-connection'), {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig(prev => ({ ...prev, estado: 'CONECTADO' }));
        showNotification('success', data.message || `Conexion exitosa con ${data.model || selectedModel}.`);
      } else {
        setConfig(prev => ({ ...prev, estado: 'ERROR' }));
        showNotification('error', data.message || 'OpenRouter rechazo la configuracion del chatbot.');
      }
    } catch (error: any) {
      showNotification('error', `Fallo de red: ${error.message}`);
    } finally {
      setTestingConnection(false);
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo cambiar el estado del bot.');
      }

      setConfig(prev => ({ ...prev, ...data, activo: data.activo ?? nextState }));
      showNotification('success', nextState ? 'Chatbot activado en todos los canales.' : 'Chatbot pausado temporalmente.');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'No se pudo cambiar el estado del bot.');
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
        setTestResponse(`[SimulaciÃ³n]: Hola, he recibido tu consulta "${testMessage}". Como asesor comercial de CRM IMPORTADORA, Â¿en quÃ© producto especÃ­fico o cantidad estÃ¡s interesado?`);
      }
    } catch (error) {
      setTestResponse(`[SimulaciÃ³n]: Hola, he recibido tu mensaje "${testMessage}". El bot estÃ¡ listo para responder consultas de catÃ¡logo y precios.`);
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
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary dark:bg-slate-800 hover:bg-secondary/80 text-foreground dark:text-slate-100 text-xs font-semibold border border-border dark:border-slate-700 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            {testingConnection ? 'Probando...' : 'Probar Conexion'}
          </button>
            <div className="w-10 h-10 rounded-xl bg-electric-500/10 dark:bg-electric-500/20 text-primary dark:text-electric-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">ConfiguraciÃ³n de Chatbot Externo</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Define la personalidad, capacidades e inteligencia del bot para canales omnicanal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleActivate}
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

          <button type="button" onClick={saveConfig}
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
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2"><Key className="w-4 h-4 text-primary" />Credenciales y Modelo de OpenRouter</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">API Key de OpenRouter</label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Usar la misma API Key de IA</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Configura la clave una sola vez en Configuracion IA. El chatbot la hereda automaticamente.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Modelo del Chatbot</label>
                  <button type="button" onClick={() => setCustomModelMode(prev => !prev)} className="text-xs font-medium text-primary hover:underline flex items-center gap-1 transition">{customModelMode ? <ListFilter className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}{customModelMode ? 'Ver Catalogo' : 'Personalizado'}</button>
                </div>
                {!customModelMode ? (
                  <select value={ALL_FLAT_MODELS.some(model => model.id === selectedModel) ? selectedModel : 'custom_manual'} onChange={e => { if (e.target.value === 'custom_manual') { setCustomModelMode(true); } else { setModel(e.target.value); } }} className="w-full px-3 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    {MODEL_GROUPS.map(group => <optgroup key={group.group} label={group.group}>{group.models.map(model => <option key={model.id} value={model.id}>{model.name} {model.badge ? `[${model.badge}]` : ''} - {model.id}</option>)}</optgroup>)}
                    <optgroup label="Otra opcion"><option value="custom_manual">Escribir otro modelo de OpenRouter...</option></optgroup>
                  </select>
                ) : (
                  <input type="text" list="chatbot-openrouter-model-suggestions" value={selectedModel} onChange={e => setModel(e.target.value)} placeholder="free-models-router o proveedor/modelo" className="w-full px-3.5 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                )}
                <datalist id="chatbot-openrouter-model-suggestions">{ALL_FLAT_MODELS.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</datalist>
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">{currentModelMeta ? <><span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${currentModelMeta.isFree ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>{currentModelMeta.badge || 'Catalogo'}</span><span className="text-muted-foreground text-[11px]">{currentModelMeta.desc}</span></> : <span className="px-2 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px]">Modelo personalizado: {selectedModel}</span>}</div>
              </div>
            </div>
          </div>
          {/* General & Identidad */}
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Identidad del Asistente
            </h2>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Nombre PÃºblico del Asistente
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
                InstrucciÃ³n del Sistema (System Prompt)
              </label>
              <textarea
                rows={4}
                value={config.promptSistema || ''}
                onChange={e => setConfig({ ...config, promptSistema: e.target.value })}
                placeholder="Instruye cÃ³mo debe comportarse el asistente..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* ParÃ¡metros de Personalidad */}
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
                  <option value="es">EspaÃ±ol</option>
                  <option value="en">InglÃ©s</option>
                  <option value="pt">PortuguÃ©s</option>
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Tokens Maximos</label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  value={config.maxTokens || 1000}
                  onChange={e => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1000 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Mensajes Predeterminados */}
          <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-electric-500" />
              Mensajes AutomÃ¡ticos
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
                { key: 'consultarProductos', label: 'Consultar CatÃ¡logo de Productos' },
                { key: 'consultarStock', label: 'Consultar Stock en AlmacÃ©n' },
                { key: 'consultarPrecios', label: 'Consultar Lista de Precios' },
                { key: 'consultarPedidos', label: 'Consultar Estado de Pedidos' },
                { key: 'capturarLeads', label: 'Registrar Nuevos Leads AutomÃ¡ticamente' },
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
              EnvÃ­a un mensaje de prueba para verificar cÃ³mo responderÃ¡ el chatbot con las reglas actuales.
            </p>

            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Ej: Â¿Tienen stock de luces LED y cuÃ¡l es el precio por mayor?"
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



