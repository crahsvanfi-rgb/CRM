'use client';

import { getApiUrl } from '@/lib/api-url';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/utils/supabase/client';
import { UserPlus, ExternalLink, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ConversationsPage() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modal Crear Lead state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadCreating, setLeadCreating] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadFormData, setLeadFormData] = useState({
    nombre: '',
    empresa: '',
    telefono: '',
    email: '',
    ciudad: '',
    productoInteres: '',
    observaciones: '',
    estado: 'NUEVO',
  });

  const apiUrl = getApiUrl();

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId =
      session?.user?.user_metadata?.tenant_id ||
      localStorage.getItem('tenantId') ||
      '00000000-0000-0000-0000-000000000000';
    const userId =
      session?.user?.id ||
      localStorage.getItem('userId') ||
      '00000000-0000-0000-0000-000000000000';
    const token = session?.access_token || localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'x-user-id': userId,
    };
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      markAsRead(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoadingList(true);
    try {
      const headers = await getHeaders();
      let url = `${apiUrl}/conversations?limit=50`;
      if (statusFilter) url += `&estado=${statusFilter}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.itemás || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchMessages = async (id: string) => {
    setLoadingMessages(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiUrl}/conversations/${id}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.itemás || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const headers = await getHeaders();
      await fetch(`${apiUrl}/conversations/${id}/mark-read`, {
        method: 'POST',
        headers,
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, estado: c.estado === 'NO_LEIDA' ? 'PENDIENTE' : c.estado } : c,
        ),
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedConvId) return;
    setSending(true);

    const tempMsg = {
      id: Date.now().toString(),
      senderType: 'HUMANO',
      content: inputText,
      fechaEnvio: new Date().toISOString(),
      status: 'PENDIENTE',
    };
    setMessages((prev) => [...prev, tempMsg]);
    const textToSend = inputText;
    setInputText('');

    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiUrl}/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: textToSend }),
      });
      if (!res.ok) {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleRetryTranscription = async (messageId: string) => {
    if (!selectedConvId) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(
        `${apiUrl}/conversations/${selectedConvId}/messages/${messageId}/transcription/retry`,
        {
          method: 'POST',
          headers,
        },
      );
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, transcripcionEstado: 'PENDIENTE' } : m)),
        );
      }
    } catch (error) {
      console.error('Error retrying transcription:', error);
    }
  };

  const handleAction = async (action: 'take-control' | 'return-to-bot' | 'close') => {
    if (!selectedConvId) return;
    try {
      const headers = await getHeaders();
      let body: any = {};
      if (action === 'take-control') {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || localStorage.getItem('userId');
        if (!userId) {
          alert('ID de usuario no encontrado');
          return;
        }
        body = { asesorId: userId };
      }

      const res = await fetch(`${apiUrl}/conversations/${selectedConvId}/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert('Acción realizada con éxito');
        fetchConversations();
        if (action === 'close') setSelectedConvId(null);
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'Desconocido'}`);
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const openLeadModal = () => {
    if (!selectedConv) return;
    setLeadFormData({
      nombre: selectedConv.nombreContacto || 'Contacto WhatsApp',
      empresa: '',
      telefono: selectedConv.contactoId || '',
      email: '',
      ciudad: '',
      productoInteres: '',
      observaciones: selectedConv.ultimoMensaje ? `Mensaje de origen: ${selectedConv.ultimoMensaje}` : '',
      estado: 'NUEVO',
    });
    setLeadError(null);
    setIsLeadModalOpen(true);
  };

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId) return;
    setLeadError(null);
    setLeadCreating(true);

    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiUrl}/conversations/${selectedConvId}/create-lead`, {
        method: 'POST',
        headers,
        body: JSON.stringify(leadFormData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || 'Error al crear el lead');
      }

      alert('¡Lead creado exitosamente!');
      setIsLeadModalOpen(false);
      fetchConversations();
    } catch (err: any) {
      setLeadError(err.message || 'Ocurrióó un error');
    } finally {
      setLeadCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 p-4 pt-16 gap-4">
      {/* Panel Izquierdo: Lista */}
      <div className="w-1/3 bg-gray-900/80 border border-gray-800 flex flex-col rounded-2xl shadow-xl overflow-hidden backdrop-blur">
        <div className="p-4 border-b border-gray-800 bg-gray-800/40 flex justify-between itemás-center">
          <div>
            <h2 className="text-xl font-bold text-white">Bandeja Zernio</h2>
            <p className="text-xs text-gray-400">Mensajes de WhatsApp & Canales</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-700 bg-gray-800 p-1.5 rounded-lg text-xs text-gray-300 focus:outline-none"
          >
            <option value="">Todas</option>
            <option value="NO_LEIDA">No Leídas</option>
            <option value="ABIERTA">Abiertas (Humano)</option>
            <option value="PENDIENTE">Pendientes (Bot)</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60">
          {loadingList ? (
            <div className="p-8 text-center text-gray-500 text-sm">Cargando conversaciones...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No hay conversaciones.</div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-600/15 border-l-4 border-blue-500' : 'hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex justify-between itemás-start mb-1">
                    <span className="font-semibold text-white text-sm truncate max-w-[160px]">
                      {conv.nombreContacto || 'Contacto Desconocido'}
                    </span>
                    {conv.fechaUltimoMensaje && (
                      <span className="text-[11px] text-gray-500 font-mono">
                        {format(new Date(conv.fechaUltimoMensaje), 'HH:mm', { locale: es })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-2">{conv.ultimoMensaje || 'Sin mensajes'}</p>
                  <div className="flex itemás-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-gray-800 text-gray-400">
                      {conv.canal}
                    </span>
                    {conv.leadId && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Lead Asociado
                      </span>
                    )}
                    {conv.clienteId && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Cliente
                      </span>
                    )}
                    {conv.estado === 'NO_LEIDA' && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400">
                        Nueva
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Panel Derecho: Detalle y Chat */}
      <div className="flex-1 bg-gray-900/80 border border-gray-800 flex flex-col rounded-2xl shadow-xl overflow-hidden backdrop-blur">
        {selectedConv ? (
          <>
            {/* Header del Chat */}
            <div className="p-4 border-b border-gray-800 bg-gray-800/40 flex justify-between itemás-center flex-wrap gap-3">
              <div>
                <div className="flex itemás-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedConv.nombreContacto}</h3>
                  {selectedConv.leadId ? (
                    <Link
                      href={`/dashboard/leads/${selectedConv.leadId}`}
                      className="flex itemás-center gap-1 px-2.5 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold transition-colors"
                    >
                      <span>Ver Lead</span>
                      <ExternalLink size={10} />
                    </Link>
                  ) : null}
                </div>
                <p className="text-xs text-emerald-400 font-mono">Tel: {selectedConv.contactoId}</p>
              </div>

              <div className="flex itemás-center gap-2 flex-wrap">
                {!selectedConv.leadId && !selectedConv.clienteId && (
                  <button
                    onClick={openLeadModal}
                    className="flex itemás-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all"
                  >
                    <UserPlus size={14} />
                    <span>+ Crear Lead</span>
                  </button>
                )}

                {selectedConv.modo !== 'HUMANO' ? (
                  <button
                    onClick={() => handleAction('take-control')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Tomar conversación
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('return-to-bot')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Devolver a IA
                  </button>
                )}

                <button
                  onClick={() => handleAction('close')}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold border border-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Aviso de Reunión Agendada Automáticamente */}
            {(() => {
              const hasScheduleIntent =
                messages.some((m) => {
                  const c = (m.content || '').toLowerCase();
                  return ['agendar', 'reunión', 'reunion', 'visita', 'cita', 'mañana', 'agenda', 'coordinar'].some((k) =>
                    c.includes(k)
                  );
                }) ||
                (selectedConv.ultimoMensaje || '').toLowerCase().includes('agendar') ||
                (selectedConv.ultimoMensaje || '').toLowerCase().includes('reunion') ||
                (selectedConv.ultimoMensaje || '').toLowerCase().includes('visita');

              if (!hasScheduleIntent) return null;

              return (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-indigo-950/70 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-base">📅</span>
                    <div>
                      <span className="font-semibold block text-white">Se ha agendado una reunión automáticamente</span>
                      <span className="text-emerald-300/80">Solicitud detectada vía WhatsApp / Zernio</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/activities/calendar"
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                  >
                    <span>Ver en Calendario</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              );
            })()}

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="p-8 text-center text-gray-500 text-sm">Cargando mensajes...</div>
              ) : (
                messages.map((másg) => {
                  const isIncoming = másg.senderType === 'CLIENTE';
                  return (
                    <div key={másg.id} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl p-3.5 shadow-md ${
                          isIncoming
                            ? 'bg-gray-800 border border-gray-700 text-gray-100'
                            : másg.senderType === 'BOT'
                            ? 'bg-blue-900/40 text-blue-100 border border-blue-800'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {másg.senderType !== 'CLIENTE' && (
                          <div
                            className={`text-[10px] mb-1 font-bold uppercase tracking-wider ${
                              másg.senderType === 'BOT' ? 'text-blue-400' : 'text-blue-200'
                            }`}
                          >
                            {másg.senderType === 'BOT' ? '🤖 Asistente IA' : '👤 Vendedor'}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{másg.content}</p>
                        {másg.mediaUrl && (
                          <div className="mt-2">
                            {másg.messageType === 'IMAGEN' ? (
                              <img src={másg.mediaUrl} alt="Adjunto" className="max-w-full rounded-lg" />
                            ) : másg.messageType === 'AUDIO' ? (
                              <div className="flex flex-col space-y-2 w-64">
                                <audio controls src={másg.mediaUrl} className="w-full h-10" />
                                {másg.transcripcionEstado === 'COMPLETADA' && (
                                  <div className="bg-black/30 p-2.5 rounded-lg text-xs italic border-l-2 border-blue-400 text-gray-300">
                                    <span className="font-semibold not-italic block text-[10px] text-gray-400 mb-0.5">
                                      Transcripción:
                                    </span>
                                    {másg.transcription}
                                  </div>
                                )}
                                {másg.transcripcionEstado === 'PENDIENTE' && (
                                  <span className="text-xs text-blue-400 animate-pulse">Transcribiendo...</span>
                                )}
                                {másg.transcripcionEstado === 'ERROR' && (
                                  <div className="flex itemás-center gap-2">
                                    <span className="text-xs text-red-400">Error al transcribir</span>
                                    <button
                                      onClick={() => handleRetryTranscription(másg.id)}
                                      className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30"
                                    >
                                      Reintentar
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <a
                                href={másg.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline text-xs text-blue-300"
                              >
                                Ver archivo adjunto
                              </a>
                            )}
                          </div>
                        )}
                        <div
                          className={`text-[10px] mt-1 text-right font-mono ${
                            isIncoming ? 'text-gray-400' : 'text-blue-200/80'
                          }`}
                        >
                          {format(new Date(másg.fechaEnvio), 'HH:mm', { locale: es })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-gray-900 border-t border-gray-800 flex itemás-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  selectedConv.modo === 'HUMANO'
                    ? 'Escribe un mensaje de respuesta...'
                    : 'Toma la conversación para responder manualmente'
                }
                disabled={selectedConv.modo !== 'HUMANO'}
                className="flex-1 bg-gray-800 border border-gray-700 p-2.5 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending || selectedConv.modo !== 'HUMANO'}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex itemás-center justify-center text-gray-500 text-sm">
            Selecciona una conversación para interactuar
          </div>
        )}
      </div>

      {/* Modal Crear Lead Manualmente */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex itemás-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between itemás-center border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white flex itemás-center gap-2">
                  <UserPlus className="text-purple-400" size={20} />
                  <span>Crear Lead desde Conversación</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Datos precargados del contacto de WhatsApp / Zernio.
                </p>
              </div>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {leadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {leadError}
              </div>
            )}

            <form onSubmit={handleCreateLeadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Nombre Completo *</label>
                <input
                  required
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={leadFormData.nombre}
                  onChange={(e) => setLeadFormData({ ...leadFormData, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Empresa</label>
                  <input
                    type="text"
                    placeholder="Empresa del cliente"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={leadFormData.empresa}
                    onChange={(e) => setLeadFormData({ ...leadFormData, empresa: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Teléfono</label>
                  <input
                    type="tel"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={leadFormData.telefono}
                    onChange={(e) => setLeadFormData({ ...leadFormData, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Email</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Ciudad</label>
                  <input
                    type="text"
                    placeholder="Ciudad"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={leadFormData.ciudad}
                    onChange={(e) => setLeadFormData({ ...leadFormData, ciudad: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Producto de Interés</label>
                  <input
                    type="text"
                    placeholder="Ej. Inversores, Baterías..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={leadFormData.productoInteres}
                    onChange={(e) => setLeadFormData({ ...leadFormData, productoInteres: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Estado Inicial</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={leadFormData.estado}
                    onChange={(e) => setLeadFormData({ ...leadFormData, estado: e.target.value })}
                  >
                    <option value="NUEVO">Nuevo</option>
                    <option value="INTERESADO">Interesado</option>
                    <option value="COTIZACION">Cotización</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Observaciones</label>
                <textarea
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  value={leadFormData.observaciones}
                  onChange={(e) => setLeadFormData({ ...leadFormData, observaciones: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  disabled={leadCreating}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={leadCreating}
                  className="flex itemás-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all"
                >
                  {leadCreating && <Loader2 size={16} className="animate-spin" />}
                  <span>{leadCreating ? 'Creando Lead...' : 'Crear Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
