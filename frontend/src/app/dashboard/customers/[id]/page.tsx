'use client';

import { apiPath } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Phone, Mail, ShoppingCart, FileText, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import CustomerForm from '@/components/customers/CustomerForm';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [customer, setCustomer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const fetchCustomer = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000';
    
    const res = await fetch(apiPath(`/customers/${id}`), {
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'x-tenant-id': tenantId
      }
    });
    if (res.ok) {
      setCustomer(await res.json());
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  if (!customer) return <div className="p-8 text-gray-500">Cargando ficha comercial...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{customer.nombreComercial}</h1>
              <span className={`px-2 py-1 text-xs font-semibold rounded ${customer.estado === 'ACTIVO' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {customer.estado}
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">
                {customer.tipoCliente}
              </span>
            </div>
            <p className="text-gray-400 mt-1">{customer.razonSocial ? `${customer.razonSocial} | ` : ''}NIT: {customer.nitCi || 'S/N'}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditFormOpen(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Editar Ficha
          </button>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex gap-1 border-b border-gray-800">
        {['resumen', 'actividades', 'notas', 'cotizaciones', 'pedidos'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Contenido de pestañas */}
      <div className="pt-4">
        {activeTab === 'resumen' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna Izquierda: Datos */}
            <div className="col-span-1 space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Contacto Principal</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-gray-300">
                    <User size={16} className="text-gray-500" />
                    <span>{customer.personaContacto || 'No registrado'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone size={16} className="text-gray-500" />
                    <span>{customer.telefono || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail size={16} className="text-gray-500" />
                    <span>{customer.email || 'Sin email'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin size={16} className="text-gray-500" />
                    <span>{[customer.direccion, customer.ciudad, customer.departamento].filter(Boolean).join(', ') || 'Sin ubicación'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Vendedor Asignado</h3>
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <User size={16} className="text-blue-400" />
                  <span>{customer.vendedor?.name || 'No asignado'}</span>
                </div>
              </div>
            </div>

            {/* Columna Central/Derecha: KPIs y Resumen Financiero */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl">
                  <div className="flex items-center gap-3 text-gray-400 mb-2">
                    <ShoppingCart size={18} />
                    <h4 className="font-medium">Total Comprado</h4>
                  </div>
                  <p className="text-3xl font-bold text-white">${customer.resumen?.totalComprado?.toLocaleString() || '0.00'}</p>
                  <p className="text-sm text-gray-500 mt-2">En {customer.resumen?.cantidadPedidos || 0} pedidos históricos</p>
                </div>
                
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl">
                  <div className="flex items-center gap-3 text-gray-400 mb-2">
                    <FileText size={18} />
                    <h4 className="font-medium">Cotizaciones Abiertas</h4>
                  </div>
                  <p className="text-3xl font-bold text-white">{customer.resumen?.cotizacionesAbiertas || 0}</p>
                  <p className="text-sm text-gray-500 mt-2">Esperando cierre</p>
                </div>
              </div>
              
              {/* Notas Rápidas Preview */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                 <h3 className="text-lg font-semibold text-white mb-4">Últimas Notas</h3>
                 {customer.notes?.length > 0 ? (
                   <ul className="space-y-3">
                     {customer.notes.slice(0, 3).map((note: any) => (
                       <li key={note.id} className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-800">
                         <p>{note.nota}</p>
                         <p className="text-xs text-gray-500 mt-2">— {note.usuario?.name || 'Usuario'}, {new Date(note.createdAt).toLocaleDateString()}</p>
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <p className="text-gray-500 text-sm">No hay notas registradas.</p>
                 )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Placeholders visuales para el resto de pestañas del MVP */}
        {activeTab !== 'resumen' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-12 bg-gray-900 border border-gray-800 rounded-xl">
            <h2 className="text-xl font-medium text-white mb-2 capitalize">{activeTab} del Cliente</h2>
            <p className="text-gray-500 text-center max-w-md">
              Esta sección estará completamente habilitada en la siguiente fase de desarrollo de este módulo. 
            </p>
          </motion.div>
        )}
      </div>

      {isEditFormOpen && (
        <CustomerForm 
          initialData={customer}
          onClose={() => setIsEditFormOpen(false)} 
          onSaved={() => {
            fetchCustomer();
          }} 
        />
      )}
    </div>
  );
}
