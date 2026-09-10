'use client';

import { getApiUrl } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';

interface MovementFormModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MovementFormModal({ productId, isOpen, onClose, onSuccess }: MovementFormModalProps) {
  const [tipo, setTipo] = useState('ENTRADA_IMPORTACION');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documentoRef, setDocumentoRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${getApiUrl()}/inventory/movements`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId,
          tipo,
          cantidad: Number(cantidad),
          motivo: motivo || undefined,
          documentoRef: documentoRef || undefined
        })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Error al registrar el movimiento');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Nuevo Movimiento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 text-red-400 p-3 rounded text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Movimiento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="input-field w-full"
              required
            >
              <optgroup label="Entradas">
                <option value="ENTRADA_IMPORTACION">Ingreso por Importación</option>
                <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
                <option value="DEVOLUCION">Devolución</option>
              </optgroup>
              <optgroup label="Salidas">
                <option value="SALIDA_VENTA">Salida por Venta</option>
                <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Documento de Referencia (Opcional)</label>
            <input
              type="text"
              value={documentoRef}
              onChange={(e) => setDocumentoRef(e.target.value)}
              className="input-field w-full"
              placeholder="Ej: FAC-1234, IMP-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Motivo / Notas (Opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="input-field w-full min-h-[80px]"
              placeholder="Detalles del movimiento..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
