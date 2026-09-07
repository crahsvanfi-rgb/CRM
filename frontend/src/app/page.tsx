"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Sun, Moon, ArrowRight, Activity, Box, Database, Lock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  // Auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-electric-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-electric-700/20 blur-[120px] pointer-events-none" />

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-3 rounded-full bg-card border border-border shadow-lg hover:shadow-electric-500/20 transition-all duration-300"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-electric-400" />
            ) : (
              <Moon className="w-5 h-5 text-electric-600" />
            )}
          </button>
        )}
      </div>

      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-electric-700 to-electric-400 flex items-center justify-center shadow-lg glow-electric">
                <Box className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">CRM IMPORTADORA</h1>
            </div>
            <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
              Bienvenido de <span className="text-gradient">vuelta</span>
            </h2>
            <p className="text-muted-foreground opacity-80 text-lg">
              Plataforma inteligente para importadoras.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 mt-10">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                {errorMsg === "Invalid login credentials" ? "Correo o contraseña incorrectos." : errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 rounded-xl bg-card border border-border focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all outline-none"
                  placeholder="ejemplo@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide uppercase text-foreground/80 flex justify-between">
                <span>Contraseña</span>
                <a href="#" className="text-electric-500 hover:text-electric-400 lowercase normal-case">¿Olvidaste tu contraseña?</a>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 rounded-xl bg-card border border-border focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              className="w-full py-4 mt-6 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 text-white font-bold text-lg flex items-center justify-center space-x-2 shadow-xl hover:shadow-electric-500/40 transition-all disabled:opacity-70"
              type="submit"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* Right Column - Visual/Tech Display */}
      <div className="hidden lg:flex w-1/2 bg-card border-l border-border relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 w-full max-w-lg"
        >
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-background border border-border/50 shadow-2xl backdrop-blur-sm"
              >
                <Activity className="w-10 h-10 text-electric-500 mb-4" />
                <h3 className="font-bold text-lg">Métricas en Tiempo Real</h3>
                <p className="text-sm text-foreground/60 mt-2">Monitorea contenedores e inventarios con actualizaciones inmediatas.</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-background border border-border/50 shadow-2xl backdrop-blur-sm"
              >
                <Database className="w-10 h-10 text-electric-400 mb-4" />
                <h3 className="font-bold text-lg">Data Multitenant</h3>
                <p className="text-sm text-foreground/60 mt-2">Aislamiento total y seguridad de clase mundial (RLS).</p>
              </motion.div>
            </div>
            
            <div className="space-y-6 mt-12">
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-background border border-border/50 shadow-2xl backdrop-blur-sm"
              >
                <Lock className="w-10 h-10 text-electric-600 mb-4" />
                <h3 className="font-bold text-lg">Control RBAC</h3>
                <p className="text-sm text-foreground/60 mt-2">Permisos detallados para tu equipo comercial y logístico.</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Abstract lines */}
        <svg className="absolute w-full h-full inset-0 pointer-events-none opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-electric-500" />
          <path d="M0,70 Q25,50 50,70 T100,70" fill="none" stroke="currentColor" strokeWidth="0.1" className="text-electric-400" />
        </svg>
      </div>
    </div>
  );
}
