'use client';

import { getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Tag, Box, Edit2, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ProductForm from '@/components/products/ProductForm';
import CategoriesModal from '@/components/products/CategoriesModal';

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  const fetchProducts = async (currentPage: number = page) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10');

      const res = await fetch(`${getApiUrl()}/products?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000'
        }
      });
      
      const json = await res.json();
      setProducts(json.data || []);
      setMeta(json.meta || null);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchProducts(1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Catálogo de Productos</h1>
          <p className="text-gray-400 mt-1">Gestiona los productos que ofreces y sus categorías.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCategoriesOpen(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors flex items-center gap-2 border border-gray-700"
          >
            <Tag size={18} />
            Categorías
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por SKU, Nombre o Código Interno..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase bg-gray-800/50 text-gray-300 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Nombre del Producto</th>
                <th className="px-6 py-4 font-medium">Categoría</th>
                <th className="px-6 py-4 font-medium">Precio Venta</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-4 text-gray-500">Cargando catálogo...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Box className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-lg text-gray-300 font-medium mb-1">No se encontraron productos</p>
                    <p className="text-gray-500">Empieza agregando tu primer producto al catálogo.</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded text-xs">{product.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{product.nombre}</span>
                        {product.marca && <span className="text-xs text-gray-500">{product.marca}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.categoria?.nombre ? (
                         <span className="flex items-center gap-2">
                           <Tag size={14} className="text-gray-500" />
                           {product.categoria.nombre}
                         </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      ${Number(product.precioVenta).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        product.estado === 'ACTIVO' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {product.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/products/${product.id}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/50">
            <p className="text-sm text-gray-400">
              Mostrando <span className="text-white font-medium">{(meta.page - 1) * 10 + 1}</span> a <span className="text-white font-medium">{Math.min(meta.page * 10, meta.total)}</span> de <span className="text-white font-medium">{meta.total}</span> productos
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  fetchProducts(newPage);
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
                  fetchProducts(newPage);
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
        <ProductForm onClose={() => setIsFormOpen(false)} onSaved={() => fetchProducts(page)} />
      )}

      {isCategoriesOpen && (
        <CategoriesModal onClose={() => setIsCategoriesOpen(false)} />
      )}
    </div>
  );
}
