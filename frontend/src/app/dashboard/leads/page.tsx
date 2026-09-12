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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-gray-500">
            Cargando leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-gray-500">
            No se encontraron leads activos.
          </div>
        ) : leads.map((lead: any) => (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={lead.id}
            className="group rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-blue-500/50 hover:bg-gray-900/80 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-blue-400">{lead.leadId}</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-white">{lead.name}</h2>
                <p className="truncate text-sm text-gray-400">{lead.companyName || 'Sin empresa'}</p>
              </div>
              {getStatusBadge(lead.estado)}
            </div>

            <div className="mt-5 space-y-3 border-t border-gray-800 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3 text-gray-300">
                <span className="text-gray-500">Telefono</span>
                <span className="truncate">{lead.phone || 'Sin registrar'}</span>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Seguimiento</p>
                {getFollowUp(lead)}
              </div>
            </div>

            <Link
              href={`/dashboard/leads/${lead.id}`}
              className="mt-5 flex items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              Ver ficha del lead
            </Link>
          </motion.article>
        ))}
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


