"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { MobileNav } from "@/components/ui/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#F2F2F7] dark:bg-[#000000] md:bg-background md:dark:bg-background overflow-hidden relative">
      {/* Desktop Sidebar (oculto en móviles) */}
      <Sidebar />

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* iOS Frosted Glass Header */}
        <Header />

        {/* Contenido principal con padding inferior para la barra móvil */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:p-6 md:p-8 pb-28 md:pb-8 relative">
          {/* Sutil halo difuso de fondo en desktop */}
          <div className="hidden md:block absolute top-0 right-0 w-[500px] h-[500px] bg-electric-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* iOS Bottom Tab Bar & Drawer (visible únicamente en móviles < md) */}
      <MobileNav />
    </div>
  );
}
