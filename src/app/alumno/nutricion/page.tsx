"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getStudentNutritionPlans } from "@/lib/data";
import { ESCANER_TEST_EMAIL } from "@/lib/meal-log";
import { mostrarNovedadEscaner } from "@/lib/escaner-novedad";

const DIAS_SEMANA = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const MEAL_CHECK_KEY = "viking_meal_checks";

function loadChecks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(MEAL_CHECK_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveChecks(ids: Set<string>) {
  try { localStorage.setItem(MEAL_CHECK_KEY, JSON.stringify([...ids])); } catch {}
}

export default function StudentNutricionPage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const getPlanesAlumno = useAppStore((s) => s.getPlanesAlumno);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(loadChecks);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const alumno = alumnos.find((a) => a.email === usuario?.email);

  // Badge "NUEVO": se calcula en el cliente (localStorage) para evitar
  // desajustes de hidratación.
  useEffect(() => {
    if (!alumno?.id) return;
    setMostrarNuevo(mostrarNovedadEscaner(alumno.id));
  }, [alumno?.id]);

  // Re-fetch nutrition plans from Supabase on mount
  useEffect(() => {
    if (!usuario?.id || !alumno) return;
    const fetch = async () => {
      setRefreshing(true);
      try {
        const plans = await getStudentNutritionPlans(usuario.id);
        if (plans.length > 0) {
          useAppStore.setState((state) => ({
            planesNutricionales: [
              ...state.planesNutricionales.filter((p) => p.alumnoId !== usuario.id),
              ...plans,
            ],
          }));
        }
      } catch {}
      setRefreshing(false);
    };
    fetch();
  }, [usuario?.id, alumno?.id]);

  const planesAlumno = alumno ? getPlanesAlumno(alumno.id) : [];
  const plan = planesAlumno[0];

  const hoy = new Date();
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const diaHoy = diasSemana[hoy.getDay()];

  const toggleMeal = (mealId: string) => {
    setCheckedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      saveChecks(next);
      return next;
    });
  };

  if (!alumno) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <p className="text-white/40">No tienes un perfil de alumno registrado.</p>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Mi Nutrición</h1>
        <p className="text-white/40 text-sm mt-0.5">{plan?.nombre ?? "Tu plan de alimentación"}</p>
      </div>

      <Link
        href="/alumno/nutricion/escanear"
        className="card-hover animate-escaner-glow w-full flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Escanear mi comida</p>
            {mostrarNuevo && (
              <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent text-bg-primary shadow-[0_0_10px_rgba(0,229,255,0.55)]">
                Nuevo
              </span>
            )}
          </div>
          <p className="text-xs text-white/40">Identifica calorías y macros de tu plato</p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30" />
      </Link>

      {!plan && refreshing && (
        <div className="card text-center py-10">
          <p className="text-white/30">Cargando plan nutricional...</p>
        </div>
      )}

      {!plan && !refreshing && (
        <div className="card text-center py-10">
          <p className="text-white/40 mb-2">Aún no tienes un plan nutricional</p>
          <p className="text-white/20 text-sm">Tu coach te asignará uno pronto.</p>
        </div>
      )}

      {plan && DIAS_SEMANA.map((d) => {
        const dia = plan!.dias.find((pd) => pd.diaSemana === d.value);
        const esHoy = d.value === diaHoy;
        return (
          <div key={d.value} className={`card ${esHoy ? "card-glow" : ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${esHoy ? "bg-accent" : "bg-white/20"}`} />
              <p className={`text-sm font-semibold uppercase tracking-wider ${esHoy ? "text-accent" : "text-white/50"}`}>
                {d.label}
                {esHoy && <span className="text-xs font-normal ml-2">(Hoy)</span>}
              </p>
            </div>
            {dia ? (
              <div className="space-y-3">
                {dia.comidas.map((c) => (
                  <div key={c.id} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => toggleMeal(`${dia.id}_${c.id}`)} type="button" className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                        checkedMeals.has(`${dia.id}_${c.id}`) ? "bg-accent border-accent" : "border-white/30 hover:border-accent/60"
                      }`}>
                        {checkedMeals.has(`${dia.id}_${c.id}`) && <span className="block text-[8px] text-white text-center leading-none">✓</span>}
                      </button>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${checkedMeals.has(`${dia.id}_${c.id}`) ? "text-white/30 line-through" : "text-accent"}`}>{c.tipo}</span>
                      {c.nombre && <span className="text-xs text-white/40">— {c.nombre}</span>}
                    </div>
                    <p className="text-sm text-white/70">{c.alimentos.join(", ")}</p>
                    {c.instrucciones && (
                      <p className="text-xs text-white/30 mt-1 italic">{c.instrucciones}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/20 text-center py-4">Sin comidas cargadas</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
