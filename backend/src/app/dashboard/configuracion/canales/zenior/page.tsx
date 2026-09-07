"use client";

import React, { useState, useEffect, useCallback } from 'react';

export default function ZeniorConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    habilitado: false,
    token: '',
    phone_number_id: '',
    page_id: '',
    verify_token: ''
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

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

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/external-channels`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const zeniorConfig = json.find((c: any) => c.canal === 'ZENIOR_FACEBOOK');
        if (zeniorConfig) {
          setConfig(zeniorConfig);
          setFormData({
            habilitado: zeniorConfig.habilitado,
            token: zeniorConfig.configJson?.token || '',
            phone_number_id: zeniorConfig.configJson?.phone_number_id || '',
            page_id: zeniorConfig.configJson?.page_id || '',
            verify_token: zeniorConfig.configJson?.verify_token || ''
          });
        }
      }
    } catch (err: any) {
      console.error('Error cargando configuración de canal:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/external-channels/conversations`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setConversations(json);
      }
    } catch (err) {
      console.error(err);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchConfig();
    fetchConversations();
  }, [fetchConfig, fetchConversations]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        habilitado: formData.habilitado,
        configJson: {
          token: formData.token,
          phone_number_id: formData.phone_number_id,
          page_id: formData.page_id,
          verify_token: formData.verify_token
        }
      };

      const res = await fetch(`${apiUrl}/external-channels/zenior`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Configuración guardada exitosamente');
        fetchConfig();
      } else {
        const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
        alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo conectar con el servidor: ${error.message || 'Error de red'}`);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestResult({ status: 'TESTING', message: 'Probando...' });
      const res = await fetch(`${apiUrl}/external-channels/zenior/test`, {
        method: 'POST',
        headers: getHeaders(true)
      });
      const data = await res.json().catch(() => ({ status: 'ERROR', message: 'Respuesta inválida del servidor' }));
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ status: 'ERROR', message: `No se pudo conectar con el backend: ${err.message}` });
    }
  };

  const viewMessages = async (id: string) => {
    setSelectedConversation(id);
    try {
      const res = await fetch(`${apiUrl}/external-channels/conversations/${id}/messages`, {
        headers: getHeaders()
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Cargando configuración...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* SECCIÓN CONFIGURACIÓN */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Zenior (Facebook/Meta)</h1>
            <p className="text-gray-500 text-sm">Integra el Agente IA con canales externos</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">Habilitado</span>
            <button 
              type="button" 
              onClick={() => setFormData({...formData, habilitado: !formData.habilitado})}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.habilitado ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.habilitado ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-1">Access Token de Meta</label>
            <input 
              type="password" 
              className="w-full border rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
              value={formData.token} 
              onChange={e => setFormData({...formData, token: e.target.value})} 
              placeholder={formData.token === '********' ? '******** (Cifrado)' : 'Escribir token'}
            />
            <p className="text-xs text-gray-400 mt-1">Token de acceso permanente de la app de Meta.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-1">Phone Number ID / Page ID</label>
            <input 
              type="text" 
              className="w-full border rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
              value={formData.phone_number_id} 
              onChange={e => setFormData({...formData, phone_number_id: e.target.value})} 
              placeholder="Ej. 1029384756"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-1">Webhook Verify Token</label>
            <input 
              type="password" 
              className="w-full border rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
              value={formData.verify_token} 
              onChange={e => setFormData({...formData, verify_token: e.target.value})} 
              placeholder={formData.verify_token === '********' ? '******** (Cifrado)' : 'Token secreto para validación del Webhook'}
            />
          </div>

          <div className="pt-4 border-t flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button type="button" onClick={handleTestConnection} className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium transition">
                Probar Conexión
              </button>
              {testResult && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${testResult.status === 'CONECTADO' ? 'bg-green-100 text-green-800' : testResult.status === 'TESTING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {testResult.message}
                </span>
              )}
            </div>
            <button type="submit" className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow transition">
              Guardar
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 border rounded-lg text-sm text-gray-700">
          <p className="font-bold mb-2">Instrucciones para Webhook en Meta Developers:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>URL de Callback: <code className="bg-gray-200 px-1 rounded text-pink-600">https://tudominio.com/api/webhooks/zenior?tenant_id=TU_TENANT_ID</code></li>
            <li>Verify Token: El mismo que configuraste arriba.</li>
            <li>Suscripciones: Seleccionar `messages`.</li>
          </ul>
        </div>
      </div>

      {/* SECCIÓN CONVERSACIONES */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Conversaciones Activas</h2>
        
        {selectedConversation ? (
          <div className="flex flex-col h-full">
            <button onClick={() => setSelectedConversation(null)} className="text-sm text-blue-600 mb-4 hover:underline self-start">← Volver al listado</button>
            <div className="flex-1 border rounded-lg bg-gray-50 p-4 overflow-y-auto space-y-3 h-96">
              {messages.length === 0 && <p className="text-sm text-gray-500 text-center">No hay mensajes.</p>}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direccion === 'SALIENTE' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${msg.direccion === 'SALIENTE' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'}`}>
                    <p>{msg.contenido}</p>
                    <div className={`text-[10px] mt-1 text-right ${msg.direccion === 'SALIENTE' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString()} {msg.direccion === 'SALIENTE' && msg.estadoEnvio}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Mensaje</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversations.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">No hay conversaciones registradas.</td></tr>
                )}
                {conversations.map(conv => (
                  <tr key={conv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{conv.nombreContacto || 'Desconocido'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[150px]">{conv.ultimoMensaje}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => viewMessages(conv.id)} className="text-indigo-600 hover:text-indigo-900">Ver chat</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
