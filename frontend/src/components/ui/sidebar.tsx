"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building2,
  Box,
  Anchor,
  FileSpreadsheet,
  ShoppingCart,
  Calendar,
  BarChart3,
  Bot,
  MessageSquare,
  Sparkles,
  Megaphone,
  Filter,
  FileText,
  UserX,
  Settings,
  Cpu,
  Radio,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    category: "Principal",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Leads", href: "/dashboard/leads", icon: Users },
      { name: "Clientes", href: "/dashboard/customers", icon: Building2 },
      { name: "Inventario", href: "/dashboard/inventory", icon: Box },
      { name: "Importaciones", href: "/dashboard/importations", icon: Anchor },
      { name: "Cotizaciones", href: "/dashboard/quotes", icon: FileSpreadsheet },
      { name: "Órdenes / Ventas", href: "/dashboard/orders", icon: ShoppingCart },
      { name: "Agenda / Actividades", href: "/dashboard/activities", icon: Calendar },
      { name: "Reportes", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    category: "IA & Comunicación",
    items: [
      { name: "Agente IA", href: "/dashboard/ai", icon: Bot },
      { name: "Conversaciones", href: "/dashboard/conversaciones", icon: MessageSquare },
      { name: "Uso de Tokens IA", href: "/dashboard/ai-usage", icon: Sparkles },
    ],
  },
  {
    category: "Marketing",
    items: [
      { name: "Marketing / Campañas", href: "/dashboard/marketing/campaigns/board", icon: Megaphone },
      { name: "Segmentos", href: "/dashboard/marketing/segments", icon: Filter },
      { name: "Plantillas", href: "/dashboard/marketing/plantillas", icon: FileText },
      { name: "Lista de Exclusión", href: "/dashboard/marketing/no-contactar", icon: UserX },
    ],
  },
  {
    category: "Configuración",
    items: [
      { name: "Configuración Campañas", href: "/dashboard/configuracion/campaigns", icon: Settings },
      { name: "Configuración IA", href: "/dashboard/configuracion/ia", icon: Cpu },
      { name: "Configuración Chatbot", href: "/dashboard/configuracion/chatbot", icon: MessageSquare },
      { name: "Configuración Zernio", href: "/dashboard/configuracion/canales/zernio", icon: Radio },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card dark:bg-slate-900 flex flex-col hidden md:flex h-screen sticky top-0 shrink-0">
      {/* Logo & Branding */}
      <div className="h-16 flex items-center px-5 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center glow-electric shadow-md shrink-0">
            <Box className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-foreground leading-tight">
              CRM IMPORTADORA
            </span>
            <span className="text-[10px] font-semibold text-electric-500 uppercase tracking-wider">
              EMPRESA XPANDEZ
            </span>
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-muted">
        {NAV_GROUPS.map((group) => (
          <div key={group.category} className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">
              {group.category}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link key={item.name} href={item.href}>
                  <span
                    className={`relative flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 group ${
                      isActive
                        ? "text-primary dark:text-electric-400 bg-electric-500/10 dark:bg-electric-500/20 font-semibold"
                        : "text-foreground/75 dark:text-slate-300 hover:text-foreground dark:hover:text-white hover:bg-muted/70 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-electric-500 rounded-r-full"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? "text-primary dark:text-electric-400" : "text-muted-foreground dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-slate-200"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom status badge */}
      <div className="p-3 border-t border-border/60 text-xs text-muted-foreground dark:text-slate-400 flex items-center justify-between shrink-0 bg-card/50 dark:bg-slate-900/50">
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Conectado
        </span>
        <span className="text-[10px] bg-muted dark:bg-slate-800 text-muted-foreground dark:text-slate-300 px-2 py-0.5 rounded font-mono">
          DIEGO • XPANDEZ
        </span>
      </div>
    </aside>
  );
}
