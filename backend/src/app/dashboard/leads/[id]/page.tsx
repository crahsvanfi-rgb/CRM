'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building,
  MapPin,
  User,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  FileText,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

type Touchpoint = {
  id: string;
  canal: 'LLAMADA' | 'WHATSAPP' | 'EMAIL' | 'REUNION' | 'FORMULARIO' | 'OTRO';
  fecha: string;
  participanteInterno?: string | null;
  participanteExterno?: string | null;
  resumen?: string | null;
  objeciones?: string | null;
  puntosInteres?: string | null;
  preferenciasContacto?: string | null;
  materialEnviado?: any;
  materialAbierto: boolean;
  respuestaMaterial?: string | null;
  etapa: string;
  compromisosPendientes?: string | null;
  fechaRecontacto?: string | null;
  createdAt: string;
};

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [lead, setLead] = useState<any>(null);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historial' | 'info'>('historial');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTouchpoint, setEditingTouchpoint] = useState<Touchpoint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    canal: 'WHATSAPP' as Touchpoint['canal'],
    fecha: new Date().toISOString().slice(0, 16),
    etapa: 'CONTACTO_INICIAL',
    participanteInterno: '',
    participanteExterno: '',
    resumen: '',
    objeciones: '',
    puntosInteres: '',
    preferenciasContacto: '',
    materialEnviado: '',
    materialAbierto: false,
    respuestaMaterial: '',
    compromisosPendientes: '',
    fechaRecontacto: '',
  });

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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();

      const [leadRes, tpRes] = await Promise.all([
        fetch(`${apiUrl}/leads/${id}`, { headers }),
        fetch(`${apiUrl}/leads/${id}/touchpoints`, { headers }),
      ]);

      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLead(leadData);
      }
      if (tpRes.ok) {
        const tpData = await tpRes.json();
        setTouchpoints(tpData);
      }
    } catch (err) {
      console.error('Error cargando lead:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const openCreateModal = () => {
    setEditingTouchpoint(null);
    setFormData({
      canal: 'WHATSAPP',
      fecha: new Date().toISOString().slice(0, 16),
      etapa: lead?.estado === 'NUEVO' ? 'CONTACTO_INICIAL' : 'NEGOCIACION',
      participanteInterno: lead?.vendedor?.name || '',
      participanteExterno: lead?.name || '',
      resumen: '',
      objeciones: '',
      puntosInteres: lead?.productoInteres || '',
      preferenciasContacto: '',
      materialEnviado: '',
      materialAbierto: false,
      respuestaMaterial: '',
      compromisosPendientes: '',
      fechaRecontacto: '',
    });
    setActionError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tp: Touchpoint) => {
    setEditingTouchpoint(tp);
    setFormData({
      canal: tp.canal,
      fecha: tp.fecha ? new Date(tp.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      etapa: tp.etapa || 'PROSPECTO',
      participanteInterno: tp.participanteInterno || '',
      participanteExterno: tp.participanteExterno || '',
      resumen: tp.resumen || '',
      objeciones: tp.objeciones || '',
      puntosInteres: tp.puntosInteres || '',
      preferenciasContacto: tp.preferenciasContacto || '',
      materialEnviado: typeof tp.materialEnviado === 'string' ? tp.materialEnviado : JSON.stringify(tp.materialEnviado || ''),
      materialAbierto: tp.materialAbierto || false,
      respuestaMaterial: tp.respuestaMaterial || '',
      compromisosPendientes: tp.compromisosPendientes || '',
      fechaRecontacto: tp.fechaRecontacto ? new Date(tp.fechaRecontacto).toISOString().slice(0, 16) : '',
    });
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleSaveTouchpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      const headers = await getHeaders();
      const payload: any = {
        canal: formData.canal,
        fecha: new Date(formData.fecha).toISOString(),
        etapa: formData.etapa,
        participanteInterno: formData.participanteInterno.trim() || undefined,
        participanteExterno: formData.participanteExterno.trim() || undefined,
        resumen: formData.resumen.trim(),
        objeciones: formData.objeciones.trim() || undefined,
        puntosInteres: formData.puntosInteres.trim() || undefined,
        preferenciasContacto: formData.preferenciasContacto.trim() || undefined,
        materialEnviado: formData.materialEnviado.trim() ? formData.materialEnviado.trim() : undefined,
        materialAbierto: formData.materialAbierto,
        respuestaMaterial: formData.respuestaMaterial.trim() || undefined,
        compromisosPendientes: formData.compromisosPendientes.trim() || undefined,
        fechaRecontacto: formData.fechaRecontacto ? new Date(formData.fechaRecontacto).toISOString() : undefined,
      };

      const url = editingTouchpoint
        ? `${apiUrl}/leads/${id}/touchpoints/${editingTouchpoint.id}`
        : `${apiUrl}/leads/${id}/touchpoints`;
      const method = editingTouchpoint ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Error al guardar interacción');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Error guardando touchpoint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTouchpoint = async (touchpointId: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro del historial?')) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiUrl}/leads/${id}/touchpoints/${touchpointId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('No se pudo eliminar la interacción');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertLead = async () => {
    if (!confirm('¿Deseas convertir este Lead en Cliente activo?')) return;
    try {
      setConverting(true);
      const headers = await getHeaders();
      const res = await fetch(`${apiUrl}/leads/${id}/convert`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        alert('¡Lead convertido exitosamente a Cliente!');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al convertir');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConverting(false);
    }
  };

  const getCanalBadge = (canal: Touchpoint['canal']) => {
    switch (canal) {
      case 'WHATSAPP':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <MessageSquare size={12} /> WhatsApp
          </span>
        );
      case 'LLAMADA':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Phone size={12} /> Llamada
          </span>
        );
      case 'EMAIL':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Mail size={12} /> Email
          </span>
        );
      case 'REUNION':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Users size={12} /> Reunión
          </span>
        );
      case 'FORMULARIO':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <FileText size={12} /> Formulario
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Otro
          </span>
        );
    }
  };

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case 'GANADO':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'PERDIDO':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'COTIZACION_ENVIADA':
      case 'NEGOCIACION':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'DEMO':
      case 'CONTACTO_INICIAL':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    }
  };

  if (loading && !lead) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 size={36} className="text-blue-500 animate-spin" />
        <p className="text-gray-400">Cargando perfil comercial y memoria del lead...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No se encontró información para este prospecto.</p>
        <Link href="/dashboard/leads" className="text-blue-400 mt-2 inline-block">
          Volver a Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900/60 backdrop-blur border border-gray-800/80 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/leads"
            className="p-2.5 bg-gray-800/80 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shadow"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-white">{lead.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getEtapaColor(lead.estado)}`}>
                {lead.estado}
              </span>
              <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {lead.leadId}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {lead.companyName || 'Sin empresa'} • Fuente: <span className="text-gray-300 font-medium">{lead.fuente || 'Directo'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all text-sm"
          >
            <Plus size={16} />
            <span>Registrar Interacción</span>
          </button>

          {lead.estado !== 'GANADO' && (
            <button
              onClick={handleConvertLead}
              disabled={converting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm disabled:opacity-50"
            >
              {converting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>Convertir a Cliente</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'historial'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Historial de Seguimiento ({touchpoints.length})
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'info'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Detalles de Contacto
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-white border-b border-gray-800 pb-2 flex items-center gap-2">
              <User size={16} className="text-blue-400" /> Datos Comerciales
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 text-gray-300">
                <Building size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Empresa</p>
                  <p className="font-medium text-white">{lead.companyName || 'Sin especificar'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <Phone size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Teléfono / WhatsApp</p>
                  <p className="font-mono text-emerald-400">{lead.phone || 'Sin registrar'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <Mail size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-gray-200">{lead.email || 'Sin registrar'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <MapPin size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Ciudad</p>
                  <p className="text-gray-200">{lead.ciudad || 'Sin registrar'}</p>
                </div>
              </div>

              {lead.productoInteres && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Producto de Interés</p>
                  <p className="text-sm font-medium text-white mt-1">{lead.productoInteres}</p>
                </div>
              )}

              {lead.observaciones && (
                <div className="p-3 bg-gray-800/60 rounded-xl text-xs text-gray-300">
                  <p className="text-gray-400 font-medium mb-1">Notas Iniciales:</p>
                  <p className="italic">{lead.observaciones}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-white border-b border-gray-800 pb-2">Vendedor Responsable</h3>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                {lead.vendedor?.name?.charAt(0) || 'V'}
              </div>
              <div>
                <p className="font-medium text-white">{lead.vendedor?.name || 'No asignado'}</p>
                <p className="text-xs text-gray-500">{lead.vendedor?.email || 'Sin correo'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Timeline Section */}
        <div className="col-span-1 lg:col-span-2">
          {activeTab === 'historial' ? (
            <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Memoria Comercial del Lead</h2>
                  <p className="text-xs text-gray-400">Registro cronológico de interacciones, objeciones y acuerdos.</p>
                </div>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors"
                >
                  <Plus size={14} /> Nueva Interacción
                </button>
              </div>

              {touchpoints.length === 0 ? (
                <div className="py-16 text-center text-gray-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                    <MessageSquare size={24} />
                  </div>
                  <p className="text-sm">Aún no hay interacciones registradas para este lead.</p>
                  <button
                    onClick={openCreateModal}
                    className="text-xs text-blue-400 hover:underline font-medium"
                  >
                    + Registrar primera llamada, mensaje o reunión
                  </button>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-gray-800">
                  {touchpoints.map((tp, idx) => (
                    <motion.div
                      key={tp.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative pl-10 group"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-2 -translate-x-1/2 w-4 h-4 rounded-full bg-gray-900 border-2 border-blue-500 group-hover:scale-125 transition-transform" />

                      <div className="bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/60 rounded-xl p-5 space-y-3 transition-colors shadow-md">
                        {/* Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700/40 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getCanalBadge(tp.canal)}
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getEtapaColor(tp.etapa)}`}>
                              {tp.etapa}
                            </span>
                            {(tp.participanteInterno || tp.participanteExterno) && (
                              <span className="text-xs text-gray-400">
                                {tp.participanteInterno && <span className="text-gray-300 font-medium">{tp.participanteInterno}</span>}
                                {tp.participanteInterno && tp.participanteExterno && ' ↔ '}
                                {tp.participanteExterno && <span className="text-gray-400 italic">({tp.participanteExterno})</span>}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                              <Clock size={12} />
                              {new Date(tp.fecha).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(tp)}
                                className="p-1 hover:text-blue-400 text-gray-400 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTouchpoint(tp.id)}
                                className="p-1 hover:text-red-400 text-gray-400 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Resumen */}
                        {tp.resumen && (
                          <p className="text-sm text-gray-200 leading-relaxed font-normal">
                            {tp.resumen}
                          </p>
                        )}

                        {/* Objeciones y Puntos de Interés */}
                        {(tp.objeciones || tp.puntosInteres) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {tp.objeciones && (
                              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                                <p className="text-amber-400 font-semibold mb-0.5 flex items-center gap-1">
                                  <AlertCircle size={12} /> Objeción detectada:
                                </p>
                                <p className="text-gray-300">{tp.objeciones}</p>
                              </div>
                            )}

                            {tp.puntosInteres && (
                              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs">
                                <p className="text-blue-400 font-semibold mb-0.5 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Interés clave:
                                </p>
                                <p className="text-gray-300">{tp.puntosInteres}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Material Enviado & Próximos pasos */}
                        {(tp.materialEnviado || tp.compromisosPendientes || tp.fechaRecontacto) && (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-gray-700/30">
                            {tp.materialEnviado && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <FileText size={14} className="text-purple-400" />
                                <span>Material: <strong className="text-white">{String(tp.materialEnviado)}</strong></span>
                                {tp.materialAbierto ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-semibold">Abierto</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-[10px]">No abierto</span>
                                )}
                              </div>
                            )}

                            {tp.compromisosPendientes && (
                              <div className="text-gray-300">
                                <span className="text-gray-400">Compromiso:</span> <strong className="text-amber-300">{tp.compromisosPendientes}</strong>
                              </div>
                            )}

                            {tp.fechaRecontacto && (
                              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                <Calendar size={13} />
                                <span>Recontacto: {new Date(tp.fechaRecontacto).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white">Configuración del Prospecto</h2>
              <p className="text-sm text-gray-400">Información técnica y detalles de registro en el CRM.</p>
              <div className="grid grid-cols-2 gap-4 text-sm pt-4">
                <div className="p-3 bg-gray-800/40 rounded-xl">
                  <p className="text-xs text-gray-500">ID de Sistema</p>
                  <p className="font-mono text-xs text-gray-300 break-all">{lead.id}</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-xl">
                  <p className="text-xs text-gray-500">Fecha de Creación</p>
                  <p className="text-xs text-gray-300">{new Date(lead.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Registrar / Editar Touchpoint */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur z-10">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingTouchpoint ? 'Editar Interacción Comercial' : 'Registrar Nueva Interacción'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Almacena la memoria comercial para que todo el equipo y el agente IA conozcan el contexto.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {actionError && (
                <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSaveTouchpoint} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Canal *</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.canal}
                      onChange={(e) => setFormData({ ...formData, canal: e.target.value as any })}
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="LLAMADA">Llamada Telefónica</option>
                      <option value="EMAIL">Correo Electrónico</option>
                      <option value="REUNION">Reunión Presencial/Meet</option>
                      <option value="FORMULARIO">Formulario Web</option>
                      <option value="OTRO">Otro Canal</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Fecha y Hora *</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Etapa Comercial</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.etapa}
                      onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
                    >
                      <option value="PROSPECTO">Prospecto</option>
                      <option value="CONTACTO_INICIAL">Contacto Inicial</option>
                      <option value="DEMO">Demo / Presentación</option>
                      <option value="COTIZACION_ENVIADA">Cotización Enviada</option>
                      <option value="NEGOCIACION">Negociación</option>
                      <option value="GANADO">Ganado</option>
                      <option value="PERDIDO">Perdido</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Participante Interno (Vendedor)</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez (Asesor)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.participanteInterno}
                      onChange={(e) => setFormData({ ...formData, participanteInterno: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Participante Externo (Cliente)</label>
                    <input
                      type="text"
                      placeholder="Ej. Ing. Ramos (Gerente Compras)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.participanteExterno}
                      onChange={(e) => setFormData({ ...formData, participanteExterno: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Resumen de la Interacción *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="¿De qué hablaron? ¿Qué se acordó? Ej. Se contactó por WhatsApp para aclarar dudas sobre tiempos de entrega y garantía..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                    value={formData.resumen}
                    onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-amber-400">Objeciones planteadas</label>
                    <input
                      type="text"
                      placeholder="Ej. Considera el precio un 10% más alto que X marca"
                      className="w-full bg-gray-800 border border-amber-500/30 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                      value={formData.objeciones}
                      onChange={(e) => setFormData({ ...formData, objeciones: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-400">Puntos de Interés / Requerimientos</label>
                    <input
                      type="text"
                      placeholder="Ej. Entrega inmediata, soporte técnico local"
                      className="w-full bg-gray-800 border border-blue-500/30 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.puntosInteres}
                      onChange={(e) => setFormData({ ...formData, puntosInteres: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Material Enviado (PDF, Propuesta, Enlace)</label>
                    <input
                      type="text"
                      placeholder="Ej. Catálogo_2026.pdf / Cotización #104"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.materialEnviado}
                      onChange={(e) => setFormData({ ...formData, materialEnviado: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.materialAbierto}
                        onChange={(e) => setFormData({ ...formData, materialAbierto: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-700"
                      />
                      <span>¿El cliente abrió/revisó el material?</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Compromisos Pendientes / Próximos Pasos</label>
                    <input
                      type="text"
                      placeholder="Ej. Enviar muestra técnica el día jueves"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={formData.compromisosPendientes}
                      onChange={(e) => setFormData({ ...formData, compromisosPendientes: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-400">Fecha de Recontacto Programada</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-gray-800 border border-emerald-500/30 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                      value={formData.fechaRecontacto}
                      onChange={(e) => setFormData({ ...formData, fechaRecontacto: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    <span>{editingTouchpoint ? 'Actualizar Registro' : 'Guardar Interacción'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
