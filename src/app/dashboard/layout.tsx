"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PLANES_SUSCRIPCION, formatearPrecio } from "@/lib/experimental";
import { PLANES_PREMIUM, premiumHabilitaPersonalizacion, premiumHabilitaPaginaWeb } from "@/lib/data";
import { esPaginaWebVisible } from "@/lib/pagina-web";
import ChatDialog from "@/components/chat";
import AppBrandMark from "@/components/app-brand";

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/dashboard/agenda", label: "Agenda", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="16" cy="16" r="2"/></svg> },
];

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
  { href: "/dashboard/ayuda", label: "Ayuda", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

const PERSONALIZACION_NAV = { href: "/dashboard/personalizacion", label: "Personalización", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1m0-14.2-2.1 2.1m-10 10-2.1 2.1"/></svg> }

const PAGINA_WEB_NAV = { href: "/dashboard/pagina-web", label: "Página web", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg> }

const PLAN_UPGRADE_BTN: Record<string, string> = {
  viking: "Suscribirme al Plan Inicial",
  viking_marca: "Suscribirme al Plan Marca",
  viking_marca_web: "Suscribirme al Plan Landing",
};

const PLAN_UPGRADE_BENEFICIO: Record<string, string> = {
  viking: "Alumnos y rutinas ilimitadas",
  viking_marca: "Todo lo anterior + logo y nombre personalizado en la app",
  viking_marca_web: "Todo lo anterior + página web propia",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usuario = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const premiumError = useAppStore((s) => s.premiumError);
  const upgradeReason = useAppStore((s) => s.upgradeReason);
  const cerrarPaywall = useAppStore((s) => s.cerrarPaywall);
  const planActual = premium ? PLANES_PREMIUM.find((p) => p.id === premium.planId) ?? PLANES_PREMIUM[0] : null;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planCargando, setPlanCargando] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [payerEmail, setPayerEmail] = useState("");

  const suscribirse = async (planId: string) => {
    if (planCargando) return;
    const email = payerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPlanError("Escribí el email de tu cuenta de Mercado Pago para poder suscribirte.");
      return;
    }
    setPlanCargando(planId);
    setPlanError(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const token = sesion.session?.access_token;
      if (!token) {
        setPlanError("Sesión no iniciada. Iniciá sesión e intentá de nuevo.");
        return;
      }
      const res = await fetch("/api/experimental/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId, payer_email: email }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlanError(data?.error ?? "No pudimos iniciar el pago. Probá de nuevo.");
        return;
      }
      if (!data?.init_point) {
        setPlanError("Mercado Pago no devolvió el checkout. Probá de nuevo.");
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setPlanError("No pudimos iniciar el pago. Probá de nuevo.");
    } finally {
      setPlanCargando(null);
    }
  };

  const nav = usuario?.rol === "coach"
    ? [...NAV,
      ...(usuario?.brandingEnabled === true || premiumHabilitaPersonalizacion(premium) ? [PERSONALIZACION_NAV] : []),
      ...(esPaginaWebVisible(usuario.email, usuario.paginaWebEnabled) || premiumHabilitaPaginaWeb(premium) ? [PAGINA_WEB_NAV] : [])]
    : NAV;

  useEffect(() => {
    if (usuario?.rol === "coach") {
      useAppStore.getState().syncCoachData();
useAppStore.getState().refreshBrandingEnabled();
      useAppStore.getState().refreshPaginaWebEnabled();
    }
  }, [usuario?.id]);

  useEffect(() => {
    const onFocus = () => {
      if (usuario?.rol === "coach") { useAppStore.getState().refreshBrandingEnabled(); useAppStore.getState().refreshPaginaWebEnabled(); }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
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

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 h-16 px-4 border-b border-white/[0.06]">
        <AppBrandMark size={64} showName={!collapsed} />
      </div>

      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto hide-scrollbar">
        {nav.map((item) => {
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
          <Link href="/dashboard/perfil" className={`flex items-center gap-2 rounded-xl transition-all ${pathname === "/dashboard/perfil" ? "text-accent" : "hover:text-white/70"}`}>
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent flex-shrink-0">
              {usuario.nombre[0]}
            </div>
            {!collapsed && <span>{usuario.nombre}</span>}
          </Link>
        </div>
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
          <AppBrandMark size={36} showName={false} />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/perfil"
            className={`flex flex-col items-center gap-0.5 rounded-lg p-1 transition-all hover:bg-white/[0.04] ${
              pathname === "/dashboard/perfil" ? "bg-accent/10" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
              {usuario.nombre[0]}
            </div>
            <span className="text-[10px] text-white/30 text-center">Perfil</span>
          </Link>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-bg-secondary flex flex-col border-r border-white/[0.06] shadow-2xl">
            <div className="flex items-center justify-between px-4 border-b border-white/[0.06]" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 10px))", paddingBottom: "0.75rem", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
              <div className="flex items-center gap-2.5">
                <AppBrandMark size={40} />
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/40 hover:text-white p-1" aria-label="Cerrar menú">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto hide-scrollbar">
              {nav.map((item) => {
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
          </aside>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none" style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) - 14px), 6px)" }}>
        <div className="pointer-events-auto mx-auto max-w-md px-5">
          <div className="flex items-stretch overflow-hidden rounded-full bg-bg-secondary/65 backdrop-blur-2xl border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.45)] px-4 py-2">
            {BOTTOM_NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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

      <style>{`@media (max-width:767px){.main-content{padding-top:calc(3.5rem + env(safe-area-inset-top, 0px))!important;padding-bottom:calc(6rem + env(safe-area-inset-bottom, 0px))!important}}`}</style>
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] main-content relative">
        {premiumError && (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm p-4" onClick={() => cerrarPaywall()}>
            <div className="min-h-full flex items-center justify-center py-6">
              <div className="card relative w-full max-w-md p-6 text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => cerrarPaywall()} className="absolute top-4 right-4 text-white/40 hover:text-white/80 text-xl leading-none">✕</button>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/15 flex items-center justify-center text-2xl">👑</div>
                <p className="text-white font-semibold text-base leading-snug mb-1">
                  {upgradeReason === "students"
                    ? "Llegaste al límite de 2 alumnos de tu cuenta de prueba"
                    : upgradeReason === "routines"
                    ? "Llegaste al límite de 3 rutinas de tu cuenta de prueba"
                    : "Esta función es Premium"}
                </p>
                <p className="text-sm text-white/50 mb-5 leading-relaxed">
                  {upgradeReason === "students" || upgradeReason === "routines"
                    ? "Para sumar alumnos y rutinas ilimitadas, seguimiento en tiempo real y soporte prioritario, activá tu suscripción."
                    : premiumError}
                </p>
                <label className="block mb-4 text-left">
                  <span className="text-xs text-white/40">
                    Email de tu cuenta de Mercado Pago <span className="text-red-400">(obligatorio)</span>
                  </span>
                  <input
                    type="email"
                    inputMode="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value.trim())}
                    placeholder="tuemail@ejemplo.com"
                    className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent"
                  />
                  <span className="block mt-1 text-[11px] text-white/40">
                    Tiene que ser el email con el que entrás a tu cuenta de Mercado Pago. Si ponés otro, el pago
                    falla y no se procesa la suscripción.
                  </span>
                </label>
                <div className="space-y-2.5 text-left">
                  {PLANES_SUSCRIPCION.map((p) => (
                    <button
                      key={p.id}
                      disabled={planCargando !== null}
                      onClick={() => suscribirse(p.id)}
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition-all hover:border-accent/40 hover:bg-white/[0.06] disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {PLAN_UPGRADE_BTN[p.id] ?? `Suscribirme al plan ${p.nombre}`}
                          {planCargando === p.id && " …"}
                        </p>
                        <p className="text-xs text-white/45 leading-snug">{PLAN_UPGRADE_BENEFICIO[p.id] ?? ""}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-accent">${formatearPrecio(p.precioMuestra)} ARS</span>
                    </button>
                  ))}
                </div>
                {planError && <p className="text-xs text-red-400 mt-3">{planError}</p>}
                <p className="text-[11px] text-white/35 mt-4 leading-relaxed">Débito automático mensual con Mercado Pago. Podés cancelar en cualquier momento con un clic.</p>
                <button onClick={() => cerrarPaywall()} className="btn-secondary w-full mt-4">Ahora no</button>
              </div>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
