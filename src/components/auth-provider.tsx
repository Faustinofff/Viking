"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getCurrentUser, onAuthStateChange, setUidCookie, clearUidCookie } from "@/lib/auth";
import { createProfile, getProfile } from "@/lib/data";
import { isAdmin } from "@/lib/admin";
import { trackLogin } from "@/lib/telemetry";
import { markAuthReady } from "@/lib/splash-ready";

const STORAGE_LAST_PATH = "viking_last_path";

function saveLastPath(path: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_LAST_PATH, path); } catch {}
}

function loadLastPath(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(STORAGE_LAST_PATH); } catch { return null; }
}

// Conserva la query string: la ruta del entrenamiento activo lleva ?rutinaId=&diaId=
// y perderlos al relanzar es lo que descarta la sesión en curso.
function currentFullPath(): string {
  return window.location.pathname + window.location.search;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUsuario = useAppStore((s) => s.setUsuario);
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && pathname && !pathname.startsWith("/auth/")) {
      saveLastPath(currentFullPath());
    }
  }, [pathname, loading]);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUidCookie(user.id);
        if (!isAdmin(user.email)) {
          const reloaded = (() => { try { return sessionStorage.getItem("viking_ssr_reloaded") === "1"; } catch { return true; } })();
          if (!reloaded && !pathname.startsWith("/auth/")) {
            try { sessionStorage.setItem("viking_ssr_reloaded", "1"); } catch {}
            window.location.replace(pathname + window.location.search);
            return;
          }
        }
        const meta = user.user_metadata as Record<string, string> || {};
        const nombre = meta.nombre ?? meta.full_name ?? user.email?.split("@")[0] ?? "";
        const rol = meta.rol as "coach" | "alumno" | undefined;

        if (rol && nombre) {
          const existing = await getProfile(user.id).catch(() => null);
          if (!existing) {
            await createProfile(user.id, user.email ?? "", nombre, rol).catch(() => {});
          }
          setUsuario({ id: user.id, nombre, email: user.email ?? "", rol });
          trackLogin();
          if (isAdmin(user.email)) {
            router.replace("/admin");
          } else if (pathname !== "/admin" && pathname !== "/auth/onboarding") {
            // keep current path
          }
        } else if (pathname !== "/auth/onboarding") {
          router.replace("/auth/onboarding");
        }
      }
      setLoading(false);
      markAuthReady();
    };
    init();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const user = session.user;
        setUidCookie(user.id);
        const meta = user.user_metadata as Record<string, string> || {};
        const nombre = meta.nombre ?? meta.full_name ?? user.email?.split("@")[0] ?? "";
        const rol = meta.rol as "coach" | "alumno" | undefined;

        if (rol && nombre) {
          getProfile(user.id).then((existing) => {
            if (!existing) {
              createProfile(user.id, user.email ?? "", nombre, rol).catch(() => {});
            }
          }).catch(() => {});
          setUsuario({ id: user.id, nombre, email: user.email ?? "", rol });
          trackLogin();
          if (isAdmin(user.email)) {
            if (window.location.pathname !== "/admin") {
              window.setTimeout(() => { window.location.replace("/admin"); }, 50);
            }
          } else {
            const section = rol === "coach" ? "/dashboard" : "/alumno";
            const currentPath = window.location.pathname;
            const alreadyInside = currentPath === section || currentPath.startsWith(section + "/");
            if (alreadyInside) {
              // Ya está dentro del app logueada (p.ej. en el medio de un entreno):
              // NO navegar ni recargar. supabase emite SIGNED_IN en cada vuelta al
              // foreground; recargar aquí descarta la sesión activa. El reload SSR
              // de branding ya lo gestiona init() una vez por pestaña.
              return;
            }
            const lastPath = loadLastPath();
            const target = lastPath && lastPath.startsWith(section) ? lastPath : section;
            // Recarga completa: garantiza que el servidor (SSR) renderice la
            // cookie viking_uid y el branding PWA en el HTML del primer paint
            // (iOS toma el nombre de la app de ese HTML original).
            window.setTimeout(() => { window.location.replace(target); }, 50);
          }
        } else {
          router.replace("/auth/onboarding");
        }
      }

      if (event === "SIGNED_OUT") {
        clearUidCookie();
        cerrarSesion();
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) return null;

  return <>{children}</>;
}
