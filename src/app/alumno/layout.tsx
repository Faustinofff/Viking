"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import ChatDialog from "@/components/chat";

const NAV = [
  { href: "/alumno", label: "Inicio", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2h-5v-6h-4v6H5a2 2 0 0 1-2-2z"/></svg> },
  { href: "/alumno/entrenos", label: "Entrenos", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="11" width="12" height="2" rx="1"/></svg> },
  { href: "/alumno/nutricion", label: "Nutrición", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="5.5"/><path d="M12 8.5a3 3 0 0 0-3 3"/><path d="M12 8.5a3 3 0 0 1 3 3"/><line x1="12" y1="4" x2="12" y2="8.5"/><line x1="12" y1="4" x2="13.5" y2="5.5"/></svg> },
  { href: "/alumno/progreso", label: "Progreso", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/></svg> },
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
    <div className="h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-5 border-b border-white/[0.06]" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 10px))", paddingBottom: "1rem" }}>
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
      <main className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none" style={{ padding: "0 1.25rem calc(env(safe-area-inset-bottom, 0px) + 0.875rem)" }}>
        <div className="pointer-events-auto mx-auto max-w-md">
          <div className="flex items-stretch overflow-hidden rounded-full bg-bg-secondary/65 backdrop-blur-2xl border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.45)] px-4 py-2">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className="relative flex-1 flex flex-col items-center justify-center gap-1 min-w-0 py-1.5 rounded-full transition-transform duration-200 active:scale-90"
                >
                  <span className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300 ${active ? "bg-accent/15 scale-110" : ""}`}>
                    <span className={`transition-all duration-300 ${active ? "text-accent" : "text-white/35"}`}>{item.icon}</span>
                  </span>
                  <span className={`text-[10px] font-semibold whitespace-nowrap transition-colors duration-300 ${active ? "text-accent" : "text-white/30"}`}>{item.label}</span>
                </Link>
              );
            })}
            <div className="flex-1 flex items-center justify-center min-w-0 py-1.5">
              <ChatDialog mobile />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
