"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { isAdmin } from "@/lib/admin";
import { GlobalSearch, GlobalSearchButton } from "./_components/search";
import { ToastProvider } from "./_components/ui";

const NAV = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/admin/coaches",
    label: "Coaches",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    href: "/admin/students",
    label: "Alumnos",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2z",
  },
  {
    href: "/admin/relationships",
    label: "Relaciones",
    icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684z",
  },
  {
    href: "/admin/activity",
    label: "Actividad",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    href: "/admin/users",
    label: "Premium",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useAppStore((s) => s.usuarioActual);
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);
  const [checked, setChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (usuario === undefined) return;
    if (!usuario) {
      router.replace("/login");
      return;
    }
    if (!isAdmin(usuario.email)) {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [usuario]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await cerrarSesion();
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  return (
    <ToastProvider>
    <div className="flex h-screen bg-bg-primary">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      <aside className="hidden md:flex flex-col w-60 border-r border-white/[0.06] bg-bg-secondary">
        <div className="flex items-center gap-3 h-16 px-4 border-b border-white/[0.06]">
          <img src="/Viking.png" alt="Viking" className="w-10 h-10 object-contain" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Viking Admin</p>
            <p className="text-[10px] text-white/35 truncate">Control Center</p>
          </div>
        </div>

        <div className="px-3 pt-3">
          <GlobalSearchButton onOpen={() => setSearchOpen(true)} />
        </div>

        <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto hide-scrollbar">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  active
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/[0.06] space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 truncate">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium text-red-400 flex-shrink-0">A</div>
            <span className="truncate">Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Coach View</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 bg-bg-secondary/95 backdrop-blur-xl border-b border-white/[0.06]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src="/Viking.png" alt="Viking" className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="text-white font-bold text-sm truncate">Admin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <Link href="/dashboard" className="text-white/40 text-xs px-1">Coach</Link>
          <button onClick={handleLogout} className="text-white/20 hover:text-red-400 text-xs px-1">Salir</button>
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.875rem)" }}
      >
        <div className="pointer-events-auto mx-auto max-w-md px-3">
          <div className="flex items-stretch overflow-hidden rounded-full bg-bg-secondary/65 backdrop-blur-2xl border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.45)] px-3 py-2">
            {NAV.slice(0, 5).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex-1 flex flex-col items-center justify-center gap-1 min-w-0 py-1.5 rounded-full transition-transform duration-200 active:scale-90"
                >
                  <span className={`relative flex items-center justify-center w-10 h-8 rounded-full transition-all duration-300 ${active ? "bg-accent/15 scale-110" : ""}`}>
                    <svg className={`w-5 h-5 transition-all duration-300 ${active ? "text-accent" : "text-white/35"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </span>
                  <span className={`text-[9px] font-semibold whitespace-nowrap transition-colors duration-300 ${active ? "text-accent" : "text-white/30"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <style>{`@media (max-width:767px){.admin-main{padding-top:calc(3.5rem + env(safe-area-inset-top, 0px))!important;padding-bottom:calc(6rem + env(safe-area-inset-bottom, 0px))!important}}`}</style>
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] admin-main">
        {children}
      </main>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
    </ToastProvider>
  );
}
