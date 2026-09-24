import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getCoachBranding, loadStudentCoachId, type CoachBranding } from "@/lib/branding";

/** Resuelve el branding del coach del alumno con caché local (sin parpadeo) y refresco en segundo plano. */
export function useStudentBranding(): { coachId: string; branding: CoachBranding | null } {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const actualizarCoachBranding = useAppStore((s) => s.actualizarCoachBranding);

  // Prefer the store (authoritative after sync); fallback to the local cache
  // so the brand is available from the very first paint.
  const coachId = useMemo(() => {
    const alumno = alumnos.find((a) => a.id === usuario?.id);
    const fromStore = alumno?.coachId?.trim();
    return fromStore || loadStudentCoachId() || "";
  }, [alumnos, usuario?.id]);

  const branding = useAppStore((s) => (coachId ? s.coaches[coachId]?.branding ?? null : null));

  // Silent refresh: keeps the cache in sync with the coach's settings without flashing.
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;
    getCoachBranding(coachId)
      .then((b) => { if (!cancelled) actualizarCoachBranding(coachId, b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [coachId]);

  return { coachId, branding };
}