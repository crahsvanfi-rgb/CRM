"use client";

import { getApiUrl } from '@/lib/api-url';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MessageSquare } from 'lucide-react';

export default function CalendarPage() {
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    fetchCalendar();
  }, [currentDate]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');

      const fechaInicio = `${year}-${month}-01T00:00:00.000Z`;
      const fechaFin = new Date(year, currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const res = await fetch(`${apiUrl}/activities/calendar?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Error fetching calendar activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getActivityBadgeClass = (tipo: string, titulo: string) => {
    if (titulo?.toLowerCase().includes('whatsapp') || tipo === 'WHATSAPP') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
    if (tipo === 'REUNION') {
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
    }
    if (tipo === 'LLAMADA') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Calendario de Actividades y Reuniones
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualiza tus citas, llamadas y reuniones agendadas automáticamente desde WhatsApp o el CRM.
          </p>
        </div>

        <Link
          href="/dashboard/activities"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Actividad
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Hoy
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="p-2 min-h-[90px] sm:min-h-[110px] bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800/60"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear();

            const dayEvents = activities.filter((a) => {
              const d = new Date(a.fecha);
              return (
                d.getDate() === dayNum &&
                d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear()
              );
            });

            return (
              <div
                key={`day-${dayNum}`}
                className={`p-2 rounded-lg border min-h-[90px] sm:min-h-[110px] transition-colors relative flex flex-col justify-between ${
                  isToday
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-medium text-slate-400">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1 overflow-y-auto max-h-[85px]">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[11px] p-1 rounded border truncate flex items-center gap-1 font-medium ${getActivityBadgeClass(
                        ev.tipo,
                        ev.titulo
                      )}`}
                      title={`${ev.hora ? ev.hora + ' - ' : ''}${ev.titulo} (${ev.tipo})`}
                    >
                      {ev.titulo?.toLowerCase().includes('whatsapp') ? (
                        <MessageSquare className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{ev.titulo}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
