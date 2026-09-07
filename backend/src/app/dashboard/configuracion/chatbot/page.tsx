'use client';
import { useState, useEffect } from 'react';

export default function ChatbotConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/chatbot-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching config', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/chatbot-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert('Configuración guardada correctamente.');
      } else {
        alert('Error al guardar la configuración.');
      }
    } catch (error) {
      console.error('Error saving config', error);
      alert('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivate = async () => {
    try {
      const res = await fetch('/chatbot-config/activate', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ activo: !config.activo })
      });
      if (res.ok) {
        setConfig({ ...config, activo: !config.activo });
      }
    } catch (error) {
      console.error('Error activando/desactivando chatbot', error);
    }
  };

  const handleTest = async () => {
    if (!testMessage) return;
    setTesting(true);
    setTestResponse('');
    try {
      const res = await fetch('/chatbot-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ mensaje: testMessage })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResponse(data.reply || data.respuesta);
      } else {
        setTestResponse('Error al probar el chatbot.');
      }
    } catch (error) {
      console.error('Error en prueba', error);
      setTestResponse('Error al probar el chatbot.');
    } finally {
      setTesting(false);
    }
  };

  const updatePermiso = (key: string, value: boolean) => {
    setConfig({
      ...config,
      permisos: {
        ...config.permisos,
        [key]: value
      }
    });
  };

  if (loading) return <div>Cargando configuración...</div>;
  if (!config) return <div>Error al cargar.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Configuración de Chatbot Externo</h1>
        <button 
          onClick={toggleActivate}
          className={`px-4 py-2 rounded text-white font-bold ${config.activo ? 'bg-red-500' : 'bg-green-500'}`}
        >
          {config.activo ? 'Desactivar Chatbot' : 'Activar Chatbot'}
        </button>
      </div>

      <div className="space-y-6">
        {/* General */}
        <section>
          <h2 className="text-xl font-semibold mb-2">General</h2>
          <label className="block mb-2">
            Nombre del Asistente:
            <input 
              type="text" 
              className="w-full border p-2 rounded mt-1" 
              value={config.nombre || ''}
              onChange={e => setConfig({...config, nombre: e.target.value})}
            />
          </label>
        </section>

        {/* Personalidad */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Personalidad y Tono</h2>
          <label className="block mb-2">
            Prompt del Sistema:
            <textarea 
              className="w-full border p-2 rounded mt-1" 
              rows={4}
              value={config.promptSistema || ''}
              onChange={e => setConfig({...config, promptSistema: e.target.value})}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block mb-2">
              Tono:
              <select 
                className="w-full border p-2 rounded mt-1"
                value={config.tono || 'profesional'}
                onChange={e => setConfig({...config, tono: e.target.value})}
              >
                <option value="profesional">Profesional</option>
                <option value="amigable">Amigable</option>
                <option value="formal">Formal</option>
                <option value="informal">Informal</option>
              </select>
            </label>
            <label className="block mb-2">
              Idioma:
              <select 
                className="w-full border p-2 rounded mt-1"
                value={config.idioma || 'es'}
                onChange={e => setConfig({...config, idioma: e.target.value})}
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="pt">Portugués</option>
              </select>
            </label>
            <label className="block mb-2">
              Creatividad (0 a 1):
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="1" 
                className="w-full border p-2 rounded mt-1"
                value={config.nivelCreatividad || 0.3}
                onChange={e => setConfig({...config, nivelCreatividad: parseFloat(e.target.value)})}
              />
            </label>
            <label className="block mb-2">
              Modelo IA:
              <select 
                className="w-full border p-2 rounded mt-1"
                value={config.modeloOpenRouter || 'openai/gpt-4o-mini'}
                onChange={e => setConfig({...config, modeloOpenRouter: e.target.value})}
              >
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
              </select>
            </label>
          </div>
        </section>

        {/* Mensajes */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Mensajes Predeterminados</h2>
          <label className="block mb-2">
            Mensaje Inicial:
            <input 
              type="text" 
              className="w-full border p-2 rounded mt-1" 
              value={config.mensajeInicial || ''}
              onChange={e => setConfig({...config, mensajeInicial: e.target.value})}
            />
          </label>
          <label className="block mb-2">
            Mensaje Fuera de Horario:
            <input 
              type="text" 
              className="w-full border p-2 rounded mt-1" 
              value={config.mensajeFueraHorario || ''}
              onChange={e => setConfig({...config, mensajeFueraHorario: e.target.value})}
            />
          </label>
        </section>

        {/* Permisos */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Permisos (Capacidades del Bot)</h2>
          <div className="grid grid-cols-2 gap-4">
            {['consultarProductos', 'consultarStock', 'consultarPrecios', 'consultarPedidos', 'capturarLeads', 'generarActividades'].map(perm => (
              <label key={perm} className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={config.permisos?.[perm] || false}
                  onChange={e => updatePermiso(perm, e.target.checked)}
                />
                <span className="capitalize">{perm.replace(/([A-Z])/g, ' $1')}</span>
              </label>
            ))}
          </div>
        </section>

        <button 
          onClick={saveConfig}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold w-full"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>

        <hr className="my-6" />

        <section className="bg-gray-50 p-4 rounded border">
          <h2 className="text-xl font-semibold mb-2">Probar Chatbot</h2>
          <div className="flex space-x-2">
            <input 
              type="text" 
              className="flex-1 border p-2 rounded" 
              placeholder="Escribe un mensaje para probar..."
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
            />
            <button 
              onClick={handleTest}
              disabled={testing || !config.activo}
              className="bg-gray-800 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {testing ? 'Probando...' : 'Enviar'}
            </button>
          </div>
          {testResponse && (
            <div className="mt-4 p-4 bg-white border rounded">
              <strong>Asistente:</strong> <p className="mt-1">{testResponse}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
