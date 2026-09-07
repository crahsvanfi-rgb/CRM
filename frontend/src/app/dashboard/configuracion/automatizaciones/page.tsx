"use client";

import { apiPath } from '@/lib/api-url';

import React, { useState, useEffect, useCallback } from 'react';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activa: true,
    evento: 'COTIZACION_SIN_RESPUESTA',
    condiciones: '{}',
    accion: 'CREAR_ACTIVIDAD',
    configuracionAccion: '{}'
  });

  const [executions, setExecutions] = useState<any[]>([]);
  const [showExecutions, setShowExecutions] = useState(false);

  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';

      const res = await fetch(apiPath('/automations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      if (!res.ok) throw new Error('Error fetching automations');
      const json = await res.json();
      setAutomations(json.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';

      const url = editingId ? `/api/automations/${editingId}` : '/api/automations';
      const method = editingId ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        condiciones: JSON.parse(formData.condiciones),
        configuracionAccion: JSON.parse(formData.configuracionAccion)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchAutomations();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error guardando la automatización');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta automatización?')) return;
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';
      await fetch(apiPath(`/automations/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      fetchAutomations();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';
      await fetch(apiPath(`/automations/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({ activa: !currentState })
      });
      fetchAutomations();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExecutions = async (id: string) => {
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';
      const res = await fetch(apiPath(`/automations/${id}/executions`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      if (res.ok) {
        const json = await res.json();
        setExecutions(json.items || []);
        setShowExecutions(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeManual = async (id: string) => {
    if (!confirm('¿Forzar ejecución de la regla ahora?')) return;
    try {
      const token = localStorage.getItem('supabase_token') || '';
      const tenantId = localStorage.getItem('tenant_id') || '';
      const res = await fetch(apiPath(`/automations/execute/${id}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      if (res.ok) {
        alert('Ejecución completada');
      } else {
        alert('Error en ejecución manual');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      descripcion: '',
      activa: true,
      evento: 'COTIZACION_SIN_RESPUESTA',
      condiciones: '{"dias": 3}',
      accion: 'CREAR_ACTIVIDAD',
      configuracionAccion: '{"tipoActividad": "SEGUIMIENTO"}'
    });
    setShowModal(true);
  };

  const openEdit = (auto: any) => {
    setEditingId(auto.id);
    setFormData({
      nombre: auto.nombre,
      descripcion: auto.descripcion || '',
      activa: auto.activa,
      evento: auto.evento,
      condiciones: JSON.stringify(auto.condiciones || {}, null, 2),
      accion: auto.accion,
      configuracionAccion: JSON.stringify(auto.configuracionAccion || {}, null, 2)
    });
    setShowModal(true);
  };

  if (loading) return <div className="p-6 text-gray-500">Cargando automatizaciones...</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Automatizaciones</h1>
          <p className="text-gray-500 text-sm">Reglas de negocio automáticas basadas en eventos.</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium shadow">
          + Nueva Regla
        </button>
      </div>

      <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regla</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento / Condición</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {automations.map(auto => (
              <tr key={auto.id} className={!auto.activa ? 'bg-gray-50 opacity-75' : ''}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{auto.nombre}</div>
                  <div className="text-xs text-gray-500">{auto.descripcion}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 rounded-full mb-1">{auto.evento}</span>
                  <div className="text-xs text-gray-400 truncate max-w-xs">{JSON.stringify(auto.condiciones)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700 font-medium">{auto.accion}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleActive(auto.id, auto.activa)}
                    className={`text-xs px-3 py-1 rounded-full font-medium ${auto.activa ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  >
                    {auto.activa ? 'Activa' : 'Inactiva'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <button onClick={() => fetchExecutions(auto.id)} className="text-indigo-600 hover:text-indigo-900">Logs</button>
                  <button onClick={() => executeManual(auto.id)} className="text-blue-600 hover:text-blue-900">Probar</button>
                  <button onClick={() => openEdit(auto)} className="text-gray-600 hover:text-gray-900">Editar</button>
                  <button onClick={() => handleDelete(auto.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                </td>
              </tr>
            ))}
            {automations.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No se han configurado reglas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-xl w-full">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Regla' : 'Nueva Regla'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Nombre</label>
                <input required type="text" className="w-full border rounded p-2 text-sm" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Descripción</label>
                <input type="text" className="w-full border rounded p-2 text-sm" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Evento Disparador</label>
                  <select required className="w-full border rounded p-2 text-sm" value={formData.evento} onChange={e => setFormData({...formData, evento: e.target.value})}>
                    <option value="COTIZACION_SIN_RESPUESTA">Cotización sin respuesta</option>
                    <option value="STOCK_BAJO">Stock bajo límite</option>
                    <option value="PEDIDO_ATRASADO">Pedido atrasado</option>
                    <option value="CLIENTE_INACTIVO">Cliente inactivo</option>
                    <option value="ACTIVIDAD_VENCIDA">Actividad vencida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Acción a Ejecutar</label>
                  <select required className="w-full border rounded p-2 text-sm" value={formData.accion} onChange={e => setFormData({...formData, accion: e.target.value})}>
                    <option value="CREAR_ACTIVIDAD">Crear Actividad</option>
                    <option value="GENERAR_ALERTA">Generar Alerta (Recomendación)</option>
                    <option value="ENVIAR_NOTIFICACION">Log/Notificación Silenciosa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Condiciones (JSON)</label>
                <textarea required rows={3} className="w-full border rounded p-2 text-xs font-mono" value={formData.condiciones} onChange={e => setFormData({...formData, condiciones: e.target.value})} />
                <p className="text-xs text-gray-400 mt-1">Ej: {`{"dias": 3}`}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Configuración Acción (JSON)</label>
                <textarea required rows={3} className="w-full border rounded p-2 text-xs font-mono" value={formData.configuracionAccion} onChange={e => setFormData({...formData, configuracionAccion: e.target.value})} />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded shadow">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOGS */}
      {showExecutions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">Historial de Ejecuciones</h2>
            <div className="flex-1 overflow-auto bg-gray-50 border rounded p-2 space-y-2">
              {executions.length === 0 && <p className="text-sm text-gray-500 p-4">No hay ejecuciones registradas.</p>}
              {executions.map(ex => (
                <div key={ex.id} className="text-xs p-3 bg-white border rounded shadow-sm">
                  <div className="flex justify-between font-bold mb-1">
                    <span className={ex.estado === 'EXITOSO' ? 'text-green-600' : 'text-red-600'}>{ex.estado}</span>
                    <span className="text-gray-400">{new Date(ex.fechaEjecucion).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-700"><span className="font-semibold">Ref:</span> {ex.entidadRef || 'N/A'}</p>
                  {ex.resultado && <p className="text-gray-600 mt-1"><span className="font-semibold">Resultado:</span> {ex.resultado}</p>}
                  {ex.errorMensaje && <p className="text-red-500 mt-1"><span className="font-semibold">Error:</span> {ex.errorMensaje}</p>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowExecutions(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
