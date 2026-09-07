'use client';

import { getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import CustomerForm from '@/components/customers/CustomerForm';

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const fetchCustomers = async (currentPage: number = page) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000';
      
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10');

      const apiUrl = getApiUrl();
      const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${apiUrl}/customers?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': tenantId,
          'x-user-id': userId
        }
      });
      
      const json = await res.json();
      setCustomers(json.data || []);
      setMeta(json.meta || null);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchCustomers(1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const getTypeBadge = (type: string) => {
    const colors = {
      MAYORISTA: 'bg-purple-500/20 text-purple-400',
      MINORISTA: 'bg-orange-500/20 text-orange-400',
      DISTRIBUIDOR: 'bg-blue-500/20 text-blue-400',
      VIP: 'bg-yellow-500/20 text-yellow-400',
      NUEVO: 'bg-green-500/20 text-green-400',
    };
    const css = colors[type as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${css}`}>{type}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Clientes
          </h1>
          <p className="text-sm text-gray-400 mt-1">Directorio principal de empresas y personas facturables.</p>
        </div>
        
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por Nombre, Razón Social o NIT..."
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
                <th className="px-6 py-4">Nombre Comercial</th>
                <th className="px-6 py-4">Razón Social / NIT</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Clasificación</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Cargando clientes...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : customers.map((c: any) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={c.id} 
                  className="hover:bg-gray-800/30 transition-colors group"
                >
                  <td className="px-6 py-4 font-medium text-white">{c.nombreComercial}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300">{c.razonSocial || '-'}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">NIT: {c.nitCi || 'S/N'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300">{c.personaContacto || '-'}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.telefono || c.email || ''}</div>
                  </td>
                  <td className="px-6 py-4">{getTypeBadge(c.tipoCliente)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${c.estado === 'ACTIVO' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/customers/${c.id}`}
                      className="text-blue-500 hover:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Abrir Ficha →
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/50">
            <p className="text-sm text-gray-400">
              Mostrando <span className="text-white font-medium">{(meta.page - 1) * 10 + 1}</span> a <span className="text-white font-medium">{Math.min(meta.page * 10, meta.total)}</span> de <span className="text-white font-medium">{meta.total}</span> clientes
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  fetchCustomers(newPage);
                }}
                disabled={page <= 1}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Anterior
              </button>
              <button 
                onClick={() => {
                  const newPage = Math.min(meta.lastPage, page + 1);
                  setPage(newPage);
                  fetchCustomers(newPage);
                }}
                disabled={page >= meta.lastPage}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <CustomerForm 
          onClose={() => setIsFormOpen(false)} 
          onSaved={() => {
            fetchCustomers();
          }} 
        />
      )}
    </div>
  );
}
