'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Bot, 
  User, 
  AlertCircle, 
  Package, 
  TrendingUp, 
  Bell, 
  Users,
  MessageSquare,
  ArrowRight,
  History
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAuthHeaders, getAuthCredentials } from '@/utils/auth';

interface Message {
  id: string;
  rol: 'USER' | 'ASSISTANT' | 'SYSTEM';
  contenido: string;
  createdAt?: string;
}

interface Conversation {
  id: string;
  titulo?: string;
  createdAt?: string;
  updatedAt?: string;
}

const SUGGESTIONS = [
  {
    icon: TrendingUp,
    title: 'Ventas y Facturación',
    prompt: '¿Cuál es el resumen de ventas de este mes y la comparación con el mes anterior?',
  },
  {
    icon: Users,
    title: 'Historial de Leads (getLeadHistory)',
    prompt: 'Consulta el historial comercial completo y compromisos pendientes del lead o prospecto más reciente.',
  },
  {
    icon: Package,
    title: 'Inventario Crítico',
    prompt: 'Muéstrame los productos con stock bajo o en riesgo de quiebre de stock.',
  },
  {
    icon: Bell,
    title: 'Alertas Comerciales',
    prompt: '¿Qué alertas comerciales y cotizaciones pendientes debo atender hoy?',
  },
  {
    icon: Users,
    title: 'Clientes Destacados',
    prompt: '¿Quiénes son nuestros clientes VIP y cuáles llevan más de 30 días inactivos?',
  },
];

