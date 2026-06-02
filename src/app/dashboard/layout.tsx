"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { PLANES_PREMIUM } from "@/lib/data";
import ChatDialog from "@/components/chat";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: "/dashboard/redes", label: "Redes", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/dashboard/rutinas", label: "Rutinas", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/><path d="m9 13 2 2 4-4"/></svg> },
  { href: "/dashboard/ejercicios", label: "Ejercicios", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="11" width="12" height="2" rx="1"/></svg> },
  { href: "/dashboard/nutricion", label: "Nutrición", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="5.5"/><path d="M12 8.5a3 3 0 0 0-3 3"/><path d="M12 8.5a3 3 0 0 1 3 3"/><line x1="12" y1="4" x2="12" y2="8.5"/><line x1="12" y1="4" x2="13.5" y2="5.5"/></svg> },
  { href: "/dashboard/agenda", label: "Agenda", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="16" cy="16" r="2"/></svg> },
  { href: "/dashboard/perfil", label: "Perfil", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { href: "/dashboard/planes-premium", label: "Premium", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const planActual = premium ? PLANES_PREMIUM.find((p) => p.id === premium.planId) ?? PLANES_PREMIUM[0] : null;
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (usuario?.rol === "coach") {
      useAppStore.getState().syncCoachData();
    }
  }, [usuario?.id]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!usuario || usuario.rol !== "coach") {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="card text-center p-8">
          <p className="text-white/60 mb-4">No has iniciado sesión como coach</p>
          <Link href="/login" className="btn-primary">Ir a Login</Link>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await cerrarSesion();
    router.push("/");
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 h-16 px-4 border-b border-white/[0.06]">
        <img src="/Viking.png" alt="Viking" className="w-16 h-16 object-contain flex-shrink-0" />
        {!collapsed && <span className="text-white font-bold">Viking</span>}
      </div>

      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto hide-scrollbar">
        {NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive ? "bg-accent/10 text-accent border border-accent/20" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              {!collapsed && item.href === "/dashboard/planes-premium" && planActual && (
                <span className="ml-auto text-[10px] font-bold bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                  {planActual.nombre}
                </span>
              )}
            </Link>
          );
        })}
        <ChatDialog collapsed={collapsed} />
      </div>

      <div className="p-2 border-t border-white/[0.06] space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 truncate">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent flex-shrink-0">
            {usuario.nombre[0]}
          </div>
          {!collapsed && <span>{usuario.nombre}</span>}
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm">
          <span>🚪</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="w-full hidden md:flex justify-center py-1 text-white/20 hover:text-white/50 transition-all text-xs">
          {collapsed ? "→" : "←"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-bg-primary">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-white/[0.06] bg-bg-secondary transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-3 bg-bg-secondary/95 backdrop-blur-xl border-b border-white/[0.06]" style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-2 flex-1">
          <button onClick={() => setMobileMenuOpen(true)} className="text-white/60 hover:text-white p-1" aria-label="Abrir menú">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <img src="/Viking.png" alt="Viking" className="w-9 h-9 object-contain" />
        </div>
        <div className="flex-1 flex justify-center">
          <ChatDialog header />
        </div>
        <div className="flex-1 flex items-center justify-end">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium text-accent">
            {usuario.nombre[0]}
          </div>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-bg-secondary flex flex-col border-r border-white/[0.06] shadow-2xl">
            <div className="flex items-center justify-between px-4 border-b border-white/[0.06]" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 10px))", paddingBottom: "0.75rem", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
              <div className="flex items-center gap-2.5">
                <img src="/Viking.png" alt="Viking" className="w-10 h-10 object-contain" />
                <span className="text-white font-bold">Viking</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/40 hover:text-white p-1" aria-label="Cerrar menú">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto hide-scrollbar">
              {NAV.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive ? "bg-accent/10 text-accent border border-accent/20" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.href === "/dashboard/planes-premium" && planActual && (
                      <span className="ml-auto text-[10px] font-bold bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                        {planActual.nombre}
                      </span>
                    )}
                  </Link>
                );
              })}
              <ChatDialog collapsed={false} />
            </div>
            <div className="p-2 border-t border-white/[0.06]">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm">
                <span>🚪</span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <style>{`@media (max-width:767px){.main-content{padding-top:calc(3.5rem + env(safe-area-inset-top, 0px))!important}}`}</style>
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 main-content">{children}</main>
    </div>
  );
}
