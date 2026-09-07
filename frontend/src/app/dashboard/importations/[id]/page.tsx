'use client';

import { apiPath } from '@/lib/api-url';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [importation, setImportation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImportation();
  }, [id]);

  const fetchImportation = async () => {
    try {
      const res = await fetch(apiPath(`/importations/${id}`), {
        headers: { 'x-tenant-id': 'test-tenant' }
      });
      if (!res.ok) throw new Error('Error al cargar la importación');
      setImportation(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (newState: string) => {
    if (!confirm(`¿Estás seguro de avanzar la importación a estado ${newState}?`)) return;
    try {
      const res = await fetch(apiPath(`/importations/${id}/transition`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'test-tenant'
        },
        body: JSON.stringify({ newState })
      });
      if (!res.ok) throw new Error('Error al cambiar de estado');
      fetchImportation();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar de estado');
    }
  };

  const handleReceive = async () => {
    if (!confirm('¿Estás seguro de recepcionar esta importación? Esto generará movimientos de inventario de entrada reales.')) return;
    try {
      const res = await fetch(apiPath(`/importations/${id}/receive`), {
        method: 'POST',
        headers: {
          'x-tenant-id': 'test-tenant',
          'x-user-id': '00000000-0000-0000-0000-000000000000' // user mock
        }
      });
      if (!res.ok) throw new Error('Error al recepcionar la importación');
      fetchImportation();
      alert('Importación recibida con éxito.');
    } catch (error) {
      console.error(error);
      alert('Error al recepcionar la importación');
    }
  };

  const handleClose = async () => {
    if (!confirm('¿Estás seguro de cerrar esta importación?')) return;
    try {
      const res = await fetch(apiPath(`/importations/${id}/close`), {
        method: 'POST',
        headers: { 'x-tenant-id': 'test-tenant' }
      });
      if (!res.ok) throw new Error('Error al cerrar');
      fetchImportation();
    } catch (error) {
      console.error(error);
      alert('Error al cerrar');
    }
  };

  const generatePDF = () => {
    window.open(apiPath(`/importations/${id}/pdf`), '_blank');
  };

  if (loading) return <div className="p-8">Cargando importación...</div>;
  if (!importation) return <div className="p-8">Importación no encontrada.</div>;

  const flow = [
    'PLANIFICADA', 'ORDENADA', 'EN_PRODUCCION', 'EMBARCADA', 
    'EN_TRANSITO', 'ADUANA', 'RECIBIDA', 'CERRADA'
  ];
  const currentIndex = flow.indexOf(importation.estado);
  const nextState = currentIndex >= 0 && currentIndex < flow.length - 1 ? flow[currentIndex + 1] : null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Importación {importation.codigo}
          </h1>
          <p className="text-gray-500 mt-1">Proveedor: {importation.proveedor.nombre}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generatePDF} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
            📄 PDF
          </button>
          
          {nextState && importation.estado !== 'ADUANA' && importation.estado !== 'RECIBIDA' && (
            <button 
              onClick={() => handleTransition(nextState)} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Avanzar a {nextState}
            </button>
          )}

          {importation.estado === 'ADUANA' && (
            <button 
              onClick={handleReceive} 
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-lg"
            >
              📦 Recepcionar Mercancía
            </button>
          )}

          {importation.estado === 'RECIBIDA' && (
            <button 
              onClick={handleClose} 
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded"
            >
              🔒 Cerrar Importación
            </button>
          )}

          <button onClick={() => router.push('/dashboard/importations')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
            Volver
          </button>
        </div>
      </div>

      {/* Progress Bar Logística */}
      <div className="mb-8 p-4 bg-white shadow rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Progreso Logístico</h3>
        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 -translate-y-1/2"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-10 -translate-y-1/2 transition-all duration-500"
            style={{ width: `${(currentIndex / (flow.length - 1)) * 100}%` }}
          ></div>
          
          {flow.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors duration-300 ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : isCompleted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {idx + 1}
                </div>
                <div className={`text-xs mt-2 font-medium ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6 border-t-4 border-blue-500">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Datos Logísticos</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">País Origen</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.paisOrigen || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Medio Transporte</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.medioTransporte || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contenedor / Guía</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.numeroContenedor || '-'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Observaciones</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.observaciones || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6 border-t-4 border-gray-500">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Fechas Clave</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Creación (Sistema)</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(importation.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fecha de Compra</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.fechaCompra ? new Date(importation.fechaCompra).toLocaleDateString() : '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Salida Origen</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.fechaSalida ? new Date(importation.fechaSalida).toLocaleDateString() : '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Llegada Estimada (ETA)</dt>
              <dd className="mt-1 text-sm text-gray-900">{importation.eta ? new Date(importation.eta).toLocaleDateString() : '-'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 border-t pt-2 mt-2">Llegada Real</dt>
              <dd className="mt-1 font-bold text-sm text-gray-900">{importation.fechaLlegadaReal ? new Date(importation.fechaLlegadaReal).toLocaleString() : 'Pendiente'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Productos ({importation.items.length})</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {importation.items.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-bold">{item.cantidad}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">${Number(item.costoUnitario).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-bold">${Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase">Gran Total:</td>
              <td className="px-6 py-4 text-right text-lg font-bold text-blue-600">
                ${importation.items.reduce((acc: number, item: any) => acc + Number(item.total), 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
