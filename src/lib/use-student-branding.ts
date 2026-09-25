import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getCoachBranding, loadStudentCoachId, type CoachBranding } from "@/lib/branding";

/** Resuelve la marca que ve el usuario dentro de la app:
 *  - alumno → la marca de su coach
 *  - coach → su propia marca (así también la ve en su app)
 *  Con caché local (sin parpadeo) y refresco en segundo plano. */
export function useStudentBranding(): { coachId: string; branding: CoachBranding | null } {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const actualizarCoachBranding = useAppStore((s) => s.actualizarCoachBranding);

  const coachId = useMemo(() => {
    if (!usuario) return "";
    if (usuario.rol === "coach") return usuario.id;
    const alumno = alumnos.find((a) => a.id === usuario.id);
    const fromStore = alumno?.coachId?.trim();
    return fromStore || loadStudentCoachId() || "";
  }, [usuario, alumnos]);

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