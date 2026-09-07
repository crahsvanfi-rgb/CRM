'use client';

import { apiPath } from '@/lib/api-url';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuote();
  }, [params.id]);

  const fetchQuote = async () => {
    try {
      const res = await fetch(apiPath(`/quotes/${params.id}`), {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID || '' }
      });
      const data = await res.json();
      setQuote(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(apiPath(`/quotes/${params.id}/${action}`), {
        method: 'POST',
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID || '' }
      });
      if (res.ok) {
        if (action === 'duplicate' || action === 'convert-to-order') {
          router.push('/dashboard/quotes');
        } else {
          fetchQuote();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const downloadPdf = async () => {
    window.open(apiPath(`/quotes/${params.id}/pdf`), '_blank');
  };

  if (loading) return <div className="p-6">Cargando cotización...</div>;
  if (!quote) return <div className="p-6">Cotización no encontrada</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/dashboard/quotes" className="text-blue-600 hover:underline mb-2 inline-block">← Volver al listado</Link>
          <h1 className="text-3xl font-bold text-gray-900">Cotización {quote.numero}</h1>
          <p className="text-gray-500">Estado: <span className="font-semibold">{quote.estado}</span></p>
        </div>
        
        <div className="flex gap-2">
          {quote.estado === 'BORRADOR' && (
            <button onClick={() => handleAction('send')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Marcar Enviada</button>
          )}
          {quote.estado === 'ENVIADA' && (
            <>
              <button onClick={() => handleAction('accept')} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Aceptar</button>
              <button onClick={() => handleAction('reject')} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Rechazar</button>
            </>
          )}
          {quote.estado === 'ACEPTADA' && (
            <button onClick={() => handleAction('convert-to-order')} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Convertir a Pedido</button>
          )}
          <button onClick={() => handleAction('duplicate')} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Duplicar</button>
          <button onClick={downloadPdf} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Descargar PDF</button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
            <p className="mt-1 text-lg text-gray-900">{quote.cliente?.nombreComercial}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Vendedor</h3>
            <p className="mt-1 text-lg text-gray-900">{quote.vendedor?.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Fecha de Creación</h3>
            <p className="mt-1 text-gray-900">{new Date(quote.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Validez hasta</h3>
            <p className="mt-1 text-gray-900">{quote.fechaVencimiento ? new Date(quote.fechaVencimiento).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <h3 className="font-medium text-lg mb-4 border-b pb-2">Ítems</h3>
        <table className="min-w-full divide-y divide-gray-200 mb-6">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase">Desc.</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quote.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="py-3 text-sm text-gray-900">{item.product?.nombre}</td>
                <td className="py-3 text-sm text-center text-gray-900">{item.cantidad}</td>
                <td className="py-3 text-sm text-right text-gray-900">{Number(item.precioUnitario).toFixed(2)}</td>
                <td className="py-3 text-sm text-right text-gray-900">{Number(item.descuento).toFixed(2)}</td>
                <td className="py-3 text-sm text-right font-medium text-gray-900">{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2 text-right">
            <p className="text-gray-500 flex justify-between"><span>Subtotal:</span> <span>{quote.moneda} {Number(quote.subtotal).toFixed(2)}</span></p>
            <p className="text-gray-500 flex justify-between"><span>Descuento global:</span> <span>{quote.moneda} {Number(quote.descuento).toFixed(2)}</span></p>
            <p className="text-gray-500 flex justify-between"><span>Impuestos:</span> <span>{quote.moneda} {Number(quote.impuestos).toFixed(2)}</span></p>
            <p className="text-lg font-bold flex justify-between border-t pt-2"><span>Total:</span> <span>{quote.moneda} {Number(quote.total).toFixed(2)}</span></p>
          </div>
        </div>

        {quote.condiciones && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Condiciones Comerciales</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{quote.condiciones}</p>
          </div>
        )}
      </div>
    </div>
  );
}