export default function AiAgentPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchConversations = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      let res = await fetch(`${apiUrl}/ai-chat/conversations`, { headers });
      if (!res.ok) {
        res = await fetch('/ai-chat/conversations', { headers });
      }

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setConversations(items);
        if (!currentConvId && items.length > 0) {
          setCurrentConvId(items[0].id);
        }
      }
    } catch (e: any) {
      console.error('Error cargando conversaciones:', e);
    }
  }, [apiUrl, currentConvId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const headers = getAuthHeaders();
      let res = await fetch(`${apiUrl}/ai-chat/conversations/${convId}`, { headers });
      if (!res.ok) {
        res = await fetch(`/ai-chat/conversations/${convId}`, { headers });
      }

      if (res.ok) {
        const data = await res.json();
        setMessages(data.mensajes || []);
      }
    } catch (e: any) {
      console.error('Error cargando mensajes:', e);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (currentConvId) {
      fetchMessages(currentConvId);
    } else {
      setMessages([]);
    }
  }, [currentConvId, fetchMessages]);

  const handleNewConversation = async (initialTitle?: string): Promise<string | null> => {
    setCreating(true);
    setErrorMsg(null);
    try {
      const headers = getAuthHeaders();
      const title = initialTitle || 'Nueva conversación';

      let res = await fetch(`${apiUrl}/ai-chat/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ titulo: title }),
      });

      if (!res.ok) {
        res = await fetch('/ai-chat/conversations', {
          method: 'POST',
          headers,
          body: JSON.stringify({ titulo: title }),
        });
      }

      if (res.ok) {
        const newConv = await res.json();
        setConversations(prev => [newConv, ...prev]);
        setCurrentConvId(newConv.id);
        setMessages([]);
        setTimeout(() => textareaRef.current?.focus(), 100);
        return newConv.id;
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Error al crear la conversación');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error de conexión al crear chat');
    } finally {
      setCreating(false);
    }
    return null;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    setErrorMsg(null);

    let activeId = currentConvId;

    // Si no hay conversación activa, crear una primero automáticamente
    if (!activeId) {
      const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
      activeId = await handleNewConversation(title);
      if (!activeId) {
        setInput(text);
        return;
      }
    }

    // Optimistic UI update
    const tempUserId = 'temp-user-' + Date.now();
    setMessages(prev => [
      ...prev, 
      { id: tempUserId, rol: 'USER', contenido: text }
    ]);
    setLoading(true);

    try {
      const headers = getAuthHeaders();
      let res = await fetch(`${apiUrl}/ai-chat/conversations/${activeId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contenido: text }),
      });

      if (!res.ok) {
        res = await fetch(`/ai-chat/conversations/${activeId}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ contenido: text }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          { id: 'resp-' + Date.now(), rol: 'ASSISTANT', contenido: data.respuesta }
        ]);
        fetchConversations();
      } else {
        const err = await res.json().catch(() => ({}));
        const msgError = err.message || 'Error comunicándose con el agente IA.';
        setErrorMsg(msgError);
        setMessages(prev => [
          ...prev,
          { id: 'err-' + Date.now(), rol: 'SYSTEM', contenido: `⚠️ Error: ${msgError}` }
        ]);
      }
    } catch (e: any) {
      const netError = e.message || 'Error de conexión con el servidor.';
      setErrorMsg(netError);
      setMessages(prev => [
        ...prev,
        { id: 'err-' + Date.now(), rol: 'SYSTEM', contenido: `⚠️ Error de red: ${netError}` }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Deseas eliminar esta conversación?')) return;
    try {
      const headers = getAuthHeaders();
      await fetch(`${apiUrl}/ai-chat/conversations/${id}`, {
        method: 'DELETE',
        headers,
      });

      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        setCurrentConvId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    try {
      const headers = getAuthHeaders();
      await fetch(`${apiUrl}/ai-chat/conversations/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ titulo: editTitle }),
      });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, titulo: editTitle } : c));
    } catch (err) {
      console.error(err);
    } finally {
      setEditingConvId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden">
      {/* Sidebar de Conversaciones */}
      <div className="w-72 bg-card dark:bg-slate-900 border-r border-border dark:border-slate-800 flex flex-col h-full shrink-0">
        {/* Botón Nueva Conversación */}
        <div className="p-4 border-b border-border dark:border-slate-800">
          <button 
            type="button"
            onClick={() => handleNewConversation()}
            disabled={creating}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creando...' : 'Nueva Conversación'}
          </button>
        </div>

        {/* Lista de Historial */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Historial de Consultas
          </div>

          {conversations.map(conv => (
            <div 
              key={conv.id} 
              onClick={() => setCurrentConvId(conv.id)}
              className={`p-3 text-xs rounded-xl cursor-pointer group flex justify-between items-center transition border ${
                currentConvId === conv.id 
                  ? 'bg-primary/10 text-primary border-primary/20 font-semibold' 
                  : 'hover:bg-muted/60 dark:hover:bg-slate-800/60 text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden pr-1 flex-1">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${currentConvId === conv.id ? 'text-primary' : 'text-muted-foreground'}`} />
                {editingConvId === conv.id ? (
                  <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(conv.id);
                        if (e.key === 'Escape') setEditingConvId(null);
                      }}
                      className="w-full text-xs px-1.5 py-0.5 bg-background border border-primary rounded text-foreground focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleRenameSubmit(conv.id)} className="text-emerald-500 hover:text-emerald-600 p-0.5">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingConvId(null)} className="text-muted-foreground hover:text-red-500 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="truncate">{conv.titulo || 'Nueva conversación'}</span>
                )}
              </div>

              {editingConvId !== conv.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingConvId(conv.id);
                      setEditTitle(conv.titulo || '');
                    }}
                    className="p-1 text-muted-foreground hover:text-primary transition"
                    title="Renombrar"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
              <Bot className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
              <p>No tienes chats anteriores.</p>
              <p className="text-[11px]">Escribe tu primera pregunta para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Área Principal del Chat */}
      <div className="flex-1 flex flex-col h-full bg-background dark:bg-slate-950 relative overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border dark:border-slate-800 flex items-center justify-between px-6 bg-card/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-electric-500/10 dark:bg-electric-500/20 text-primary flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Agente IA Comercial & Operativo
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Equipado con herramientas en tiempo real: Leads, Inventario, Clientes y Ventas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Herramientas Conectadas
            </span>
          </div>
        </header>

        {/* Mensajes / Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!currentConvId && conversations.length === 0 ? (
            /* Vista de Bienvenida con Sugerencias */
            <div className="max-w-xl mx-auto my-auto flex flex-col items-center justify-center text-center py-8 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  ¿En qué puedo ayudarte hoy?
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Puedo consultar datos en vivo de ventas, historial y seguimiento de leads, inventario crítico, clientes inactivos o responder cualquier pregunta sobre la operación.
                </p>
              </div>

              {/* Botón Central para Iniciar */}
              <button
                type="button"
                onClick={() => handleNewConversation()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm shadow transition"
              >
                <Plus className="w-4 h-4" />
                Iniciar Nueva Conversación
              </button>

              {/* Tarjetas de Sugerencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-4">
                {SUGGESTIONS.map((sug, idx) => {
                  const Icon = sug.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(sug.prompt)}
                      className="p-3.5 rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-slate-900 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-muted/40 transition group flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition">
                          {sug.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {sug.prompt}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition">
                        Preguntar ahora <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
              <Bot className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Conversación iniciada</p>
              <p className="text-xs max-w-xs">Escribe abajo tu consulta para consultar métricas, leads, clientes o stock en tiempo real.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.rol === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.rol !== 'USER' && (
                  <div className="w-7 h-7 rounded-lg bg-electric-500/10 text-primary flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div 
                  className={`p-4 max-w-[85%] rounded-2xl shadow-sm text-xs leading-relaxed ${
                    msg.rol === 'USER' 
                      ? 'bg-primary text-primary-foreground ml-auto rounded-tr-none' 
                      : msg.rol === 'SYSTEM'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-card dark:bg-slate-900 border border-border dark:border-slate-800 text-foreground mr-auto rounded-tl-none'
                  }`}
                >
                  {msg.rol === 'USER' ? (
                    <div className="whitespace-pre-wrap">{msg.contenido}</div>
                  ) : (
                    <div className="prose prose-xs dark:prose-invert max-w-none space-y-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.contenido}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {msg.rol === 'USER' && (
                  <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-electric-500/10 text-primary flex items-center justify-center shrink-0 mt-1 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
                <span className="ml-1 font-medium">Consultando datos del CRM y analizando...</span>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} className="h-2"></div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-card/60 dark:bg-slate-900/60 border-t border-border dark:border-slate-800 backdrop-blur">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }} 
            className="max-w-4xl mx-auto relative flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentConvId ? "Escribe tu consulta aquí..." : "Escribe una pregunta para iniciar automáticamente una conversación..."}
                disabled={loading}
                className="w-full resize-none rounded-xl border border-border dark:border-slate-800 py-3 pl-4 pr-12 text-xs bg-background dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground transition disabled:opacity-50"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2.5 bottom-2.5 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary transition shadow-sm"
                title="Enviar mensaje"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
          <div className="text-center text-[11px] text-muted-foreground mt-2">
            El Agente IA analiza leads, historial comercial, pedidos, clientes, cotizaciones y stock en tiempo real.
          </div>
        </div>
      </div>
    </div>
  );
}
