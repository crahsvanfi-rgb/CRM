"use client";

import React from 'react';

export default function ExportCsvButton({ data, filename }: { data: any[]; filename: string }) {
  const exportToCsv = () => {
    if (!data || !data.length) return;

    // Get headers
    const headers = Object.keys(data[0]);
    
    // Convert rows
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={exportToCsv}
      disabled={!data || data.length === 0}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-colors disabled:opacity-50"
    >
      Exportar CSV
    </button>
  );
}
