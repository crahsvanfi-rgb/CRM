'use client';

import { apiPath, getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Save, 
  ShieldCheck, 
  Cpu, 
  Key, 
  Globe, 
  Thermometer, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Edit3, 
  ListFilter
} from 'lucide-react';
import { getAuthHeaders } from '@/utils/auth';

interface ModelOption {
  id: string;
  name: string;
  desc: string;
  badge?: string;
  isFree?: boolean;
}

interface ModelGroup {
  group: string;
  models: ModelOption[];
}

const MODEL_GROUPS: ModelGroup[] = [
  {
    group: 'Modelos Gratuitos y Routers (Free Tier)',
    models: [
      { id: 'free-models-router', name: 'Free Models Router', desc: 'Enrutador inteligente que selecciona entre los mejores modelos gratuitos de OpenRouter', badge: 'Gratis', isFree: true },
      { id: 'openrouter/auto', name: 'OpenRouter Auto Router', desc: 'Enrutador dinámico automático de OpenRouter según disponibilidad', badge: 'Auto' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (Free)', desc: 'Potente modelo de 70B de Meta con nivel GPT-4 sin costo', badge: 'Gratis', isFree: true },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B Instruct (Free)', desc: 'Llama 3.1 8B sin coste para consultas estándar', badge: 'Gratis', isFree: true },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)', desc: 'Última generación multimodal de Google gratuita', badge: 'Gratis', isFree: true },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', desc: 'Razonamiento profundo y lógica matemática sin costo', badge: 'Gratis', isFree: true },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)', desc: 'Mistral 7B ágil y gratuito', badge: 'Gratis', isFree: true },
    ],
  },
  {
    group: 'OpenAI',
    models: [
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Ultrarrápido, económico y altamente capaz', badge: 'Recomendado' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', desc: 'Máxima capacidad analítica multimodal y razonamiento' },
    ],
  },
  {
    group: 'Anthropic Claude',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Líder en razonamiento comercial, redacción y código' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', desc: 'Respuestas instantáneas y concisas de bajo costo' },
    ],
  },
  {
    group: 'Google Gemini',
    models: [
      { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', desc: 'Ventana de contexto ultra amplia de 1 millón de tokens' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', desc: 'Análisis exhaustivo y razonamiento de alta complejidad' },
    ],
  },
  {
    group: 'Meta Llama',
    models: [
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', desc: 'Equilibrio ideal entre velocidad y precisión' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', desc: 'Capacidad lingüística y lógica superior de 70B' },
    ],
  },
  {
    group: 'Mistral AI',
    models: [
      { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct', desc: 'Modelo compacto europeo de alta precisión' },
    ],
  },
];

const ALL_FLAT_MODELS = MODEL_GROUPS.flatMap(g => g.models);

