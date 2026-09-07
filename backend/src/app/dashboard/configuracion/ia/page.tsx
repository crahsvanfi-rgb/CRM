'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AiConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  
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

  const [message, setMessage] = useState({ text: '', type: '' });

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  const getHeaders = () => {
    const tenantId = localStorage.getItem('tenantId') || '12345678-1234-1234-1234-123456789012';
    const rawToken = localStorage.getItem('token') || localStorage.getItem('supabase_token') || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken : (rawToken ? `Bearer ${rawToken}` : '');
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
    const role = localStorage.getItem('userRole') || 'Admin';

    return {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'x-user-id': userId,
      'x-role': role,
      ...(token ? { 'Authorization': token } : {})
    };
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${apiUrl}/ai-config`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setConfig((prev) => ({
          ...prev,
          ...data,
          apiKey: data.apiKey || '', // Puede venir como ****1234
        }));
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Advertencia al cargar config de IA:', errData);
      }
    } catch (error: any) {
      console.error('Error fetching AI config:', error);
      setMessage({ text: 'No se pudo conectar con el backend. Verifica la URL o la red.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const payload: any = {
        habilitada: Boolean(config.habilitada),
        modelo: config.modelo || 'openai/gpt-4o-mini',
        temperatura: Number(config.temperatura),
        maxTokens: Number(config.maxTokens),
        promptGeneral: config.promptGeneral || '',
        instruccionesInternas: config.instruccionesInternas || '',
        tono: config.tono || 'profesional',
        idioma: config.idioma || 'es',
      };

      if (config.apiKey && !config.apiKey.startsWith('****') && config.apiKey.trim() !== '') {
        payload.apiKey = config.apiKey.trim();
      }

      const res = await fetch(`${apiUrl}/ai-config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ text: 'Configuración guardada exitosamente.', type: 'success' });
        fetchConfig(); // recargar para ver la máscara
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Error de servidor' }));
        setMessage({ text: errorData.message || 'Error al guardar.', type: 'error' });
      }
    } catch (error: any) {
      setMessage({ text: `Fallo de conexión al guardar: ${error.message || 'No se pudo conectar con el servidor'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${apiUrl}/ai-config/test`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setMessage({ text: 'Conexión a OpenRouter exitosa.', type: 'success' });
        setConfig(prev => ({ ...prev, estado: 'CONECTADO' }));
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Error en la conexión' }));
        setMessage({ text: errorData.message || 'Error en la conexión.', type: 'error' });
        setConfig(prev => ({ ...prev, estado: 'ERROR' }));
      }
    } catch (error: any) {
      setMessage({ text: `Fallo de red: ${error.message || 'No se pudo conectar con el backend'}`, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Seguro que deseas restablecer la configuración? Se perderá la API Key.')) return;
    try {
      const res = await fetch(`${apiUrl}/ai-config`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setMessage({ text: 'Configuración restablecida.', type: 'success' });
        fetchConfig();
      }
    } catch (error: any) {
      console.error(error);
      setMessage({ text: 'Error al restablecer la configuración.', type: 'error' });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inteligencia Artificial</h1>
          <p className="text-sm text-gray-500 mt-1">Configura el agente conversacional y el comportamiento de la IA para tu empresa.</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            config.estado === 'CONECTADO' ? 'bg-green-100 text-green-800' :
            config.estado === 'ERROR' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {config.estado}
          </span>
          <button 
            onClick={handleTestConnection}
            disabled={testing || !config.habilitada}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {testing ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        
        {/* Sección de Activación */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <h3 className="font-medium text-gray-900">Activar Funciones de Inteligencia Artificial</h3>
            <p className="text-sm text-gray-500">Permite a los usuarios interactuar con el agente inteligente y recibir sugerencias.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.habilitada}
              onChange={(e) => setConfig({ ...config, habilitada: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Credenciales y Modelo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">OpenRouter API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required={config.habilitada}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="text-xs text-gray-500">Tu clave se almacena encriptada de forma segura.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Modelo preferido</label>
            <select
              value={config.modelo}
              onChange={(e) => setConfig({ ...config, modelo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="openai/gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
              <option value="openai/gpt-4o">GPT-4o (Más capaz)</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
              <option value="anthropic/claude-3-sonnet">Claude 3.5 Sonnet</option>
              <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B</option>
            </select>
          </div>
        </div>

        {/* Parámetros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Temperatura ({config.temperatura})
            </label>
            <input
              type="range"
              min="0" max="1" step="0.1"
              value={config.temperatura}
              onChange={(e) => setConfig({ ...config, temperatura: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Menor = preciso, Mayor = creativo.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tokens Máximos</label>
            <input
              type="number"
              min="100" max="4000"
              value={config.maxTokens}
              onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Idioma de Respuesta</label>
            <select
              value={config.idioma}
              onChange={(e) => setConfig({ ...config, idioma: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="pt">Portugués</option>
            </select>
          </div>
        </div>

        {/* Prompts y Personalidad */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tono del Agente</label>
            <select
              value={config.tono}
              onChange={(e) => setConfig({ ...config, tono: e.target.value })}
              className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="profesional">Profesional y directo</option>
              <option value="formal">Formal y corporativo</option>
              <option value="amigable">Amigable y empático</option>
              <option value="casual">Casual y distendido</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Prompt General (Contexto de la Empresa)</label>
            <textarea
              rows={3}
              value={config.promptGeneral}
              onChange={(e) => setConfig({ ...config, promptGeneral: e.target.value })}
              placeholder="Ej: Somos una importadora de repuestos automotrices líder en la región..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Instrucciones Internas (Solo para el Agente)</label>
            <textarea
              rows={3}
              value={config.instruccionesInternas}
              onChange={(e) => setConfig({ ...config, instruccionesInternas: e.target.value })}
              placeholder="Ej: Nunca ofrezcas descuentos mayores al 10% sin aprobación del gerente."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors"
          >
            Restablecer a valores de fábrica
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
