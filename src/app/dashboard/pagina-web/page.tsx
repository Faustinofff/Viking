"use client";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { esPaginaWebVisible, normalizarSlug, PAGINA_WEB_PORTADA_MAX_BYTES, PAGINA_WEB_PORTADA_TYPES, PAGINA_WEB_GALERIA_MAX } from "@/lib/pagina-web";
import { getCoachPhone, premiumHabilitaPaginaWeb } from "@/lib/data";

function PortadaUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!PAGINA_WEB_PORTADA_TYPES.includes(file.type)) {
      setError("Formato no válido. Usá PNG, JPG o WebP.");
      return;
    }
    if (file.size > PAGINA_WEB_PORTADA_MAX_BYTES) {
      setError("La imagen es muy grande. Máximo 5 MB.");
      return;
    }

    let localPreview = "";
    try { localPreview = URL.createObjectURL(file); setPreview(localPreview); } catch {}
    setUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "portada");
      const res = await fetch("/api/coach/landing/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error ?? "Error subiendo la portada.");
        setPreview(value);
        return;
      }
      onChange(result.url);
      setPreview(result.url);
    } catch {
      setError("Error de conexión al subir la portada.");
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] aspect-[16/9] flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Portada" className="w-full h-full object-cover" onError={() => setPreview(null)} />
        ) : (
          <div className="text-xs text-white/30">Sin portada</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={PAGINA_WEB_PORTADA_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-secondary text-xs">
          {uploading ? "Subiendo..." : preview ? "Reemplazar portada" : "Subir portada"}
        </button>
        {value && !uploading && (
          <button type="button" onClick={() => { onChange(null); setPreview(null); }} className="text-xs text-red-400/70 hover:text-red-400">
            Quitar portada
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-white/20">PNG, JPG o WebP · máx 5 MB · formato horizontal recomendado</p>
    </div>
  );
}

function GaleriaUpload({ value, onChange, max }: { value: string[]; onChange: (urls: string[]) => void; max: number }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!PAGINA_WEB_PORTADA_TYPES.includes(file.type)) {
      setError("Formato no válido. Usá PNG, JPG o WebP.");
      return;
    }
    if (file.size > PAGINA_WEB_PORTADA_MAX_BYTES) {
      setError("La imagen es muy grande. Máximo 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "galeria");
      const res = await fetch("/api/coach/landing/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error ?? "Error subiendo la foto.");
        return;
      }
      onChange([...value, result.url].slice(0, max));
    } catch {
      setError("Error de conexión al subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square">
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white/80 text-xs hover:bg-red-500/80 transition-colors"
                aria-label={`Quitar foto ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={PAGINA_WEB_PORTADA_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || value.length >= max}
          className="btn-secondary text-xs"
        >
          {uploading ? "Subiendo..." : "+ Agregar foto"}
        </button>
        {value.length >= max && <p className="text-xs text-white/30">Máximo {max} fotos.</p>}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function CoachPaginaWebPage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [slug, setSlug] = useState("");
  const [portadaUrl, setPortadaUrl] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [sobreMi, setSobreMi] = useState("");
  const [galeria, setGaleria] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappText, setWhatsappText] = useState("Hola, vengo de tu página web.");
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const allowed = usuario?.rol === "coach" && (esPaginaWebVisible(usuario.email, usuario.paginaWebEnabled) || premiumHabilitaPaginaWeb(premium));

  useEffect(() => {
    if (!usuario) return;
    if (!allowed) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch("/api/coach/landing", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (res.ok && result.landing) {
          setSlug(result.landing.slug ?? "");
          setPortadaUrl(result.landing.portadaUrl ?? null);
          setDescripcion(result.landing.descripcion ?? "");
          setSobreMi(result.landing.sobreMi ?? "");
          setGaleria(result.landing.galeria ?? []);
          setInstagram(result.landing.instagram ?? "");
          setWhatsapp(result.landing.whatsapp ?? "");
          setWhatsappText(result.landing.whatsappText || "Hola, vengo de tu página web.");
        } else {
          setSlug(normalizarSlug(usuario.nombre));
          try {
            const phone = await getCoachPhone(usuario.id);
            if (phone) setWhatsapp(phone.replace(/[^0-9]/g, ""));
          } catch {}
        }
      } catch {}
    })().finally(() => setLoading(false));
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
          <p className="text-white/60 mb-2">Todavía no tenés acceso a la página web.</p>
          <p className="text-sm text-white/30">Ponete en contacto con tu administrador para habilitarla.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="card text-center p-8 text-white/40">Cargando...</div>
      </div>
    );
  }

  const finalSlug = normalizarSlug(slug) || slug;

  const guardar = async () => {
    setSaving(true);
    setMessage(null);
    setCopied(false);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/coach/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({
          slug,
          portadaUrl: portadaUrl ?? "",
          descripcion,
          sobreMi,
          galeria,
          instagram,
          whatsapp,
          whatsappText,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: result.error ?? "Error guardando." });
        return;
      }
      setSlug(result.landing?.slug ?? slug);
      setPortadaUrl(result.landing?.portadaUrl ?? null);
      setDescripcion(result.landing?.descripcion ?? "");
      setSobreMi(result.landing?.sobreMi ?? "");
      setGaleria(result.landing?.galeria ?? []);
      setInstagram(result.landing?.instagram ?? "");
      setWhatsapp(result.landing?.whatsapp ?? "");
      setWhatsappText(result.landing?.whatsappText || "Hola, vengo de tu página web.");
      setLiveUrl(result.url);
      setMessage({ type: "ok", text: "Página guardada. Ya podés copiar el enlace." });
    } catch {
      setMessage({ type: "err", text: "Error de conexión." });
    } finally {
      setSaving(false);
    }
  };

  const quitarPagina = async () => {
    if (typeof window !== "undefined" && !window.confirm("¿Querés quitar tu página web pública? El enlace dejará de funcionar.")) return;
    setRemoving(true);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/coach/landing", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: result.error ?? "Error quitando la página." });
        return;
      }
      setLiveUrl(null);
      setSlug(normalizarSlug(usuario.nombre));
      setPortadaUrl(null);
      setDescripcion("");
      setSobreMi("");
      setGaleria([]);
      setInstagram("");
      setWhatsapp("");
      setMessage({ type: "ok", text: "Página web quitada." });
    } catch {
      setMessage({ type: "err", text: "Error de conexión." });
    } finally {
      setRemoving(false);
    }
  };

  const copiar = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const preview = (
    <div className="rounded-2xl overflow-hidden bg-bg-primary border border-white/[0.06]">
      {portadaUrl ? (
        <div className="h-28 overflow-hidden relative">
          <img src={portadaUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary to-transparent" />
        </div>
      ) : (
        <div className="h-28 bg-accent/10" />
      )}
      <div className="p-4 text-center -mt-8">
        <div className="w-14 h-14 mx-auto rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-xl font-bold text-accent">
          {usuario.nombre[0] ?? "V"}
        </div>
        <p className="font-bold mt-2 truncate">{usuario.nombre}</p>
        {descripcion && <p className="text-xs text-white/50 mt-1 line-clamp-2">{descripcion}</p>}
        {sobreMi && <p className="text-xs text-white/40 mt-2 line-clamp-3 text-left leading-relaxed">{sobreMi}</p>}
        {galeria.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {galeria.map((u, i) => (
              <img key={u} src={u} alt={`Foto ${i + 1}`} className="aspect-square object-cover rounded-lg border border-white/10" />
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-bg-primary">
            <span className="w-3 h-3 rounded-full bg-bg-primary/80" />
            Chatear por WhatsApp
          </div>
          {instagram && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/80">
              <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]" />
              IG
            </div>
          )}
        </div>
        <p className="text-[10px] text-white/25 mt-3">
          © {new Date().getFullYear()} {usuario.nombre} · Derechos reservados
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Página web</h1>
        <p className="text-white/40 mt-1">Tu página pública para copiar el enlace en tu bio de Instagram</p>
      </div>

      <div className="card space-y-6">
        <div>
          <label className="label block mb-1.5">Foto de portada</label>
          <PortadaUpload value={portadaUrl} onChange={setPortadaUrl} />
        </div>

        <div>
          <label className="label block mb-1.5">Enlace de tu página</label>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm shrink-0">…/l/</span>
            <input
              className="input font-mono"
              placeholder="mi-nombre"
              value={slug}
              maxLength={60}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <p className="text-xs text-white/20 mt-1.5">
            Visible para cualquiera, sin necesidad de cuenta. No lo cambies después de publicarlo.
          </p>
        </div>

        <div>
          <label className="label block mb-1.5">Descripción</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Texto corto que acompaña tu nombre al abrir la página..."
            value={descripcion}
            maxLength={400}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <p className="text-xs text-white/20 mt-1.5 text-right">{descripcion.length}/400</p>
        </div>

        <div>
          <label className="label block mb-1.5">Sobre mí</label>
          <textarea
            className="input min-h-[120px] resize-y"
            placeholder="Contá quién sos, tu experiencia, cómo trabajás..."
            value={sobreMi}
            maxLength={1000}
            onChange={(e) => setSobreMi(e.target.value)}
          />
          <p className="text-xs text-white/20 mt-1.5 text-right">{sobreMi.length}/1000</p>
        </div>

        <div>
          <label className="label block mb-1.5">Galería de fotos</label>
          <GaleriaUpload value={galeria} onChange={setGaleria} max={PAGINA_WEB_GALERIA_MAX} />
          <p className="text-xs text-white/20 mt-1.5">Fotos de tu trabajo o de tus entrenamientos.</p>
        </div>

        <div>
          <label className="label block mb-1.5">Instagram</label>
          <input
            className="input"
            placeholder="@tuusuario"
            value={instagram}
            maxLength={80}
            onChange={(e) => setInstagram(e.target.value)}
          />
          <p className="text-xs text-white/20 mt-1.5">
            Ej: faustino_fit → se abre instagram.com/faustino_fit
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="label block mb-1.5">WhatsApp</label>
            <input
              className="input"
              placeholder="5491122334455"
              inputMode="numeric"
              value={whatsapp}
              maxLength={20}
              onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <p className="text-xs text-white/20 mt-1.5">Con código de país, sin + ni espacios.</p>
          </div>
          <div>
            <label className="label block mb-1.5">Texto del botón</label>
            <input
              className="input"
              placeholder="Hola, vengo de tu página web."
              value={whatsappText}
              maxLength={120}
              onChange={(e) => setWhatsappText(e.target.value)}
            />
            <p className="text-xs text-white/20 mt-1.5">Mensaje precargado al abrir el chat.</p>
          </div>
        </div>

        <div className="pt-2">
          <button onClick={guardar} disabled={saving || !finalSlug} className="btn-primary text-sm">
            {saving ? "Guardando..." : liveUrl ? "Guardar cambios" : "Crear página"}
          </button>
          {liveUrl && (
            <button onClick={quitarPagina} disabled={removing} className="ml-3 btn-danger text-sm">
              {removing ? "Quitando..." : "Quitar página"}
            </button>
          )}
          {!finalSlug && <p className="text-xs text-red-400 mt-2">Necesitás un enlace (ej: tu nombre).</p>}
          {message && (
            <p className={`text-sm mt-3 ${message.type === "ok" ? "text-accent" : "text-red-400"}`}>{message.text}</p>
          )}
        </div>

        {(liveUrl || finalSlug) && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40">Tu página pública</p>
              <p className="text-sm text-white/80 font-mono truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}
                {liveUrl ?? `/l/${finalSlug}`}
              </p>
            </div>
            <button
              onClick={() => copiar(`${typeof window !== "undefined" ? window.location.origin : ""}${liveUrl ?? `/l/${finalSlug}`}`)}
              className="btn-secondary text-xs shrink-0"
            >
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div>
          <h3 className="text-lg font-bold text-white">Vista previa</h3>
          <p className="text-xs text-white/30 mt-0.5">Así se verá tu página para quien abra el enlace.</p>
        </div>
        {preview}
      </div>
    </div>
  );
}