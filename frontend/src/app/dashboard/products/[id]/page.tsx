'use client';

import { getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Box, Tag, Layers, Edit2, Loader2, Package, Archive, Truck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ProductForm from '@/components/products/ProductForm';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [product, setProduct] = useState<any>(null);
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000';
      const headers = {
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'x-tenant-id': tenantId
      };

      const [prodRes, stockRes] = await Promise.all([
        fetch(`${getApiUrl()}/products/${id}`, { headers }),
        fetch(`${getApiUrl()}/products/${id}/stock`, { headers })
      ]);

      if (prodRes.ok) setProduct(await prodRes.json());
      if (stockRes.ok) setStockInfo(await stockRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
  if (!product) return <div className="p-8 text-gray-500">Producto no encontrado.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{product.nombre}</h1>
              <span className="px-2 py-1 bg-gray-800 text-gray-300 font-mono text-xs font-semibold rounded border border-gray-700">
                {product.sku}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded ${product.estado === 'ACTIVO' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {product.estado}
              </span>
            </div>
            <p className="text-gray-400 mt-1">{product.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditFormOpen(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit2 size={16} />
            Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Atributos Comerciales */}
        <div className="col-span-1 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Información Comercial</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1 flex items-center gap-2"><Tag size={14}/> Precio de Venta</p>
                <p className="text-2xl font-bold text-green-400">${Number(product.precioVenta).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Costo Base</p>
                <p className="text-lg font-medium text-white">${product.costoBase ? Number(product.costoBase).toLocaleString() : 'N/A'}</p>
              </div>
              <div className="pt-2 border-t border-gray-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 mb-1">Categoría</p>
                  <p className="text-gray-300 font-medium">{product.categoria?.nombre || 'Ninguna'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Marca</p>
                  <p className="text-gray-300 font-medium">{product.marca || 'S/M'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Unidad</p>
                  <p className="text-gray-300 font-medium">{product.unidad || 'Unidad'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Código Int.</p>
                  <p className="text-gray-300 font-medium font-mono">{product.codigoInterno || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Módulo de Inventario Placeholder */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="text-blue-500" />
            Estado de Inventario
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Disponible */}
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="text-blue-500" size={20} />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Stock Disponible</p>
                <p className="text-3xl font-bold text-white">{stockInfo?.disponible || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Mínimo sugerido: {product.stockMinimo}</p>
              </div>
            </div>

            {/* Reservado */}
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Archive className="text-amber-500" size={20} />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Reservado (Pedidos)</p>
                <p className="text-3xl font-bold text-white">{stockInfo?.reservado || 0}</p>
                <p className="text-xs text-amber-500/70 mt-2">Pendiente de despacho</p>
              </div>
            </div>

            {/* En Tránsito */}
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Truck className="text-purple-500" size={20} />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">En Tránsito</p>
                <p className="text-3xl font-bold text-white">{stockInfo?.enTransito || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Próximas importaciones</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
            <strong>Nota:</strong> Los valores de inventario se activarán automáticamente cuando se implementen los módulos de Inventario y Pedidos.
          </div>
        </div>
      </div>

      {isEditFormOpen && (
        <ProductForm 
          initialData={product}
          onClose={() => setIsEditFormOpen(false)} 
          onSaved={() => fetchData()} 
        />
      )}
    </div>
  );
}
