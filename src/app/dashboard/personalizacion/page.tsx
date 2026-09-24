"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { canManageBranding, getCoachBranding, CoachBranding } from "@/lib/branding";
import LogoUpload from "@/components/logo-upload";

export default function CoachPersonalizacionPage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#ffffff");

  const allowed = usuario?.rol === "coach" && canManageBranding(usuario.email);

  useEffect(() => {
    if (!usuario) return;
    if (!allowed) {
      setLoading(false);
      return;
    }
    getCoachBranding(usuario.id)
      .then((b) => {
        if (b) {
          setBrandName(b.brandName ?? "");
          setBrandLogoUrl(b.brandLogoUrl);
          setBrandColor(b.brandColor ?? "#ffffff");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usuario?.id]);

  if (!usuario || usuario.rol !== "coach") {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="card text-center p-8">
          <p className="text-white/60">Acceso exclusivo para coaches</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="card text-center p-8">
          <p className="text-white/60 mb-2">Esta función está en fase beta privada.</p>
          <p className="text-sm text-white/30">Todavía no está disponible para tu cuenta.</p>
        </div>
      </div>
    );
  }

  const guardar = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const body = { brandName: brandName.trim(), brandLogoUrl: brandLogoUrl ?? "", brandColor };
      const res = await fetch("/api/coach/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: result.error ?? "Error guardando." });
        return;
      }
      setMessage({ type: "ok", text: "Guardado. Tus alumnos verán tu marca en su app." });
    } catch {
      setMessage({ type: "err", text: "Error de conexión." });
    } finally {
      setSaving(false);
    }
  };

  const headerPreview = (
    <div className="flex items-center gap-2.5">
      {brandLogoUrl ? (
        <img src={brandLogoUrl} alt="Logo" className="w-16 h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-2xl font-bold text-accent">
          {(brandName.trim() || usuario.nombre)[0]}
        </div>
      )}
      <span className="text-white font-bold" style={{ color: brandColor }}>
        {brandName.trim() || "Viking"}
      </span>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Personalización</h1>
        <p className="text-white/40 mt-1">Tu identidad como coach en la app de tus alumnos</p>
      </div>

      <div className="card space-y-6">
        <div>
          <label className="label block mb-1.5">Nombre de tu marca</label>
          <input
            className="input"
            placeholder="Ej: FitFaustino"
            value={brandName}
            maxLength={60}
            onChange={(e) => setBrandName(e.target.value)}
          />
          <p className="text-xs text-white/20 mt-1.5">Si lo dejas vacío, tus alumnos verán &quot;Viking&quot;.</p>
        </div>

        <div>
          <label className="label block mb-1.5">Logo</label>
          <LogoUpload value={brandLogoUrl} onChange={setBrandLogoUrl} />
        </div>

        <div>
          <label className="label block mb-1.5">Color del nombre</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#ffffff"}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              className="input w-32"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#ffffff"
            />
          </div>
          <p className="text-xs text-white/20 mt-1.5">Opcional. Usado para el nombre de la marca en el encabezado.</p>
        </div>

        <div className="pt-2">
          <button onClick={guardar} disabled={saving} className="btn-primary text-sm">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {message && (
            <p className={`text-sm mt-3 ${message.type === "ok" ? "text-accent" : "text-red-400"}`}>{message.text}</p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">Vista previa</h3>
          <p className="text-xs text-white/30 mt-0.5">Así se verá el encabezado de la app para tus alumnos.</p>
        </div>
        <div className="rounded-2xl bg-bg-secondary/60 border border-white/[0.06] p-5">{headerPreview}</div>
      </div>
    </div>
  );
}