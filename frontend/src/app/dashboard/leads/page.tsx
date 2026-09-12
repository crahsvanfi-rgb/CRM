'use client';

import { getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, CalendarClock, MessageSquareText } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import LeadForm from '@/components/leads/LeadForm';

export default function LeadsPage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pipelineStages = [
    { key: 'PROSPECTO_NUEVO', label: 'Prospecto nuevo', color: 'border-slate-500/40' },
    { key: 'CONTACTO_REALIZADO', label: 'Contacto realizado', color: 'border-blue-500/40' },
    { key: 'CLIENTE_CALIFICADO', label: 'Cliente calificado', color: 'border-cyan-500/40' },
    { key: 'COTIZACION_ENVIADA', label: 'Cotización enviada', color: 'border-amber-500/40' },
    { key: 'NEGOCIACION', label: 'Negociación', color: 'border-purple-500/40' },
    { key: 'CIERRE_GANADO', label: 'Cierre ganado', color: 'border-emerald-500/40' },
    { key: 'CIERRE_PERDIDO', label: 'Cierre perdido', color: 'border-red-500/40' },
  ];
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const moveLead = async (leadId: string, etapaVenta: string) => {
    const current = leads.find((lead) => lead.id === leadId);
    if (!current || current.etapaVenta === etapaVenta) return;
    setLeads((items) => items.map((lead) => lead.id === leadId ? { ...lead, etapaVenta } : lead));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${getApiUrl()}/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': tenantId,
          'x-user-id': session?.user?.id || '00000000-0000-0000-0000-000000000000',
        },
        body: JSON.stringify({ etapaVenta }),
      });
      if (!response.ok) throw new Error('No se pudo guardar la etapa');
    } catch (error) {
      console.error('Error moviendo lead:', error);
      fetchLeads();
    } finally {
      setDraggedLeadId(null);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000';
      
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);

      const res = await fetch(`${getApiUrl()}/leads?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': tenantId, 'x-user-id': session?.user?.id || '00000000-0000-0000-0000-000000000000'
        }
      });
      
      const json = await res.json();
      setLeads(json.data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly
    const timeoutId = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const getStatusBadge = (status: string) => {
    const colors = {
      NUEVO: 'bg-blue-500/20 text-blue-400',
      CONTACTADO: 'bg-yellow-500/20 text-yellow-400',
      GANADO: 'bg-green-500/20 text-green-400',
      PERDIDO: 'bg-red-500/20 text-red-400',
    };
    const css = colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${css}`}>{status}</span>;
  };


  const getFollowUp = (lead: any) => {
    const touchpoint = lead.touchpoints?.[0];
    const activity = lead.agendaActivities?.[0];
    const nextDate = touchpoint?.fechaRecontacto || lead.proximoSeguimiento || activity?.fecha;
    const summary = touchpoint?.compromisosPendientes || touchpoint?.resumen || activity?.titulo || activity?.descripcion;
    if (!nextDate && !summary) return <span className="text-gray-500">Sin seguimiento</span>;
    return (
      <div className="min-w-[190px] space-y-1">
        <div className="flex items-center gap-1.5 text-gray-200"><MessageSquareText size={14} className="text-blue-400 shrink-0" /><span className="truncate max-w-[240px]" title={summary || undefined}>{summary || 'Interaccion registrada'}</span></div>
        {nextDate && <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CalendarClock size={13} className="shrink-0" /><span>{new Date(nextDate).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Leads Comerciales
          </h1>
          <p className="text-sm text-gray-400 mt-1">Gestiona tus prospectos y oportunidades de venta.</p>
        </div>
        
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          <span>Nuevo Lead</span>
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition-colors">
          <Filter size={18} />
          <span>Filtros</span>
        </button>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-[1540px] gap-4">
          {pipelineStages.map((stage) => {
            const stageLeads = leads.filter((lead) => (lead.etapaVenta || 'PROSPECTO_NUEVO') === stage.key);
            return (
              <section
                key={stage.key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const leadId = event.dataTransfer.getData('text/plain');
                  if (leadId) moveLead(leadId, stage.key);
                }}
                className={`w-[210px] shrink-0 rounded-xl border-t-2 ${stage.color} border-x border-b border-gray-800 bg-gray-950/60 p-3`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">{stage.label}</h2>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{stageLeads.length}</span>
                </div>
                <div className="min-h-[420px] space-y-3">
                  {loading ? (
                    <p className="py-8 text-center text-xs text-gray-500">Cargando...</p>
                  ) : stageLeads.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-800 px-2 py-8 text-center text-xs text-gray-600">Arrastra un lead aqui</p>
                  ) : stageLeads.map((lead: any) => (
                    <motion.article
                      key={lead.id}
                      draggable
                      onDragStart={(event) => {
                        const dragEvent = event as unknown as React.DragEvent<HTMLElement>;
                        dragEvent.dataTransfer.setData('text/plain', lead.id);
                        dragEvent.dataTransfer.effectAllowed = 'move';
                        setDraggedLeadId(lead.id);
                      }}
                      onDragEnd={() => setDraggedLeadId(null)}
                      animate={{ opacity: draggedLeadId === lead.id ? 0.45 : 1 }}
                      className="cursor-grab rounded-lg border border-gray-800 bg-gray-900 p-3 shadow-lg transition-colors hover:border-blue-500/50 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] text-blue-400">{lead.leadId}</p>
                          <h3 className="truncate text-sm font-semibold text-white">{lead.name}</h3>
                          <p className="truncate text-xs text-gray-500">{lead.companyName || 'Sin empresa'}</p>
                        </div>
                        <span className="text-gray-600" title="Arrastrar para cambiar de etapa">::</span>
                      </div>
                      <div className="mt-3 border-t border-gray-800 pt-3">
                        <p className="text-xs text-gray-500">Seguimiento</p>
                        <div className="mt-1 text-xs">{getFollowUp(lead)}</div>
                      </div>
                      <Link href={`/dashboard/leads/${lead.id}`} className="mt-3 block text-xs font-medium text-blue-400 hover:text-blue-300">
                        Ver ficha
                      </Link>
                    </motion.article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {isFormOpen && (
        <LeadForm 
          onClose={() => setIsFormOpen(false)} 
          onSaved={() => {
            fetchLeads();
          }} 
        />
      )}
    </div>
  );
}


