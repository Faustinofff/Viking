"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Dumbbell,
  Lightbulb,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import AppBrandMark from "@/components/app-brand";
import { StudentInvitation } from "@/components/student-invitation";
import {
  getCoachOnboardingState,
  saveCoachOnboardingState,
  type CoachOnboardingState,
} from "@/lib/data";
import { useAppStore } from "@/lib/store";

export type CoachOnboardingEvent =
  | "routine_builder_opened"
  | "routine_name_filled"
  | "routine_day_added"
  | "routine_exercise_added"
  | "routine_config_changed"
  | "routine_saved";

interface CoachOnboardingContextValue {
  state: CoachOnboardingState | null;
  track: (event: CoachOnboardingEvent) => void;
}

const CoachOnboardingContext = createContext<CoachOnboardingContextValue>({
  state: null,
  track: () => {},
});

export function useCoachOnboarding() {
  return useContext(CoachOnboardingContext);
}

type TourStep = {
  id: string;
  target: string;
  event: CoachOnboardingEvent;
  title: string;
  description: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "new-routine",
    target: "new-routine",
    event: "routine_builder_opened",
    title: "Creá tu primera rutina",
    description: "Tocá «+ Nueva Rutina». Se va a abrir el editor real donde armás tus entrenamientos.",
  },
  {
    id: "name",
    target: "routine-name",
    event: "routine_name_filled",
    title: "Ponéle un nombre",
    description: "Escribí un nombre claro, por ejemplo «Full Body» o «Push Pull Legs».",
  },
  {
    id: "days",
    target: "add-day",
    event: "routine_day_added",
    title: "Armá los días",
    description: "Agregá los días de entrenamiento de tu planificación.",
  },
  {
    id: "exercises",
    target: "add-exercise",
    event: "routine_exercise_added",
    title: "Incorporá ejercicios",
    description: "Buscá en tu biblioteca y agregá ejercicios a cada día.",
  },
  {
    id: "settings",
    target: "exercise-settings",
    event: "routine_config_changed",
    title: "Ajustá cada ejercicio",
    description: "Configurá series, repeticiones y descansos. Podés hacerlo por semana.",
  },
  {
    id: "save",
    target: "save-routine",
    event: "routine_saved",
    title: "Guardá tu rutina",
    description: "Cuando esté lista, guardala. Vos decidís si es para un alumno o queda como borrador.",
  },
];

const LEARNED_ITEMS = [
  { id: "new-routine", label: "Crear una rutina", Icon: ClipboardList },
  { id: "days", label: "Agregar días de entrenamiento", Icon: CalendarDays },
  { id: "exercises", label: "Incorporar ejercicios", Icon: Dumbbell },
  { id: "settings", label: "Organizar una planificación", Icon: Lightbulb },
];

type Rect = { top: number; left: number; width: number; height: number; bottom: number };

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}

function SuccessCheck() {
  return (
    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/25">
      <svg viewBox="0 0 52 52" className="h-11 w-11 text-accent" fill="none" aria-hidden="true">
        <path
          d="M14 27l8 8 16-18"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-check-draw"
        />
      </svg>
    </div>
  );
}

