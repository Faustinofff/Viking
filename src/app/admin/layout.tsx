"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { isAdmin } from "@/lib/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useAppStore((s) => s.usuarioActual);
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);
  const [checked, setChecked] = useState(false);

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

  const NAV = [
    { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/admin/users", label: "Usuarios", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  ];

  const handleLogout = async () => {
    await cerrarSesion();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-bg-primary">
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      <aside className="hidden md:flex flex-col w-60 border-r border-white/[0.06] bg-bg-secondary">
        <div className="flex items-center gap-3 h-16 px-4 border-b border-white/[0.06]">
          <img src="/Viking.png" alt="Viking" className="w-10 h-10 object-contain" />
          <div>
            <span className="text-white font-bold text-sm">Viking</span>
            <span className="ml-2 text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Admin</span>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? "bg-accent/10 text-accent border border-accent/20" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
                }`}>
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
            <span>Admin</span>
          </div>
          <Link href="/dashboard" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span>Coach View</span>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm">
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-3 bg-bg-secondary/95 backdrop-blur-xl border-b border-white/[0.06]" style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-2 flex-1">
          <img src="/Viking.png" alt="Viking" className="w-9 h-9 object-contain" />
          <span className="text-white font-bold text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-white/40 text-xs">Coach</Link>
          <button onClick={handleLogout} className="text-white/20 hover:text-red-400 text-xs">Salir</button>
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-xl border-t border-white/[0.06]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${active ? "text-accent" : "text-white/30"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style>{`@media (max-width:767px){.admin-main{padding-top:calc(3.5rem + env(safe-area-inset-top, 0px))!important;padding-bottom:calc(4rem + env(safe-area-inset-bottom, 0px))!important}}`}</style>
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] admin-main">
        {children}
      </main>
    </div>
  );
}
