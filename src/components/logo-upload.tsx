"use client";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BRANDING_LOGO_MAX_BYTES, BRANDING_LOGO_TYPES } from "@/lib/branding";

export interface BrandingIcons {
  icon192: string;
  icon512: string;
  icon180: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = url;
  });
}

function drawToSize(img: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas no disponible"));
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, x, y, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo convertir el logo"))), "image/png")
  );
}

export default function LogoUpload({ value, onChange, shape = "square" }: { value: string | null; onChange: (url: string | null, icons?: BrandingIcons) => void; shape?: "square" | "circle" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!BRANDING_LOGO_TYPES.includes(file.type)) {
      setError("Formato no válido. Usá PNG, JPG o WebP.");
      return;
    }
    if (file.size > BRANDING_LOGO_MAX_BYTES) {
      setError("La imagen es muy grande. Máximo 2 MB.");
      return;
    }

    let localPreview = "";
    try { localPreview = URL.createObjectURL(file); setPreview(localPreview); } catch {}
    setUploading(true);

    try {
      let iconsBlobs: Record<string, Blob> = {};
      try {
        const img = await loadImage(localPreview);
        const sizes: [string, number][] = [["icon512", 512], ["icon192", 192], ["icon180", 180]];
        for (const [name, s] of sizes) iconsBlobs[name] = await drawToSize(img, s);
      } catch {}

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const form = new FormData();
      form.append("file", file);
      if (iconsBlobs.icon512) form.append("icon512", iconsBlobs.icon512, "icon-512.png");
      if (iconsBlobs.icon192) form.append("icon192", iconsBlobs.icon192, "icon-192.png");
      if (iconsBlobs.icon180) form.append("icon180", iconsBlobs.icon180, "icon-180.png");

      const res = await fetch("/api/coach/branding/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error ?? "Error subiendo el logo.");
        setPreview(value);
        return;
      }
      onChange(result.url, result.icons ?? undefined);
      setPreview(result.url);
    } catch {
      setError("Error de conexión al subir el logo.");
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {preview ? (
          <img
            src={preview}
            alt="Logo actual"
            className={`w-16 h-16 object-contain rounded-xl border border-white/10 bg-white/[0.03] ${shape === "circle" ? "rounded-full object-cover" : ""}`}
            onError={() => setPreview(null)}
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center text-xs text-white/30 border border-dashed border-white/10">Sin logo</div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={BRANDING_LOGO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-secondary text-xs">
            {uploading ? "Subiendo..." : preview ? "Reemplazar logo" : "Subir logo"}
          </button>
          {value && !uploading && (
            <button type="button" onClick={() => { onChange(null); setPreview(null); }} className="text-xs text-red-400/70 hover:text-red-400">
              Quitar logo
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-white/20">PNG, JPG o WebP · máx 2 MB · fondo transparente recomendado</p>
    </div>
  );
}