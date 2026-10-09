"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  FOOD_CATALOG,
  calcularMacros,
  sumarMacros,
  type FoodItem,
} from "@/lib/food-catalog";

interface ItemUI {
  nombre: string;
  nombreCatalogo: string | null;
  alimentoId: string | null;
  matched: boolean;
  fuente: "catalogo" | "ia";
  gramos: number;
  confianza: number;
  food: FoodItem;
}

function downscaleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo procesar la imagen"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function MacroBloque({ label, valor, unidad, color }: { label: string; valor: number; unidad: string; color: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
      <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {valor}
        <span className="text-sm font-normal text-white/40 ml-1">{unidad}</span>
      </p>
    </div>
  );
}

export default function MealScanner({ email }: { email?: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [imagen, setImagen] = useState<string | null>(null);
  const [indicaciones, setIndicaciones] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ItemUI[] | null>(null);
  const [camaraOn, setCamaraOn] = useState(false);
  const [camaraError, setCamaraError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if ((email ?? "").toLowerCase() !== "pruebachequeo430@gmail.com") return null;

  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraOn(false);
  };

  const abrirCamara = async () => {
    setCamaraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no soportado");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamaraOn(true);
    } catch {
      setCamaraError("No pudimos abrir la cámara. Podés subir una foto desde la galería.");
    }
  };

  const capturar = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const max = 1024;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > h && w > max) {
      h = Math.round((h * max) / w);
      w = max;
    } else if (h > max) {
      w = Math.round((w * max) / h);
      h = max;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    // Círculo de referencia de escala (plato ~26 cm) dibujado en la imagen.
    const cx = w / 2;
    const cy = h / 2;
    const r = (Math.min(w, h) * 0.78) / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = Math.max(2, Math.round(w / 300));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    setImagen(canvas.toDataURL("image/jpeg", 0.85));
    setItems(null);
    cerrarCamara();
  };

  useEffect(() => {
    if (abierto && !imagen) {
      abrirCamara();
    } else {
      cerrarCamara();
    }
    return () => cerrarCamara();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    cerrarCamara();
    setError("");
    setItems(null);
    setProcesando(true);
    try {
      const dataUrl = await downscaleImage(file);
      setImagen(dataUrl);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo procesar la imagen");
    } finally {
      setProcesando(false);
    }
  };

  const analizar = async () => {
    if (!imagen) return;
    setError("");
    setAnalizando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión expirada. Volvé a entrar.");
      const res = await fetch("/api/meal-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: imagen, indicaciones }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo analizar la imagen");
      const lista: ItemUI[] = (json.alimentos ?? []).map((a: any) => ({
        nombre: a.nombre,
        nombreCatalogo: a.nombreCatalogo ?? null,
        alimentoId: a.alimentoId ?? null,
        matched: !!a.matched,
        fuente: a.fuente === "catalogo" ? "catalogo" : "ia",
        gramos: Number(a.gramos) || 0,
        confianza: Number(a.confianza) || 0,
        food: a.food as FoodItem,
      }));
      setItems(lista);
    } catch (e: any) {
      setError(e?.message ?? "Error al analizar");
    } finally {
      setAnalizando(false);
    }
  };

  const setGramos = (idx: number, gramos: number) => {
    setItems((prev) => prev?.map((it, i) => (i === idx ? { ...it, gramos: Math.max(0, gramos) } : it)) ?? prev);
  };

  const asignarFood = (idx: number, foodId: string) => {
    const food = FOOD_CATALOG.find((f) => f.id === foodId);
    if (!food) return;
    setItems((prev) => prev?.map((it, i) => (i === idx ? { ...it, food, alimentoId: food.id, matched: true, fuente: "catalogo" as const, nombreCatalogo: food.nombre } : it)) ?? prev);
  };

  const totales = useMemo(() => {
    if (!items || items.length === 0) return null;
    return sumarMacros(items.map((it) => calcularMacros(it.food, it.gramos)));
  }, [items]);

  const cerrar = () => {
    setAbierto(false);
    setImagen(null);
    setItems(null);
    setError("");
    setIndicaciones("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="card-hover w-full flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
            Escanear comida <span className="badge-green text-[10px]">Beta</span>
          </p>
          <p className="text-xs text-white/40">Sacá una foto y obtené los macros</p>
        </div>
        <Sparkles className="w-4 h-4 text-white/30" />
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-6" onClick={cerrar}>
          <div
            className="card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" /> Escanear comida
              </h2>
              <button onClick={cerrar} className="text-white/40 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />

            {!imagen ? (
              <div className="space-y-3">
                {camaraOn ? (
                  <>
                    <div className="relative overflow-hidden rounded-2xl bg-black">
                      <video ref={videoRef} playsInline muted className="w-full max-h-[60vh] object-cover" />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="w-[78%] aspect-square rounded-full ring-2 ring-cyan-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                      </div>
                      <div className="pointer-events-none absolute left-[11%] right-[11%] scanline">
                        <div className="h-0.5 bg-cyan-400 shadow-[0_0_12px_3px_rgba(34,211,238,0.9)]" />
                      </div>
                    </div>
                    <p className="text-xs text-white/50 text-center">Encuadrá el plato dentro del círculo</p>
                    <div className="flex gap-2">
                      <button onClick={capturar} className="btn-primary flex-1 flex items-center justify-center gap-2">
                        <Camera className="w-4 h-4" /> Capturar
                      </button>
                      <button onClick={() => inputRef.current?.click()} className="btn-secondary">Subir</button>
                    </div>
                  </>
                ) : procesando ? (
                  <div className="w-full border-2 border-dashed border-white/15 rounded-2xl py-12 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <span className="text-sm text-white/50">Procesando imagen...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={abrirCamara}
                      className="w-full border-2 border-dashed border-white/15 rounded-2xl py-10 flex flex-col items-center gap-3 hover:border-accent/50 transition-colors"
                    >
                      <Camera className="w-8 h-8 text-white/40" />
                      <span className="text-sm text-white/50">Abrir cámara</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="btn-secondary w-full text-sm"
                    >
                      Subir foto desde la galería
                    </button>
                    {camaraError && <p className="text-xs text-amber-400 text-center">{camaraError}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagen} alt="Comida" className="w-full rounded-xl max-h-64 object-cover" />
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80"
                  >
                    Cambiar
                  </button>
                </div>

                <textarea
                  className="input w-full text-sm resize-none"
                  rows={2}
                  placeholder="Indicaciones (opcional): ej. una cuchara de aceite, una taza de arroz"
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                />

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  onClick={analizar}
                  disabled={analizando}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {analizando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Analizar comida
                    </>
                  )}
                </button>

                {items && items.length === 0 && (
                  <p className="text-sm text-white/40 text-center py-2">
                    No se reconoció comida en la foto. Probá con otra imagen.
                  </p>
                )}

                {items && items.length > 0 && (
                  <div className="space-y-4">
                    {totales && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wider text-white/40">Total del plato</p>
                        <div className="grid grid-cols-2 gap-2">
                          <MacroBloque label="Calorías" valor={totales.kcal} unidad="kcal" color="text-white" />
                          <MacroBloque label="Carbohidratos" valor={totales.carbohidratos} unidad="g" color="text-amber-400" />
                          <MacroBloque label="Proteína" valor={totales.proteina} unidad="g" color="text-cyan-400" />
                          <MacroBloque label="Grasa" valor={totales.grasas} unidad="g" color="text-pink-400" />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-white/50">
                      Si sabés las cantidades exactas, podés modificar los gramos de cada alimento abajo.
                    </p>

                    <div className="space-y-3">
                      {items.map((it, i) => {
                        const macros = calcularMacros(it.food, it.gramos);
                        return (
                          <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {it.food.nombre}
                                {it.fuente === "ia" && <span className="ml-1.5 text-[10px] text-white/30">(estimado IA)</span>}
                              </p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                                it.confianza >= 0.6 ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
                              }`}>
                                {Math.round(it.confianza * 100)}%
                              </span>
                            </div>

                            {it.fuente === "ia" && (
                              <div className="space-y-1">
                                <p className="text-[11px] text-white/40">Estimado por IA. Si está en el catálogo, precisalo:</p>
                                <select
                                  className="input w-full text-sm"
                                  value=""
                                  onChange={(e) => asignarFood(i, e.target.value)}
                                >
                                  <option value="">Elegir alimento...</option>
                                  {FOOD_CATALOG.map((f) => (
                                    <option key={f.id} value={f.id}>{f.nombre}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={500}
                                step={5}
                                value={it.gramos}
                                onChange={(e) => setGramos(i, Number(e.target.value))}
                                className="flex-1 accent-cyan-400"
                              />
                              <input
                                type="number"
                                min={0}
                                value={it.gramos}
                                onChange={(e) => setGramos(i, Number(e.target.value))}
                                className="input w-20 text-sm text-right"
                              />
                              <span className="text-xs text-white/40">g</span>
                            </div>

                            <p className="text-[11px] text-white/40">
                              {macros.kcal} kcal · C {macros.carbohidratos}g · P {macros.proteina}g · G {macros.grasas}g
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-white/20 text-center">
                      Estimación con IA. Ajustá los gramos si hace falta.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes scanmove { 0%, 100% { top: 12%; } 50% { top: 88%; } }
        .scanline { animation: scanmove 2.4s ease-in-out infinite; }
      `}</style>
    </>
  );
}
