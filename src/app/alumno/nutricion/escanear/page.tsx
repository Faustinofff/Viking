"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getPremium } from "@/lib/data";
import { marcarEscanerVisto } from "@/lib/escaner-novedad";
import EscanearComida from "@/components/escanear-comida";
import PaywallEscaner from "@/components/paywall-escaner";

type Estado = "premium" | "paywall" | "confirmando";

const PREMIUM_CACHE_KEY = "viking_premium_alumnos";

/** Lee (sin red) la fecha de vencimiento cacheada del alumno. */
function leerCachePremium(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const map = JSON.parse(sessionStorage.getItem(PREMIUM_CACHE_KEY) ?? "{}");
    const exp = map?.[userId];
    return typeof exp === "string" && new Date(exp).getTime() > Date.now() ? exp : null;
  } catch {
    return null;
  }
}

/** Guarda (sin red) el vencimiento del alumno; `null` = no es premium. */
function guardarCachePremium(userId: string, expiresAt: string | null) {
  if (typeof window === "undefined") return;
  try {
    const map = JSON.parse(sessionStorage.getItem(PREMIUM_CACHE_KEY) ?? "{}");
    if (expiresAt) map[userId] = expiresAt;
    else delete map[userId];
    sessionStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

/** Vencimiento vigente del alumno (o null). Una sola consulta a Supabase. */
async function premiumExpira(userId: string): Promise<string | null> {
  const p = await getPremium(userId);
  const t = p ? new Date(p.premiumExpiresAt).getTime() : 0;
  return t > Date.now() ? p!.premiumExpiresAt : null;
}

export default function EscanearComidaPage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const alumno = alumnos.find((a) => a.email === usuario?.email);

  // Arranca en "paywall" (se ve al instante); sólo se cambia si el cache o la
  // consulta confirman que el alumno tiene suscripción activa.
  const [estado, setEstado] = useState<Estado>(() =>
    alumno && leerCachePremium(alumno.id) ? "premium" : "paywall"
  );

  useEffect(() => {
    if (!alumno) return;
    let cancelado = false;

    // El alumno ya entró a la sección: deja de marcarse como "NUEVO".
    marcarEscanerVisto(alumno.id);

    const sincronizar = async () => {
      try {
        const { data: sesion } = await supabase.auth.getSession();
        const token = sesion.session?.access_token;
        if (!token) return;
        await fetch("/api/experimental/subscription/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {}
    };

    const correr = async () => {
      const recienPago = new URLSearchParams(window.location.search).get("estado") === "ok";

      // Ya sabíamos que es premium: mostrar el escáner sin esperar a la red.
      if (leerCachePremium(alumno.id)) setEstado("premium");

      if (recienPago) {
        if (!cancelado) setEstado("confirmando");
        // Vuelve de Mercado Pago: sincroniza y reintenta (el webhook y la
        // autorización pueden demorar).
        for (let i = 0; i < 5; i++) {
          await sincronizar();
          const exp = await premiumExpira(alumno.id);
          if (exp) {
            guardarCachePremium(alumno.id, exp);
            if (!cancelado) setEstado("premium");
            return;
          }
          await new Promise((r) => setTimeout(r, 2500));
        }
        guardarCachePremium(alumno.id, null);
        if (!cancelado) setEstado("paywall");
        return;
      }

      const exp = await premiumExpira(alumno.id);
      if (cancelado) return;
      guardarCachePremium(alumno.id, exp);
      setEstado(exp ? "premium" : "paywall");
    };

    void correr();
    return () => {
      cancelado = true;
    };
  }, [alumno?.id]);

  if (!alumno) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <p className="text-white/40">No tienes un perfil de alumno registrado.</p>
      </div>
    );
  }

  if (estado === "confirmando") {
    return (
      <div className="p-5 max-w-lg mx-auto flex flex-col items-center justify-center py-16 text-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <p className="text-sm text-white/60">Confirmando tu pago con Mercado Pago…</p>
        <p className="text-xs text-white/30">Esto puede tardar unos segundos.</p>
      </div>
    );
  }

  if (estado === "premium") return <EscanearComida alumnoId={alumno.id} />;

  return <PaywallEscaner />;
}
