import { getApiUrl } from '@/lib/api-url';
import React, { useState, useEffect } from 'react';
import { X, Loader2, Trash2, Edit2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function CategoriesModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('${getApiUrl()}/categories', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000'
        }
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = editId 
        ? `${getApiUrl()}/categories/${editId}`
        : '${getApiUrl()}/categories';
        
      await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000'
        },
        body: JSON.stringify(formData),
      });

      setFormData({ nombre: '', descripcion: '' });
      setEditId(null);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar esta categoría?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${getApiUrl()}/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-tenant-id': session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000'
        },
      });
      fetchCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (cat: any) => {
    setEditId(cat.id);
    setFormData({ nombre: cat.nombre, descripcion: cat.descripcion || '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Gestionar Categorías</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleSubmit} className="flex gap-4 items-start bg-gray-800/50 p-4 rounded-xl border border-gray-800">
            <div className="flex-1 space-y-3">
              <input 
                type="text" 
                placeholder="Nombre de la categoría *" 
                required
                value={formData.nombre} 
                onChange={e => setFormData({...formData, nombre: e.target.value})} 
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Descripción (opcional)" 
                value={formData.descripcion} 
                onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" 
              />
            </div>
            <button disabled={saving} type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap">
              {editId ? 'Guardar' : 'Agregar'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setFormData({nombre:'', descripcion:''}); }} className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                Cancelar
              </button>
            )}
          </form>

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-500" /></div>
          ) : (
            <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900">
              <ul className="divide-y divide-gray-800">
                {categories.length === 0 ? (
                  <li className="p-6 text-center text-gray-500">No hay categorías registradas</li>
                ) : (
                  categories.map(cat => (
                    <li key={cat.id} className="flex justify-between items-center p-4 hover:bg-gray-800/50 transition-colors">
                      <div>
                        <p className="text-white font-medium">{cat.nombre}</p>
                        {cat.descripcion && <p className="text-sm text-gray-400">{cat.descripcion}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(cat)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
