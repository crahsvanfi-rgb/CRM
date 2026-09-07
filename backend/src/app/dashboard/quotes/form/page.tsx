'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FileText, ArrowLeft, Plus, Trash2, Download, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function QuoteFormPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successQuote, setSuccessQuote] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    clienteId: '',
    vendedorId: '',
    fechaVencimiento: '',
    moneda: 'USD',
    descuento: '',
    impuestos: '',
    observaciones: '',
    condiciones: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      const [customersRes, productsRes] = await Promise.all([
        fetch(`${apiUrl}/customers`, { headers }),
        fetch(`${apiUrl}/products?limit=100`, { headers }),
      ]);

      if (customersRes.ok) {
        const cData = await customersRes.json();
        setClientes(cData.data || cData || []);
      }

      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProductos(pData.data || pData || []);
      }
    } catch (err: any) {
      console.warn('Error fetching initial data for quotes form:', err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productId: '', cantidad: 1, precioUnitario: 0, descuento: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'productId') {
      const prod = productos.find((p: any) => p.id === value);
      if (prod) {
        newItems[index].precioUnitario = Number(prod.precioVenta || 0);
      }
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => {
      const cant = Number(item.cantidad || 0);
      const precio = Number(item.precioUnitario || 0);
      const desc = Number(item.descuento || 0);
      return acc + (cant * precio - desc);
    }, 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const globalDesc = Number(formData.descuento || 0);
    const tax = Number(formData.impuestos || 0);
    return Math.max(0, sub - globalDesc + tax);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const headers = await getHeaders();

      const payload: any = {};
      if (formData.clienteId.trim()) payload.clienteId = formData.clienteId.trim();
      if (formData.vendedorId.trim()) payload.vendedorId = formData.vendedorId.trim();
      if (formData.moneda.trim()) payload.moneda = formData.moneda.trim();
      if (formData.observaciones.trim()) payload.observaciones = formData.observaciones.trim();
      if (formData.condiciones.trim()) payload.condiciones = formData.condiciones.trim();

      if (formData.descuento.trim()) payload.descuento = Number(formData.descuento);
      if (formData.impuestos.trim()) payload.impuestos = Number(formData.impuestos);
      if (formData.fechaVencimiento) payload.fechaVencimiento = new Date(formData.fechaVencimiento).toISOString();

      const validItems = items
        .filter((i) => i.productId && i.productId.trim() !== '')
        .map((i) => ({
          productId: i.productId,
          cantidad: Number(i.cantidad || 1),
          precioUnitario: Number(i.precioUnitario || 0),
          descuento: Number(i.descuento || 0),
        }));

      if (validItems.length > 0) {
        payload.items = validItems;
      }

      const res = await fetch(`${apiUrl}/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar la cotización');
      }

      const createdQuote = await res.json();
      setSuccessQuote(createdQuote);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (quoteId: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiUrl}/quotes/${quoteId}/pdf`, { headers });
      if (!res.ok) throw new Error('No se pudo descargar el PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cotizacion-${quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Error al descargar PDF');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Cotizaciones
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Nueva Cotización
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crea una cotización borrador o completa. El PDF se genera automáticamente al guardar.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {/* Notificación de Éxito con Botón para Descargar PDF */}
      {successQuote && (
        <div className="mb-6 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                  ¡Cotización {successQuote.numero || ''} creada exitosamente!
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  El documento PDF ha sido generado automáticamente y está listo para descargar o compartir.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadPdf(successQuote.id)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </button>
              <Link
                href="/dashboard/quotes"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Ver Listado
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Cliente (Opcional)
            </label>
            <select
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={formData.clienteId}
              onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
            >
              <option value="">(Sin asignar / Cliente Mostrador)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercial || c.nombre || c.razonSocial} {c.documentoNumero ? `(${c.documentoNumero})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={formData.fechaVencimiento}
              onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Moneda
            </label>
            <select
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={formData.moneda}
              onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
            >
              <option value="USD">USD ($ - Dólares)</option>
              <option value="BOB">BOB (Bs - Bolivianos)</option>
              <option value="EUR">EUR (€ - Euros)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Descuento Global ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={formData.descuento}
              onChange={(e) => setFormData({ ...formData, descuento: e.target.value })}
            />
          </div>
        </div>

        {/* Productos */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Ítems de la Cotización (Opcional)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Puedes guardar un borrador sin productos o agregar los ítems requeridos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Ítem
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
              No se han añadido productos a esta cotización.
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
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.nombre} ({p.precioVenta ? `$${p.precioVenta}` : 'Sin precio'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(idx, 'cantidad', Number(e.target.value))}
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Precio ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      value={item.precioUnitario}
                      onChange={(e) => handleItemChange(idx, 'precioUnitario', Number(e.target.value))}
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Total Ítem
                    </label>
                    <div className="w-full px-2.5 py-1.5 text-sm bg-slate-100 dark:bg-slate-800/80 rounded-md text-slate-800 dark:text-slate-200 font-semibold">
                      ${Math.max(0, (item.cantidad || 1) * (item.precioUnitario || 0) - (item.descuento || 0)).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="text-slate-500 dark:text-slate-400">
              Subtotal: <span className="font-semibold text-slate-800 dark:text-slate-200">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              Total: ${calculateTotal().toFixed(2)} {formData.moneda}
            </div>
          </div>
        </div>

        {/* Observaciones y Condiciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Notas generales para el cliente..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Condiciones Comerciales
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Tiempo de entrega 15 días, 50% anticipo..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={formData.condiciones}
              onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/dashboard/quotes"
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Volver al listado
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-sm disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando y Generando PDF...
              </>
            ) : (
              'Guardar Cotización'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
