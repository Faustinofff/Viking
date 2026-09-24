"use client";
import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getCoachBranding, loadStudentCoachId, CoachBranding } from "@/lib/branding";

const VIKING_MARK = (
  <>
    <img src="/Viking.png" alt="Viking" className="w-16 h-16 object-contain" />
    <span className="text-white font-bold">Viking</span>
  </>
);

function BrandedMark({ branding }: { branding: CoachBranding }) {
  const hasMark = branding.brandName?.trim();
  const hasLogo = branding.brandLogoUrl?.trim();
  const color = branding.brandColor ?? "#fff";

  return (
    <>
      {hasLogo ? (
        <img
          src={branding.brandLogoUrl!}
          alt={hasMark ?? "Logo"}
          className={`w-16 h-16 object-contain ${branding.brandLogoShape === "circle" ? "rounded-full object-cover" : ""}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-2xl font-bold" style={{ color: branding.brandColor ?? "#00D4AA" }}>
          {(hasMark ?? "Viking")[0]}
        </div>
      )}
      <span className="font-bold" style={{ color }}>
        {hasMark ?? "Viking"}
      </span>
    </>
  );
}

export default function StudentBranding() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const actualizarCoachBranding = useAppStore((s) => s.actualizarCoachBranding);

  // Prefer the store (authoritative after sync); fallback to the local cache
  // so the brand is visible on the very first paint without waiting for a fetch.
  const coachId = useMemo(() => {
    const alumno = alumnos.find((a) => a.id === usuario?.id);
    const fromStore = alumno?.coachId?.trim();
    return fromStore || loadStudentCoachId() || "";
  }, [alumnos, usuario?.id]);

  const branding = useAppStore((s) => (coachId ? s.coaches[coachId]?.branding ?? null : null));

  // Silent refresh in the background: keeps the cache in sync with the coach's
  // current settings without blocking render (no flash).
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;
    getCoachBranding(coachId)
      .then((b) => { if (!cancelled) actualizarCoachBranding(coachId, b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [coachId]);

  const hasMark = branding?.brandName?.trim();
  const hasLogo = branding?.brandLogoUrl?.trim();
  const branded = branding && (hasMark || hasLogo);

  return (
    <div className="flex items-center gap-2.5">
      {branded ? <BrandedMark branding={branding} /> : VIKING_MARK}
    </div>
  );
}