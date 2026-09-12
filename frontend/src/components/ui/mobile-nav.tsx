"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Package,
  Menu,
  X,
  ChevronRight,
  Building2,
  FileText,
  ShoppingCart,
  Truck,
  Calendar,
  Megaphone,
  Filter,
  Sparkles,
  Zap,
  BarChart3,
  Radio,
  UserX,
  Copy,
  Bot,
} from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Bloquear scroll de fondo cuando el drawer está abierto
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const navItems = [
    {
      name: 'Inicio',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Leads',
      href: '/dashboard/leads',
      icon: Users,
      active: pathname.startsWith('/dashboard/leads'),
    },
    {
      name: 'Chat',
      href: '/dashboard/conversaciones',
      icon: MessageSquare,
      active: pathname.startsWith('/dashboard/conversaciones'),
    },
    {
      name: 'Stock',
      href: '/dashboard/inventory',
      icon: Package,
      active: pathname.startsWith('/dashboard/inventory'),
    },
  ];

  const drawerSections = [
    {
      title: 'Operaciones Comerciales',
      items: [
        { name: 'Clientes', href: '/dashboard/customers', icon: Building2, color: 'bg-blue-500' },
        { name: 'Cotizaciones', href: '/dashboard/quotes', icon: FileText, color: 'bg-indigo-500' },
        { name: 'Pedidos y Ventas', href: '/dashboard/orders', icon: ShoppingCart, color: 'bg-emerald-500' },
        { name: 'Logística / Importaciones', href: '/dashboard/importations', icon: Truck, color: 'bg-amber-500' },
        { name: 'Agenda y Citas', href: '/dashboard/activities/calendar', icon: Calendar, color: 'bg-rose-500' },
      ],
    },
    {
      title: 'Masivos',
      items: [
        { name: 'Masivos', href: '/dashboard/masivos', icon: Megaphone, color: 'bg-purple-500' },
        { name: 'Segmentos de Clientes', href: '/dashboard/marketing/segments', icon: Filter, color: 'bg-pink-500' },
        { name: 'Plantillas de Mensaje', href: '/dashboard/masivos/plantillas', icon: Copy, color: 'bg-sky-500' },
        { name: 'Lista de Exclusión', href: '/dashboard/marketing/no-contactar', icon: UserX, color: 'bg-red-500' },
      ],
    },
    {
      title: 'Inteligencia Artificial & Canales',
      items: [
        { name: 'Asistente IA Comercial', href: '/dashboard/ai', icon: Sparkles, color: 'bg-violet-600' },
        { name: 'Configuración Zernio', href: '/dashboard/configuracion/canales/zernio', icon: Radio, color: 'bg-emerald-600' },
        { name: 'Chatbot WhatsApp', href: '/dashboard/configuracion/chatbot', icon: Bot, color: 'bg-cyan-600' },
        { name: 'Automatizaciones', href: '/dashboard/configuracion/automatizaciones', icon: Zap, color: 'bg-orange-500' },
        { name: 'Reportes y Métricas', href: '/dashboard/reports', icon: BarChart3, color: 'bg-teal-600' },
      ],
    },
  ];

  return (
    <>
      {/* ==========================================================================
          BOTTOM TAB BAR ESTILO iOS (Fija en la parte inferior en pantallas móviles)
          ========================================================================== */}
      <nav
        aria-label="Navegación Móvil"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden ios-blur border-t border-slate-200/80 dark:border-white/10 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      >
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] rounded-xl transition-all duration-150 active:scale-90 ${
                  item.active
                    ? 'text-[#007AFF] dark:text-[#0A84FF]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-150 ${item.active ? 'scale-110' : ''}`} />
                  {item.name === 'Chat' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF3B30]" />
                  )}
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 ${item.active ? 'font-bold' : 'font-medium'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Botón de Menú / Drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú completo de secciones"
            className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] rounded-xl transition-all duration-150 active:scale-90 ${
              drawerOpen
                ? 'text-[#007AFF] dark:text-[#0A84FF]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Menú</span>
          </button>
        </div>
      </nav>

      {/* ==========================================================================
          BOTTOM SHEET / DRAWER ESTILO iOS (Deslizable desde abajo)
          ========================================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          {/* Telón oscuro desenfocado */}
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Contenedor del Drawer */}
          <div className="relative w-full max-h-[88vh] bg-[#F2F2F7] dark:bg-[#000000] rounded-t-[2.2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 z-10 border-t border-slate-200/60 dark:border-white/10 pb-[env(safe-area-inset-bottom,20px)]">
            {/* Grabber / Pill handle nativa de iOS */}
            <div className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Cabecera del Drawer */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/70 dark:border-slate-800/80">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Todas las Secciones
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Listo
              </button>
            </div>

            {/* Lista agrupada (iOS Inset Grouped List) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {drawerSections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                    {section.title}
                  </h3>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/5 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isCurrent = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between px-4 py-3.5 min-h-[48px] hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 transition active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center text-white shadow-sm shrink-0`}
                            >
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <span
                              className={`text-sm tracking-tight ${
                                isCurrent
                                  ? 'font-bold text-[#007AFF] dark:text-[#0A84FF]'
                                  : 'font-medium text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {item.name}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
