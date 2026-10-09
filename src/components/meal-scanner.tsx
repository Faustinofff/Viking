"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  FOOD_CATALOG,
  calcularMacros,
  sumarMacros,
  type FoodItem,
  type Macros,
} from "@/lib/food-catalog";

interface ItemUI {
  nombre: string;
  nombreCatalogo: string | null;
  alimentoId: string | null;
  matched: boolean;
  gramos: number;
  confianza: number;
  food: FoodItem | null;
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

function MacroResumen({ macros }: { macros: Macros }) {
  const total = macros.proteina * 4 + macros.carbohidratos * 4 + macros.grasas * 9;
  const p = total > 0 ? (macros.proteina * 4) / total : 0;
  const c = total > 0 ? (macros.carbohidratos * 4) / total : 0;
  const g = total > 0 ? (macros.grasas * 9) / total : 0;
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
        <div className="bg-cyan-400" style={{ width: `${p * 100}%` }} />
        <div className="bg-amber-400" style={{ width: `${c * 100}%` }} />
        <div className="bg-pink-400" style={{ width: `${g * 100}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-cyan-400 font-medium">P {macros.proteina}g</span>
        <span className="text-amber-400 font-medium">C {macros.carbohidratos}g</span>
        <span className="text-pink-400 font-medium">G {macros.grasas}g</span>
        <span className="text-white font-semibold">{macros.kcal} kcal</span>
      </div>
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
  const inputRef = useRef<HTMLInputElement>(null);

  if ((email ?? "").toLowerCase() !== "pruebachequeo430@gmail.com") return null;

  const onFile = async (file?: File | null) => {
    if (!file) return;
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
        ...a,
        food: a.alimentoId ? FOOD_CATALOG.find((f) => f.id === a.alimentoId) ?? null : null,
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
    const food = FOOD_CATALOG.find((f) => f.id === foodId) ?? null;
    setItems((prev) => prev?.map((it, i) => (i === idx ? { ...it, food, alimentoId: food?.id ?? null, matched: !!food, nombreCatalogo: food?.nombre ?? null } : it)) ?? prev);
  };

  const totales = useMemo(() => {
    if (!items) return null;
    const macros = items.filter((it) => it.food).map((it) => calcularMacros(it.food as FoodItem, it.gramos));
    if (macros.length === 0) return null;
    return sumarMacros(macros);
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
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />

            {!imagen ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={procesando}
                className="w-full border-2 border-dashed border-white/15 rounded-2xl py-12 flex flex-col items-center gap-3 hover:border-accent/50 transition-colors"
              >
                {procesando ? (
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white/40" />
                )}
                <span className="text-sm text-white/50">Sacar o subir una foto de la comida</span>
              </button>
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
                  <div className="space-y-3">
                    {totales && (
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Total estimado</p>
                        <MacroResumen macros={totales} />
                      </div>
                    )}

                    {items.map((it, i) => {
                      const macros = it.food ? calcularMacros(it.food, it.gramos) : null;
                      return (
                        <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">{it.food?.nombre ?? it.nombre}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                              it.confianza >= 0.6 ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
                            }`}>
                              {Math.round(it.confianza * 100)}%
                            </span>
                          </div>

                          {!it.food && (
                            <div className="space-y-1">
                              <p className="text-[11px] text-amber-400">No está en el catálogo. Asigná uno:</p>
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

                          {macros && (
                            <p className="text-[11px] text-white/40">
                              {macros.kcal} kcal · P {macros.proteina}g · C {macros.carbohidratos}g · G {macros.grasas}g
                            </p>
                          )}
                        </div>
                      );
                    })}

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
    </>
  );
}
