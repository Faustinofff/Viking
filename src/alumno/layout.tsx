"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import ChatDialog from "@/components/chat";

const NAV = [
  { href: "/alumno", label: "Inicio", icon: "📊" },
  { href: "/alumno/entrenos", label: "Entrenos", icon: "💪" },
  { href: "/alumno/nutricion", label: "Nutrición", icon: "🍽️" },
  { href: "/alumno/progreso", label: "Progreso", icon: "📈" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usuario = useAppStore((s) => s.usuarioActual);
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);

  useEffect(() => {
    if (usuario?.rol === "alumno") {
      useAppStore.getState().syncStudentData();
    }
  }, [usuario?.id]);

  if (!usuario || usuario.rol !== "alumno") {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="card text-center p-8">
          <p className="text-white/60 mb-4">No has iniciado sesión como alumno</p>
          <Link href="/login" className="btn-primary">Ir a Login</Link>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/alumno") return pathname === "/alumno";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <img src="/Viking.png" alt="Viking" className="w-16 h-16 object-contain" />
          <span className="text-white font-bold">Viking</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          {[
            { href: "/alumno/agenda", label: "Agenda", icon: "📅" },
            { href: "/alumno/perfil", label: "Perfil", icon: "👤" },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all text-xs sm:text-sm ${
                  active ? "bg-accent/10 text-accent" : "text-white/40 hover:text-white/70"
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <div className="w-px h-5 bg-white/[0.06] mx-1" />
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white/50">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
              {usuario.nombre[0]}
            </div>
            <span className="hidden sm:inline">{usuario.nombre}</span>
          </div>
          <button onClick={async () => { await cerrarSesion(); window.location.href = "/login"; }} className="text-white/20 hover:text-red-400 text-xs">Salir</button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 py-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                  active ? "text-accent" : "text-white/30 hover:text-white/50"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <ChatDialog mobile />
        </div>
      </nav>
    </div>
  );
}
