'use client';

import { getApiUrl } from '@/lib/api-url';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Ship, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ImportationFormPage() {
  const router = useRouter();
  const supabase = createClient();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    proveedorId: '',
    paisOrigen: '',
    fechaCompra: '',
    fechaSalida: '',
    eta: '',
    medioTransporte: 'Marítimo',
    numeroContenedor: '',
    referencia: '',
    observaciones: '',
  });

  const [items, setItems] = useState<any[]>([]);

  const apiUrl = getApiUrl();

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || localStorage.getItem('token') || '';
    const tenantId = session?.user?.user_metadata?.tenant_id || localStorage.getItem('tenantId') || '00000000-0000-0000-0000-000000000000';
    const userId = session?.user?.id || localStorage.getItem('userId') || '00000000-0000-0000-0000-000000000000';

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'x-user-id': userId,
    };
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingData(true);
    try {
      const headers = await getHeaders();
      const [suppliersRes, productsRes] = await Promise.all([
        fetch(`${apiUrl}/suppliers`, { headers }),
        fetch(`${apiUrl}/products?limit=100`, { headers }),
      ]);

      if (suppliersRes.ok) {
        const sData = await suppliersRes.json();
        setSuppliers(sData.data || sData || []);
      }

      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData.data || pData || []);
      }
    } catch (err: any) {
      console.warn('Error fetching initial data for importations form:', err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', cantidad: 1, costoUnitario: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const headers = await getHeaders();

      // Construir payload solo con datos definidos
      const payload: any = {};
      if (formData.codigo.trim()) payload.codigo = formData.codigo.trim();
      if (formData.proveedorId.trim()) payload.proveedorId = formData.proveedorId.trim();
      if (formData.paisOrigen.trim()) payload.paisOrigen = formData.paisOrigen.trim();
      if (formData.medioTransporte.trim()) payload.medioTransporte = formData.medioTransporte.trim();
      if (formData.numeroContenedor.trim()) payload.numeroContenedor = formData.numeroContenedor.trim();
      if (formData.referencia.trim()) payload.referencia = formData.referencia.trim();
      if (formData.observaciones.trim()) payload.observaciones = formData.observaciones.trim();

      if (formData.fechaCompra) payload.fechaCompra = new Date(formData.fechaCompra).toISOString();
      if (formData.fechaSalida) payload.fechaSalida = new Date(formData.fechaSalida).toISOString();
      if (formData.eta) payload.eta = new Date(formData.eta).toISOString();

      const validItems = items
        .filter((i) => i.productId && i.productId.trim() !== '')
        .map((i) => ({
          productId: i.productId,
          cantidad: Number(i.cantidad || 1),
          costoUnitario: Number(i.costoUnitario || 0),
        }));

      if (validItems.length > 0) {
        payload.items = validItems;
      }

      const res = await fetch(`${apiUrl}/importations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar la importación');
      }

      setSuccessMessage('Importación registrada con éxito.');
      setTimeout(() => {
        router.push('/dashboard/importations');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/importations"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Importaciones
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ship className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Nueva Importación
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Todos los campos son opcionales. Puedes registrar con información mínima y completar los detalles más adelante.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Datos Generales (Opcionales)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Código o Referencia
              </label>
              <input
                type="text"
                placeholder="Ej. IMP-2026-01 (Autogenerado si está vacío)"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Proveedor
              </label>
              <select
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.proveedorId}
                onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
              >
                <option value="">(Sin asignar / Proveedor General)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.pais ? `(${s.pais})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                País de Origen
              </label>
              <input
                type="text"
                placeholder="Ej. China, EE.UU., Panamá"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.paisOrigen}
                onChange={(e) => setFormData({ ...formData, paisOrigen: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Medio de Transporte
              </label>
              <select
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.medioTransporte}
                onChange={(e) => setFormData({ ...formData, medioTransporte: e.target.value })}
              >
                <option value="Marítimo">Marítimo</option>
                <option value="Aéreo">Aéreo</option>
                <option value="Terrestre">Terrestre</option>
                <option value="Férreo">Férreo</option>
                <option value="Multimodal">Multimodal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Fecha Estimada de Llegada (ETA)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                N° Contenedor / Tracking
              </label>
              <input
                type="text"
                placeholder="Ej. MSCU1234567"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.numeroContenedor}
                onChange={(e) => setFormData({ ...formData, numeroContenedor: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Observaciones / Notas
              </label>
              <textarea
                rows={2}
                placeholder="Notas adicionales sobre la importación..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Productos Opcionales */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Productos / Carga (Opcional)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Puedes añadir productos ahora o agregarlos más tarde desde el seguimiento.
              </p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Ítem
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
              No se han agregado productos a la importación.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-end gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Producto
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                    >
                      <option value="">Selecciona un producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Costo Unit. ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      value={item.costoUnitario}
                      onChange={(e) => handleItemChange(idx, 'costoUnitario', e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/dashboard/importations"
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-sm disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Importación'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
