"use client";
import { useStudentBranding } from "@/lib/use-student-branding";

type AppBrandMarkProps = {
  /** Tamaño del logo en px. */
  size?: number;
  /** Muestra el nombre junto al logo (default true). */
  showName?: boolean;
};

/** Marca que ve el usuario dentro de la app: la de su coach (alumno)
 *  o la propia (coach). Sin branding configurado → Viking por defecto. */
export default function AppBrandMark({ size = 64, showName = true }: AppBrandMarkProps) {
  const { branding } = useStudentBranding();

  const hasMark = branding?.brandName?.trim();
  const hasLogo = branding?.brandLogoUrl?.trim();
  const branded = branding && (hasMark || hasLogo);
  const circle = branding?.brandLogoShape === "circle";

  if (!branded) {
    return (
      <>
        <img src="/Viking.png" alt="Viking" className="object-contain flex-shrink-0" style={{ width: size, height: size }} />
        {showName && <span className="text-white font-bold">Viking</span>}
      </>
    );
  }

  return (
    <>
      {hasLogo ? (
        <img
          src={branding!.brandLogoUrl!}
          alt={hasMark ?? "Logo"}
          className={`${circle ? "object-cover" : "object-contain"} flex-shrink-0 ${circle ? "rounded-full" : "rounded-xl bg-white/[0.03] border border-white/[0.06]"}`}
          style={{ width: size, height: size }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div
          className="rounded-full bg-accent/15 flex items-center justify-center font-bold flex-shrink-0"
          style={{ width: size, height: size, color: branding?.brandColor ?? "#00D4AA", fontSize: Math.max(14, Math.round(size / 2)) }}
        >
          {(hasMark ?? "Viking")[0]}
        </div>
      )}
      {showName && (
        <span className="font-bold" style={{ color: branding?.brandColor ?? "#fff" }}>
          {hasMark ?? "Viking"}
        </span>
      )}
    </>
  );
}