export function CoachOnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const usuario = useAppStore((s) => s.usuarioActual);

  const [state, setState] = useState<CoachOnboardingState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const stateRef = useRef<CoachOnboardingState | null>(null);
  const activeRef = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const setActiveBoth = useCallback((value: boolean) => {
    activeRef.current = value;
    setActive(value);
  }, []);

  const persist = useCallback((next: CoachOnboardingState) => {
    const id = usuario?.id;
    if (!id) return;
    saveQueue.current = saveQueue.current
      .then(() => saveCoachOnboardingState(id, next))
      .catch((error) => console.error("No se pudo guardar el estado del onboarding:", error));
  }, [usuario?.id]);

  const apply = useCallback((updater: (prev: CoachOnboardingState | null) => CoachOnboardingState | null) => {
    const prev = stateRef.current;
    const next = updater(prev);
    if (!next || next === prev) return;
    stateRef.current = next;
    setState(next);
    persist(next);
  }, [persist]);

  const exitTour = useCallback(() => {
    apply((prev) => prev ? { ...prev, status: "in_progress", checklistHidden: false } : prev);
    setActiveBoth(false);
  }, [apply, setActiveBoth]);

  useEffect(() => {
    let cancel = false;
    if (!usuario?.id || usuario.rol !== "coach") {
      stateRef.current = null;
      setState(null);
      setActiveBoth(false);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    getCoachOnboardingState(usuario.id)
      .then((next) => {
        if (cancel) return;
        stateRef.current = next;
        setState(next);
        setLoaded(true);
      })
      .catch((error) => {
        console.error("No se pudo leer el estado del onboarding:", error);
        if (!cancel) setLoaded(true);
      });
    return () => { cancel = true; };
  }, [usuario?.id, usuario?.rol, setActiveBoth]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && stateRef.current?.phase === "tour") exitTour();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, exitTour]);

  // El spotlight sigue al elemento real del flujo de rutinas.
  useEffect(() => {
    if (!active || !state || state.phase !== "tour") {
      setTargetRect(null);
      return;
    }
    const step = TOUR_STEPS[state.step];
    if (!step) return;
    let frame = 0;
    const measure = () => {
      const el = document.querySelector(`[data-onboarding="${step.target}"]`) as HTMLElement | null;
      const rect: Rect | null = el ? {
        top: el.getBoundingClientRect().top,
        left: el.getBoundingClientRect().left,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        bottom: el.getBoundingClientRect().bottom,
      } : null;
      setTargetRect((prev) => sameRect(prev, rect) ? prev : rect);
      setViewport((prev) => prev.width === window.innerWidth && prev.height === window.innerHeight
        ? prev
        : { width: window.innerWidth, height: window.innerHeight });
    };
    frame = requestAnimationFrame(measure);
    const delayed = setTimeout(measure, 220);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(delayed);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer.disconnect();
    };
  }, [active, state?.phase, state?.step, pathname]);

  const start = useCallback(() => {
    apply((prev) => prev ? {
      ...prev,
      status: "in_progress",
      phase: "tour",
      step: 0,
      checklistHidden: false,
    } : prev);
    setShowInvite(false);
    setActiveBoth(true);
    if (pathname !== "/dashboard/rutinas") router.push("/dashboard/rutinas");
  }, [apply, pathname, router, setActiveBoth]);

  const resume = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    setShowInvite(false);
    setActiveBoth(true);
    if (current.phase === "tour") {
      if (current.step > 0) {
        const needsBuilder = !document.querySelector('[data-onboarding="routine-name"]');
        const target = needsBuilder
          ? "/dashboard/rutinas?onboardingResume=1"
          : "/dashboard/rutinas";
        if (pathname !== "/dashboard/rutinas" || needsBuilder) router.push(target);
      } else if (pathname !== "/dashboard/rutinas") {
        router.push("/dashboard/rutinas");
      }
    }
  }, [pathname, router, setActiveBoth]);

  const dismiss = useCallback(() => {
    apply((prev) => prev ? { ...prev, status: "dismissed", checklistHidden: true } : prev);
    setActiveBoth(false);
  }, [apply, setActiveBoth]);

  function finish() {
    apply((prev) => prev ? {
      ...prev,
      status: "completed",
      phase: "students",
      studentsHandled: true,
      checklistHidden: true,
    } : prev);
    setActiveBoth(false);
    setShowInvite(false);
  }

  function skipStep() {
    const current = stateRef.current;
    if (!current || current.phase !== "tour") return;
    if (current.step >= TOUR_STEPS.length - 1) {
      exitTour();
      return;
    }
    apply((prev) => prev ? { ...prev, step: prev.step + 1 } : prev);
  }

  function goBack() {
    apply((prev) => prev && prev.step > 0 ? { ...prev, step: prev.step - 1 } : prev);
  }

  const track = useCallback((event: CoachOnboardingEvent) => {
    const current = stateRef.current;
    if (!current || current.status !== "in_progress" || current.phase !== "tour") return;
    const index = TOUR_STEPS.findIndex((step) => step.event === event);
    if (index < 0) return;
    const isLast = index === TOUR_STEPS.length - 1;

    if (index !== current.step) {
      // Si guardó una rutina fuera del paso final, la registramos igual para
      // que la checklist refleje la acción real, sin mostrar el logro falso.
      if (event === "routine_saved" && !current.firstRoutineCreated) {
        apply((prev) => prev ? { ...prev, firstRoutineCreated: true } : prev);
      }
      return;
    }

    apply((prev) => {
      if (!prev) return prev;
      const completedSteps = event === "routine_saved"
        ? prev.completedSteps
        : Array.from(new Set([...prev.completedSteps, TOUR_STEPS[index].id]));
      return {
        ...prev,
        completedSteps,
        step: isLast ? prev.step : prev.step + 1,
        firstRoutineCreated: event === "routine_saved" ? true : prev.firstRoutineCreated,
        phase: isLast
          ? (activeRef.current ? "routine_success" : "students")
          : "tour",
      };
    });
  }, [apply]);

  const goToRegisteredStudents = useCallback(() => {
    finish();
    router.push("/dashboard/redes");
  }, [router]);

  const cardStyle = useMemo<CSSProperties>(() => {
    if (!targetRect || !viewport.width) {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(420px, calc(100vw - 24px))" };
    }
    const isMobile = viewport.width < 640;
    const cardWidth = Math.min(420, viewport.width - 24);
    const estimatedHeight = isMobile ? 232 : 206;
    const gap = 12;
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    left = Math.max(12, Math.min(left, viewport.width - cardWidth - 12));
    let top = targetRect.bottom + gap;
    if (top + estimatedHeight > viewport.height - 12) top = targetRect.top - estimatedHeight - gap;
    if (top < 12) top = Math.max(12, Math.min(targetRect.top, viewport.height - estimatedHeight - 12));
    return { left, top, width: cardWidth };
  }, [targetRect, viewport]);

  const isCoach = usuario?.rol === "coach";
  const showWelcome = Boolean(isCoach && loaded && state?.status === "not_started");
  const showTour = Boolean(isCoach && active && state?.status === "in_progress" && state.phase === "tour");
  const showSuccess = Boolean(isCoach && active && state?.status === "in_progress" && state.phase === "routine_success");
  const showStudents = Boolean(isCoach && active && state?.status === "in_progress" && state.phase === "students");
  const showChecklist = Boolean(
    isCoach && loaded && pathname === "/dashboard" &&
    state?.status === "in_progress" && !state.checklistHidden
  );
  const currentStep = state ? TOUR_STEPS[state.step] : undefined;

  const learnedItems = state
    ? LEARNED_ITEMS.filter((item) => state.completedSteps.includes(item.id))
    : [];
  const summaryItems = learnedItems.length > 0 ? learnedItems : LEARNED_ITEMS.slice(0, 1);

  return (
    <CoachOnboardingContext.Provider value={{ state, track }}>
      {showChecklist && state && (
        <div className="mx-auto max-w-5xl px-5 pt-5 sm:px-8 sm:pt-6">
          <div className="card !p-4 border-accent/15 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-sm font-semibold text-white">Guía de inicio</p>
                  <span className="badge bg-white/[0.05] text-white/40">Opcional</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${state.firstRoutineCreated ? "text-accent" : "text-white/45"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${state.firstRoutineCreated ? "border-accent bg-accent/15" : "border-white/20"}`}>
                      {state.firstRoutineCreated && <Check className="h-2.5 w-2.5" />}
                    </span>
                    Crear tu primera rutina
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-xs ${state.studentsHandled ? "text-accent" : "text-white/45"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${state.studentsHandled ? "border-accent bg-accent/15" : "border-white/20"}`}>
                      {state.studentsHandled && <Check className="h-2.5 w-2.5" />}
                    </span>
                    Incorporar o invitar a un alumno
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={resume} className="btn-primary !px-4 !py-2 text-xs">Continuar guía</button>
                <button onClick={() => apply((prev) => prev ? { ...prev, checklistHidden: true } : prev)} className="btn-ghost !px-3 !py-2 text-xs">Ocultar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {children}

      {showWelcome && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="viking-onboarding-welcome-title"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="card relative w-full max-w-md p-7 text-center animate-fade-in sm:p-9">
            <button onClick={dismiss} aria-label="Cerrar bienvenida" className="absolute right-4 top-4 rounded-lg p-1 text-white/35 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.06]">
              <AppBrandMark size={44} showName={false} />
            </div>
            <h2 id="viking-onboarding-welcome-title" className="text-2xl font-bold tracking-tight text-white">
              Bienvenido a Viking
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/60">
              Organizá tus entrenamientos, gestioná tus alumnos y hacé un seguimiento de su progreso desde un mismo lugar.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-white/35">
              Te mostramos cómo empezar con un recorrido práctico de unos minutos.
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <button onClick={start} className="btn-primary w-full sm:flex-1">Comenzar recorrido</button>
              <button onClick={dismiss} className="btn-secondary w-full sm:flex-1">Explorar por mi cuenta</button>
            </div>
          </div>
        </div>
      )}

      {showTour && currentStep && (
        <div className="pointer-events-none fixed inset-0 z-[80] animate-spotlight-in" aria-live="polite">
          {targetRect ? (
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                left: targetRect.left - 6,
                top: targetRect.top - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                borderRadius: 14,
                border: "1px solid rgba(0, 212, 170, 0.55)",
                boxShadow: "0 0 0 9999px rgba(3, 6, 8, 0.66), 0 0 22px rgba(0, 212, 170, 0.14)",
                pointerEvents: "none",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
          )}

          <div
            role="dialog"
            aria-label={currentStep.title}
            className="card pointer-events-auto fixed z-[82] !p-4 shadow-2xl sm:!p-5"
            style={cardStyle}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                Paso {state!.step + 1} de {TOUR_STEPS.length}
              </span>
              <button onClick={exitTour} aria-label="Salir del recorrido" className="rounded-lg p-1 text-white/35 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="text-base font-semibold text-white">{currentStep.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">{currentStep.description}</p>
            {!targetRect && pathname !== "/dashboard/rutinas" && (
              <button onClick={() => router.push("/dashboard/rutinas")} className="btn-ghost mt-2 !px-2 !py-1 text-xs text-accent">
                Ir a Rutinas
              </button>
            )}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex gap-1">
                {state!.step > 0 && (
                  <button onClick={goBack} className="btn-ghost !px-2 !py-1.5 text-xs inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Anterior
                  </button>
                )}
                <button onClick={skipStep} className="btn-ghost !px-2 !py-1.5 text-xs">
                  {state!.step === TOUR_STEPS.length - 1 ? "Salir" : "Omitir paso"}
                </button>
              </div>
              <button onClick={exitTour} className="text-[11px] text-white/30 transition-colors hover:text-white/60">
                Salir del recorrido
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="viking-first-routine-title"
          className="fixed inset-0 z-[92] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="card relative w-full max-w-lg p-7 text-center animate-fade-in sm:p-9">
            <button
              onClick={() => apply((prev) => prev ? { ...prev, phase: "students" } : prev)}
              aria-label="Continuar"
              className="absolute right-4 top-4 rounded-lg p-1 text-white/35 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SuccessCheck />
            <h2 id="viking-first-routine-title" className="text-2xl font-bold tracking-tight text-white">
              ¡Tu primera rutina está lista!
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Creaste tu primera rutina y ya conocés las herramientas básicas para organizar tus entrenamientos en Viking.
            </p>
            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left">
              <p className="label mb-3">Lo que aprendiste</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {summaryItems.map(({ id, label, Icon }) => (
                  <div key={id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs text-white/70">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setShowInvite(false); apply((prev) => prev ? { ...prev, phase: "students" } : prev); }}
              className="btn-primary mt-6 w-full sm:w-auto sm:px-10"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {showStudents && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="viking-students-title"
          className="fixed inset-0 z-[92] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="card relative my-auto w-full max-w-xl p-6 animate-fade-in sm:p-8">
            <button onClick={finish} aria-label="Cerrar" className="absolute right-4 top-4 rounded-lg p-1 text-white/35 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            {!showInvite ? (
              <>
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.06] text-accent">
                  <UsersRound className="h-5 w-5" />
                </span>
                <h2 id="viking-students-title" className="text-xl font-bold tracking-tight text-white">
                  ¿Querés agregar a tus alumnos?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  Podés incorporar a tus alumnos a Viking para organizar sus entrenamientos y realizar su seguimiento desde la plataforma.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button onClick={goToRegisteredStudents} className="card-hover !p-4 text-left">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/70">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-semibold text-white">Mis alumnos ya se registraron</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">Agregá a los alumnos que ya tienen una cuenta en Viking.</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">Agregar alumnos →</span>
                  </button>
                  <button onClick={() => setShowInvite(true)} className="card-hover !p-4 text-left">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-semibold text-white">Mis alumnos aún no se registraron</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">Compartiles el link de acceso para que creen su cuenta y puedas agregarlos a tu lista.</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">Ver invitación →</span>
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row">
                  <button onClick={() => setShowInvite(true)} className="btn-secondary flex-1">Compartir invitación</button>
                  <button onClick={finish} className="btn-primary flex-1">Omitir y terminar</button>
                </div>
                <p className="mt-3 text-center text-[11px] text-white/30">Este paso es opcional. Podés hacerlo cuando quieras desde Alumnos.</p>
              </>
            ) : (
              <>
                <button onClick={() => setShowInvite(false)} className="mb-4 inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-white">
                  <ArrowLeft className="h-3 w-3" /> Volver a las opciones
                </button>
                <StudentInvitation />
                <button onClick={finish} className="btn-primary mt-5 w-full">Finalizar guía</button>
              </>
            )}
          </div>
        </div>
      )}
    </CoachOnboardingContext.Provider>
  );
}
