"use client";
import { useStudentBranding } from "@/lib/use-student-branding";
import type { CoachBranding } from "@/lib/branding";

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
          className={`w-16 h-16 object-contain ${branding.brandLogoShape === "circle" ? "rounded-full object-cover" : "rounded-xl bg-white/[0.03] border border-white/[0.06]"}`}
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
  const { branding } = useStudentBranding();

  const hasMark = branding?.brandName?.trim();
  const hasLogo = branding?.brandLogoUrl?.trim();
  const branded = branding && (hasMark || hasLogo);

  return (
    <div className="flex items-center gap-2.5">
      {branded ? <BrandedMark branding={branding} /> : VIKING_MARK}
    </div>
  );
}