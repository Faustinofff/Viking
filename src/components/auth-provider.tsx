"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getCurrentUser, onAuthStateChange } from "@/lib/auth";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUsuario = useAppStore((s) => s.setUsuario);
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && pathname && !pathname.startsWith("/auth/")) {
      saveLastPath(pathname);
    }
  }, [pathname, loading]);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (user) {
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
            router.replace("/admin");
          } else {
            const lastPath = loadLastPath();
            const target = lastPath && lastPath.startsWith(rol === "coach" ? "/dashboard" : "/alumno")
              ? lastPath
              : (rol === "coach" ? "/dashboard" : "/alumno");
            router.replace(target);
          }
        } else {
          router.replace("/auth/onboarding");
        }
      }

      if (event === "SIGNED_OUT") {
        cerrarSesion();
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) return null;

  return <>{children}</>;
}
