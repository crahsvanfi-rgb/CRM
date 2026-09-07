"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon, Bell, Search, ShieldCheck } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const DEFAULT_TENANT_ID = 'cc5c04c1-5e60-4c54-bacb-6003cbb9cde5';
      const DEFAULT_USER_ID = '671fbb0f-afb2-472c-82f8-5c9be494ad29';
      const t = localStorage.getItem('tenant_id') || localStorage.getItem('tenantId');
      if (!t || t.includes('12345678') || t === '00000000-0000-0000-0000-000000000000') {
        localStorage.setItem('tenant_id', DEFAULT_TENANT_ID);
        localStorage.setItem('tenantId', DEFAULT_TENANT_ID);
      }
      const u = localStorage.getItem('user_id') || localStorage.getItem('userId');
      if (!u || u.includes('12345678') || u === '00000000-0000-0000-0000-000000000000') {
        localStorage.setItem('user_id', DEFAULT_USER_ID);
        localStorage.setItem('userId', DEFAULT_USER_ID);
      }
    }
  }, []);

  return (
    <header className="w-full border-b border-slate-200/80 dark:border-white/10 ios-blur sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)] px-4 sm:px-6 transition-colors">
      <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Mobile Branding / Desktop Search Bar */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          {/* Mobile compact title */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-sm font-black text-xs">
              CRM
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Globalnet
            </span>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:block w-full">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-electric-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar leads, clientes, contenedores..."
                className="w-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Right actions (con touch targets de 44x44px en móvil) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            aria-label="Buscar"
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition active:scale-90"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Cambiar tema"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full sm:rounded-xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-foreground dark:hover:text-white transition active:scale-90 shadow-sm"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          )}

          {/* Notifications */}
          <button
            aria-label="Notificaciones"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full sm:rounded-xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-foreground dark:hover:text-white transition active:scale-90 relative shadow-sm"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-electric-600 to-electric-400 p-[2px] shadow-sm shrink-0">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-600 to-electric-400">D</span>
              </div>
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold leading-none text-foreground dark:text-slate-100">Diego</p>
                <ShieldCheck className="w-3 h-3 text-electric-500" />
              </div>
              <p className="text-[10px] font-bold text-electric-600 dark:text-electric-400 mt-1 uppercase tracking-wider">
                EMPRESA XPANDEZ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search input dropdown if open */}
      {mobileSearchOpen && (
        <div className="md:hidden pb-3 animate-in slide-in-from-top-2 duration-150">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar leads, clientes, inventario..."
              className="w-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-electric-500 text-foreground"
            />
          </div>
        </div>
      )}
    </header>
  );
}