export default function AiConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  
  const [config, setConfig] = useState({
    habilitada: false,
    apiKey: '',
    modelo: 'openai/gpt-4o-mini',
    temperatura: 0.3,
    maxTokens: 1000,
    promptGeneral: '',
    instruccionesInternas: '',
    tono: 'profesional',
    idioma: 'es',
    estado: 'SIN_CONFIGURAR',
  });

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const apiUrl = getApiUrl();

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      let res = await fetch(`${apiUrl}/ai-config`, { headers });
      if (!res.ok) {
        res = await fetch(apiPath('/ai-config'), { headers });
      }

      if (res.ok) {
        const data = await res.json();
        const incomingModel = data.modelo || 'openai/gpt-4o-mini';
        const isKnownModel = ALL_FLAT_MODELS.some(m => m.id === incomingModel);
        
        setConfig(prev => ({
          ...prev,
          ...data,
          apiKey: data.apiKey ? '****************' : '',
        }));

        if (!isKnownModel && incomingModel) {
          setCustomModelMode(true);
        }
      }
    } catch (error) {
      console.warn('Usando configuración local de IA:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const trimmedModel = config.modelo.trim();
    if (!trimmedModel) {
      showNotification('error', 'El modelo de IA no puede estar vacío.');
      setSaving(false);
      return;
    }

    try {
      const headers = getAuthHeaders();
      const { estado, ...payload }: any = config;
      payload.modelo = trimmedModel;

      if (payload.apiKey && payload.apiKey.startsWith('****')) {
        delete payload.apiKey;
      }

      let res = await fetch(`${apiUrl}/ai-config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch(apiPath('/ai-config'), {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showNotification('success', 'Configuración de IA guardada exitosamente.');
        fetchConfig();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showNotification('error', errorData.message || 'Error al guardar la configuración.');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const headers = getAuthHeaders();
      let res = await fetch(`${apiUrl}/ai-config/test`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        res = await fetch(apiPath('/ai-config/test'), {
          method: 'POST',
          headers,
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification('success', data.message || 'Conexión exitosa con OpenRouter.');
        setConfig(prev => ({ ...prev, estado: 'CONECTADO' }));
      } else {
        showNotification('error', data.message || 'Error en la conexión a OpenRouter.');
        setConfig(prev => ({ ...prev, estado: 'ERROR' }));
      }
    } catch (error: any) {
      showNotification('error', `Fallo de red: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Seguro que deseas restablecer la configuración de IA? Se perderá la API Key guardada.')) return;
    try {
      const headers = getAuthHeaders();
      let res = await fetch(`${apiUrl}/ai-config`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        res = await fetch(apiPath('/ai-config'), {
          method: 'DELETE',
          headers,
        });
      }

      if (res.ok) {
        showNotification('success', 'Configuración de IA restablecida.');
        fetchConfig();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const currentModelMeta = ALL_FLAT_MODELS.find(m => m.id === config.modelo);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-500/10 dark:bg-electric-500/20 text-primary dark:text-electric-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración de Inteligencia Artificial</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Controla la integración con OpenRouter, selección de modelos (incluyendo opciones gratuitas) y prompts maestros</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            config.estado === 'CONECTADO'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : config.estado === 'ERROR'
              ? 'bg-red-500/10 text-red-500 border-red-500/30'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            {config.estado}
          </span>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !config.habilitada}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary dark:bg-slate-800 hover:bg-secondary/80 text-foreground dark:text-slate-100 text-xs font-semibold border border-border dark:border-slate-700 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border transition animate-in fade-in duration-200 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle General */}
        <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground text-base">Activar Funciones de Inteligencia Artificial</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Permite a los usuarios interactuar con el agente comercial, sugerencias y análisis automáticos.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.habilitada}
              onChange={(e) => setConfig({ ...config, habilitada: e.target.checked })}
            />
            <div className="w-11 h-6 bg-muted dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Credenciales y Modelo */}
        <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            Credenciales y Modelo de OpenRouter
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                OpenRouter API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  required={config.habilitada && !config.apiKey}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showKey ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Tu clave se almacena cifrada con AES-256 en la base de datos del tenant.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Modelo de IA
                </label>
                <button
                  type="button"
                  onClick={() => setCustomModelMode(!customModelMode)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1 transition"
                >
                  {customModelMode ? (
                    <>
                      <ListFilter className="w-3.5 h-3.5" />
                      Ver Catálogo
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      Personalizado / Libre
                    </>
                  )}
                </button>
              </div>

              {!customModelMode ? (
                <div>
                  <select
                    value={ALL_FLAT_MODELS.some(m => m.id === config.modelo) ? config.modelo : 'custom_manual'}
                    onChange={(e) => {
                      if (e.target.value === 'custom_manual') {
                        setCustomModelMode(true);
                      } else {
                        setConfig({ ...config, modelo: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {MODEL_GROUPS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.badge ? `[${m.badge}]` : ''} - {m.id}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="Otra Opción">
                      <option value="custom_manual">✏️ Escribir otro modelo de OpenRouter...</option>
                    </optgroup>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      list="openrouter-model-suggestions"
                      value={config.modelo}
                      onChange={(e) => setConfig({ ...config, modelo: e.target.value })}
                      placeholder="ej: free-models-router, meta-llama/llama-3.3-70b-instruct:free..."
                      className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                    <datalist id="openrouter-model-suggestions">
                      {ALL_FLAT_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Escribe cualquier slug válido de OpenRouter (ej: <code className="font-mono text-primary">free-models-router</code> o <code className="font-mono text-primary">proveedor/modelo</code>).
                  </p>
                </div>
              )}

              {/* Detalle o badge del modelo seleccionado */}
              <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                {currentModelMeta ? (
                  <>
                    <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                      currentModelMeta.isFree
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {currentModelMeta.badge || 'Catálogo'}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {currentModelMeta.desc}
                    </span>
                  </>
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px]">
                    Modelo personalizado: {config.modelo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Parámetros de Inferencia */}
        <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500" />
            Parámetros de Inferencia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Temperatura ({config.temperatura})
              </label>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={config.temperatura}
                onChange={(e) => setConfig({ ...config, temperatura: parseFloat(e.target.value) })}
                className="w-full mt-2 accent-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Valores bajos = respuestas precisas. Valores altos = mayor creatividad.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Tokens Máximos
              </label>
              <input
                type="number"
                min="100" max="8000"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1000 })}
                className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Idioma de Respuesta
              </label>
              <select
                value={config.idioma}
                onChange={(e) => setConfig({ ...config, idioma: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="pt">Portugués</option>
              </select>
            </div>
          </div>
        </div>

        {/* Prompts y Personalidad */}
        <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Prompts Maestros y Tono
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Tono del Agente
              </label>
              <select
                value={config.tono}
                onChange={(e) => setConfig({ ...config, tono: e.target.value })}
                className="w-full sm:w-1/2 px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground"
              >
                <option value="profesional">Profesional y directo</option>
                <option value="formal">Formal y corporativo</option>
                <option value="amigable">Amigable y empático</option>
                <option value="casual">Casual y distendido</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Prompt General (Contexto de la Empresa)
              </label>
              <textarea
                rows={3}
                value={config.promptGeneral}
                onChange={(e) => setConfig({ ...config, promptGeneral: e.target.value })}
                placeholder="Ej: Somos una empresa importadora y distribuidora de tecnología y repuestos industriales..."
                className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Instrucciones Internas de Seguridad y Límites
              </label>
              <textarea
                rows={3}
                value={config.instruccionesInternas}
                onChange={(e) => setConfig({ ...config, instruccionesInternas: e.target.value })}
                placeholder="Ej: Nunca ofrezcas plazos de crédito superiores a 30 días sin confirmación del gerente comercial."
                className="w-full px-3.5 py-2.5 bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl text-sm text-foreground font-mono"
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-semibold transition border border-transparent hover:border-red-500/20"
          >
            Restablecer a valores de fábrica
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm shadow transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
