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

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-4">Codigo</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Telefono</th>
                <th className="px-6 py-4">Seguimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Cargando leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron leads activos.
                  </td>
                </tr>
              ) : leads.map((lead: any) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={lead.id} 
                  className="hover:bg-gray-800/30 transition-colors group"
                >
                  <td className="px-6 py-4 font-mono text-blue-400">{lead.leadId}</td>
                  <td className="px-6 py-4 font-medium text-white">{lead.name}</td>
                  <td className="px-6 py-4">{lead.companyName || '-'}</td>
                  <td className="px-6 py-4">{lead.phone || '-'}</td>
                  <td className="px-6 py-4">{getFollowUp(lead)}</td>
                  <td className="px-6 py-4">{getStatusBadge(lead.estado)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-blue-500 hover:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Ver detalle Ã¢â€ â€™
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
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


