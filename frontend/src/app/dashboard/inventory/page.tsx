'use client';

import { getApiUrl } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  Loader2, 
  History,
  CheckCircle2,
  DollarSign,
  Layers
} from 'lucide-react';

export default function InventorySummaryPage() {

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockBajo, setStockBajo] = useState(false);

  // Modal Nuevo Producto State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    sku: '',
    precioVenta: '',
    costoBase: '',
    stockMinimo: '0',
    unidad: 'PZA',
    descripcion: '',
  });

  const apiUrl = getApiUrl();


  const fetchInventory = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const url = new URL(`${apiUrl}/inventory/stock-summary`);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '50');
      if (search) url.searchParams.append('search', search);
      if (stockBajo) url.searchParams.append('stockBajo', 'true');

      const res = await fetch(url.toString(), { headers, cache: 'no-store' });
      if (!res.ok) throw new Error('Error al cargar inventario');

      const data = await res.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, stockBajo]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const headers = getAuthHeaders();

      const payload: Record<string, any> = {
        nombre: formData.nombre.trim(),
      };

      if (formData.sku.trim()) payload.sku = formData.sku.trim();
      if (formData.precioVenta !== '') payload.precioVenta = Number(formData.precioVenta);
      if (formData.costoBase !== '') payload.costoBase = Number(formData.costoBase);
      if (formData.stockMinimo !== '') payload.stockMinimo = Number(formData.stockMinimo);
      if (formData.unidad.trim()) payload.unidad = formData.unidad.trim();
      if (formData.descripcion.trim()) payload.descripcion = formData.descripcion.trim();

      const res = await fetch(`${apiUrl}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
        throw new Error(msg || 'Error al registrar el producto');
      }

      setSuccessMessage(`Producto "${json.nombre}" creado exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);

      setIsModalOpen(false);
      setFormData({
        nombre: '',
        sku: '',
        precioVenta: '',
        costoBase: '',
        stockMinimo: '0',
        unidad: 'PZA',
        descripcion: '',
      });

      await fetchInventory();
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      setFormError(err.message || 'Error inesperado al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Acciones Principales */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="w-6 h-6 text-primary" />
            <span>Inventario / Resumen de Stock</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Control en vivo de existencias físicas, stock reservado y unidades disponibles.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/dashboard/inventory/movements" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl transition border border-border">
              <History size={14} />
              <span>Ver Movimientos</span>
            </button>
          </Link>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow transition"
          >
            <Plus size={16} />
            <span>+ Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Banner de Éxito */}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-border dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o código de producto..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg text-foreground focus:outline-none focus:border-primary transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="checkbox"
            id="stockBajo"
            checked={stockBajo}
            onChange={(e) => setStockBajo(e.target.checked)}
            className="h-4 w-4 text-primary rounded border-border focus:ring-primary"
          />
          <label htmlFor="stockBajo" className="text-xs font-medium text-muted-foreground select-none cursor-pointer flex items-center gap-1.5">
            <AlertTriangle size={13} className={stockBajo ? "text-amber-500" : "text-muted-foreground"} />
            <span>Solo Alertas (Stock Bajo)</span>
          </label>
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-card dark:bg-slate-900 rounded-xl shadow-sm border border-border dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border dark:divide-slate-800 text-xs">
            <thead className="bg-muted/50 dark:bg-slate-950/50">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-muted-foreground uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3.5 text-right font-semibold text-muted-foreground uppercase tracking-wider">
                  Físico
                </th>
                <th className="px-6 py-3.5 text-right font-semibold text-muted-foreground uppercase tracking-wider">
                  Reservado
                </th>
                <th className="px-6 py-3.5 text-right font-semibold text-muted-foreground uppercase tracking-wider">
                  Disponible
                </th>
                <th className="px-6 py-3.5 text-right font-semibold text-muted-foreground uppercase tracking-wider">
                  En Tránsito
                </th>
                <th className="px-6 py-3.5 text-center font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 dark:divide-slate-800/60 bg-card dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span>Cargando inventario...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="max-w-sm mx-auto flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted dark:bg-slate-800 text-muted-foreground flex items-center justify-center">
                        <Package size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground text-sm">No se encontraron productos en el inventario</p>
                        <p className="text-xs text-muted-foreground">
                          Da de alta un nuevo producto para comenzar a gestionar stock, precios y movimientos.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow transition"
                      >
                        <Plus size={14} />
                        <span>+ Crear Primer Producto</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p: any) => {
                  const alertaStock = (p.stock?.disponible ?? 0) <= (p.stockMinimo ?? 0);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/40 dark:hover:bg-slate-800/50 transition-colors ${
                        alertaStock ? 'bg-red-500/5 dark:bg-red-500/10' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{p.nombre}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>SKU: <span className="font-mono text-foreground/80 font-medium">{p.sku}</span></span>
                          {alertaStock && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              <AlertTriangle size={10} />
                              <span>Stock Bajo</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-medium text-foreground">
                        {p.stock?.fisico ?? 0}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-medium text-amber-600 dark:text-amber-400">
                        {p.stock?.reservado ?? 0}
                      </td>
                      <td
                        className={`px-6 py-3.5 whitespace-nowrap text-right font-bold text-sm ${
                          alertaStock ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {p.stock?.disponible ?? 0}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-medium text-blue-600 dark:text-blue-400">
                        {p.stock?.transito ?? 0}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-center">
                        <Link href={`/dashboard/inventory/${p.id}`}>
                          <button className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold hover:underline">
                            <span>Gestionar Stock</span>
                            <ArrowRight size={12} />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-border dark:border-slate-800 sticky top-0 bg-card/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Dar de Alta Nuevo Producto</h3>
                  <p className="text-[11px] text-muted-foreground">Crea el producto en el catálogo para registrar su stock.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Nombre del Producto <span className="text-primary font-bold">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Inversor Híbrido 5kW Deye"
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary transition"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    SKU / Código <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. INV-DEYE-5KW"
                    className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground font-mono focus:outline-none focus:border-primary transition"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">Si se deja vacío, se auto-generará.</p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Unidad de Medida <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. PZA, CJ, KG, M"
                    className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary transition"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Precio Venta <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary transition"
                    value={formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Costo Base <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary transition"
                    value={formData.costoBase}
                    onChange={(e) => setFormData({ ...formData, costoBase: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Stock Mínimo <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary transition"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Descripción <span className="text-muted-foreground font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles técnicos, notas o características..."
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary transition resize-none"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow transition disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? 'Guardando...' : 'Crear Producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
