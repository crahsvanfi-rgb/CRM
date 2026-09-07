"use client";

import React from 'react';
import Link from 'next/link';

const REPORTS = [
  { id: 'sales-by-period', title: 'Ventas por Período', desc: 'Total facturado y cantidad de pedidos' },
  { id: 'sales-by-vendor', title: 'Ventas por Vendedor', desc: 'Rendimiento de los vendedores' },
  { id: 'sales-by-customer', title: 'Ventas por Cliente', desc: 'Historial de compras por cliente' },
  { id: 'top-products', title: 'Productos más Vendidos', desc: 'Top artículos con mayor rotación' },
  { id: 'least-products', title: 'Productos menos Vendidos', desc: 'Artículos con baja rotación' },
  { id: 'stock-summary', title: 'Resumen de Stock', desc: 'Estado actual del inventario (No requiere filtro de fecha)' },
  { id: 'leads', title: 'Resumen de Leads', desc: 'Cantidad de leads por estado y fuente' },
  { id: 'lead-conversion', title: 'Conversión de Leads', desc: 'Tasa de conversión a clientes' },
  { id: 'new-customers', title: 'Clientes Nuevos', desc: 'Listado de clientes registrados' },
  { id: 'inactive-customers', title: 'Clientes Inactivos', desc: 'Clientes sin compras recientes' },
  { id: 'importations', title: 'Importaciones', desc: 'Resumen logístico de importaciones' }
];

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <p className="text-gray-500">Seleccione un reporte para visualizar los datos comerciales y operativos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORTS.map(r => (
          <Link href={`/dashboard/reports/${r.id}`} key={r.id}>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer h-full border border-gray-100">
              <h2 className="text-lg font-semibold text-blue-700 mb-2">{r.title}</h2>
              <p className="text-gray-600 text-sm">{r.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
