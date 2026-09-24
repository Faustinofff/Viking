"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getCoachBranding, CoachBranding } from "@/lib/branding";

export default function StudentBranding() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const [branding, setBranding] = useState<CoachBranding | null>(null);
  const [loaded, setLoaded] = useState(false);

  const alumno = alumnos.find((a) => a.id === usuario?.id);
  const coachId = alumno?.coachId;

  useEffect(() => {
    let cancelled = false;
    setBranding(null);
    setLoaded(false);
    if (!coachId) {
      setLoaded(true);
      return;
    }
    getCoachBranding(coachId)
      .then((b) => { if (!cancelled) { setBranding(b); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [coachId]);

  const hasMark = branding?.brandName?.trim();
  const hasLogo = branding?.brandLogoUrl?.trim();

  if (!loaded || !branding || (!hasMark && !hasLogo)) {
    return (
      <div className="flex items-center gap-2.5">
        <img src="/Viking.png" alt="Viking" className="w-16 h-16 object-contain" />
        <span className="text-white font-bold">Viking</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {hasLogo ? (
        <img
          src={branding!.brandLogoUrl!}
          alt={hasMark ?? "Logo"}
          className="w-16 h-16 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-2xl font-bold" style={{ color: branding!.brandColor ?? "#00D4AA" }}>
          {(hasMark ?? "Viking")[0]}
        </div>
      )}
      <span className="font-bold" style={{ color: branding!.brandColor ?? "#fff" }}>
        {hasMark ?? "Viking"}
      </span>
    </div>
  );
}