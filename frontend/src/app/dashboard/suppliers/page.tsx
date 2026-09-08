'use client';

import { apiPath } from '@/lib/api-url';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', pais: '', contacto: '', email: '', telefono: '', direccion: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiPath('/suppliers'), {
        headers: { 'x-tenant-id': 'test-tenant' } // TODO: Use dynamic tenant
      });
      if (!res.ok) throw new Error('Error al cargar proveedores');
      const data = await res.json();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? apiPath(`/suppliers/${editingId}`) : apiPath('/suppliers');
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'test-tenant'
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Error al guardar proveedor');
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ nombre: '', pais: '', contacto: '', email: '', telefono: '', direccion: '' });
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    }
  };

  const handleEdit = (supp: any) => {
    setFormData({
      nombre: supp.nombre,
      pais: supp.pais || '',
      contacto: supp.contacto || '',
      email: supp.email || '',
      telefono: supp.telefono || '',
      direccion: supp.direccion || ''
    });
    setEditingId(supp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este proveedor?')) return;
    try {
      const res = await fetch(apiPath(`/suppliers/${id}`), {
        method: 'DELETE',
        headers: { 'x-tenant-id': 'test-tenant' }
      });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
        <button 
          onClick={() => {
            setFormData({ nombre: '', pais: '', contacto: '', email: '', telefono: '', direccion: '' });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + Nuevo Proveedor
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">País</label>
                <input type="text" value={formData.pais} onChange={e => setFormData({...formData, pais: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contacto</label>
                <input type="text" value={formData.contacto} onChange={e => setFormData({...formData, contacto: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">Cancelar</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">País</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.pais}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{s.contacto}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
