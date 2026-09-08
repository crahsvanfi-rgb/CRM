import { apiPath } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Tag } from 'lucide-react';

export default function ProductForm({ onClose, onSaved, initialData }: { onClose: () => void, onSaved: () => void, initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    sku: initialData?.sku || '',
    codigoInterno: initialData?.codigoInterno || '',
    nombre: initialData?.nombre || '',
    descripcion: initialData?.descripcion || '',
    categoriaId: initialData?.categoriaId || '',
    marca: initialData?.marca || '',
    unidad: initialData?.unidad || '',
    precioVenta: initialData?.precioVenta || 0,
    costoBase: initialData?.costoBase || 0,
    stockMinimo: initialData?.stockMinimo || 0,
    estado: initialData?.estado || 'ACTIVO',
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(apiPath('/categories'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isEditing = !!initialData;
      const url = isEditing 
        ? apiPath(`/products/${initialData.id}`)
        : apiPath('/products');
        
      const payload = {
        ...formData,
        precioVenta: Number(formData.precioVenta),
        costoBase: Number(formData.costoBase),
        stockMinimo: Number(formData.stockMinimo),
      };

      if (!payload.categoriaId) delete payload.categoriaId;

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al guardar el producto');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white">{initialData ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nombre del Producto *</label>
              <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Ej. Zapatillas Nike Air" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">SKU (Único) *</label>
              <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors uppercase" placeholder="PROD-001" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Categoría</label>
              <select value={formData.categoriaId} onChange={e => setFormData({...formData, categoriaId: e.target.value})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors">
                <option value="">Sin categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Marca</label>
              <input type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Descripción</label>
            <textarea rows={3} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Precio Venta ($) *</label>
              <input required type="number" step="0.01" min="0" value={formData.precioVenta} onChange={e => setFormData({...formData, precioVenta: Number(e.target.value)})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Costo Base ($)</label>
              <input type="number" step="0.01" min="0" value={formData.costoBase} onChange={e => setFormData({...formData, costoBase: Number(e.target.value)})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Stock Mínimo</label>
              <input type="number" min="0" value={formData.stockMinimo} onChange={e => setFormData({...formData, stockMinimo: Number(e.target.value)})} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-5 py-2 text-gray-300 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {initialData ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
