'use client';

import { getApiUrl } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Copy, Trash2, Edit3, ArrowLeft } from 'lucide-react';

interface Template {
  id: string;
  nombre: string;
  canal?: string;
  categoria?: string;
  cuerpo: string;
  variables?: string[];
  createdAt?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    canal: 'WHATSAPP',
    categoria: 'MARKETING',
    cuerpo: ''
  });

  const apiUrl = getApiUrl();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/campaigns/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : data.items || data.data || []);
      }
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/campaigns/templates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ nombre: '', canal: 'WHATSAPP', categoria: 'MARKETING', cuerpo: '' });
        fetchTemplates();
      } else {
        alert('Error al guardar la plantilla');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleDuplicate = async (id: string) => {
    const item = templates.find((t) => t.id === id);
    if (!item) return;
    try {
      const res = await fetch(`${apiUrl}/campaigns/templates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre: `${item.nombre} (Copia)`,
          canal: item.canal || 'WHATSAPP',
          categoria: item.categoria || 'MARKETING',
          cuerpo: item.cuerpo
        })
      });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar plantilla?')) return;
    try {
      const res = await fetch(`${apiUrl}/campaigns/templates/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const insertVariable = (varName: string) => {
    setFormData(prev => ({ ...prev, cuerpo: prev.cuerpo + ` {{${varName}}}` }));
  };

  const filtered = templates.filter(t => 
    t.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    t.cuerpo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/marketing/campaigns/board" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plantillas de Mensajes</h1>
            <p className="text-muted-foreground mt-1">Crea y gestiona plantillas reutilizables para campañas y automatizaciones</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o contenido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando plantillas...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-semibold text-lg">No hay plantillas registradas</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Crea tu primera plantilla para comenzar a enviar campañas</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Crear Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/50 transition">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground line-clamp-1">{tpl.nombre}</h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {tpl.categoria || 'GENERAL'}
                  </span>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-sm text-foreground/80 font-mono whitespace-pre-wrap line-clamp-5 border border-border/50 mb-4">
                  {tpl.cuerpo}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-muted-foreground">
                <span className="text-xs">Canal: {tpl.canal || 'WhatsApp'}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(tpl.id)}
                    title="Duplicar"
                    className="p-1.5 hover:text-foreground rounded hover:bg-muted transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    title="Eliminar"
                    className="p-1.5 hover:text-red-500 rounded hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Nueva Plantilla</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre de la Plantilla</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Saludo de bienvenida"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Canal</label>
                  <select
                    value={formData.canal}
                    onChange={(e) => setFormData({ ...formData, canal: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="RECORDATORIO">Recordatorio</option>
                    <option value="SEGUIMIENTO">Seguimiento</option>
                    <option value="REACTIVACION">Reactivación</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Cuerpo del Mensaje</label>
                  <div className="flex gap-1">
                    {['nombre', 'empresa', 'telefono', 'ciudad', 'producto', 'precio', 'vendedor'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="text-[10px] bg-muted hover:bg-muted/80 text-foreground px-1.5 py-0.5 rounded font-mono"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  required
                  rows={5}
                  value={formData.cuerpo}
                  onChange={(e) => setFormData({ ...formData, cuerpo: e.target.value })}
                  placeholder="Hola {{nombre}}, tenemos una oferta especial para {{empresa}}..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Guardar Plantilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
