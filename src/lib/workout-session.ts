import { useAppStore, type SesionEntreno } from "@/lib/store";

// ─── Persistencia del entrenamiento EN CURSO del alumno ─────────────────────
// Fuente única de verdad: sesionesEntreno del store (en memoria) + un snapshot
// en localStorage keyed por alumnoId (aislamiento entre usuarios).
// Se guarda progresivamente en cada mutación y al pasar la app a background.
// Solo almacena la sesión ACTIVA; al completarse el entreno se limpia.

export const WORKOUT_SESSION_VERSION = 1;

export interface WorkoutSessionSnapshot {
  version: number;
  alumnoId: string;
  sesion: SesionEntreno;
  currentWeek: number | null;
  currentEjIndex: number;
  currentSet: number;
  ejCompletados: number[];
  setsCompletadosLocal: string[];
  pesosInput: Record<string, string>;
  restEndTime: number | null;
  restActive: boolean;
  updatedAt: number;
}

function keyFor(alumnoId: string): string {
  return `viking_workout_session_v${WORKOUT_SESSION_VERSION}_${alumnoId}`;
}

export function saveSessionSnapshot(alumnoId: string, snap: WorkoutSessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(alumnoId), JSON.stringify({ ...snap, alumnoId, updatedAt: Date.now() }));
  } catch {}
}

export function loadSessionSnapshot(alumnoId: string): WorkoutSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(alumnoId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== WORKOUT_SESSION_VERSION || data.alumnoId !== alumnoId) return null;
    return data as WorkoutSessionSnapshot;
  } catch {
    return null;
  }
}

export function clearSessionSnapshot(alumnoId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyFor(alumnoId));
  } catch {}
}

// Validación: mismo alumno, sesión NO completada, misma rutina/día y que todos
// los ejercicios de la sesión sigan existiendo en el día actual (rutina nueva
// incompatible NO se restaura sobre la anterior).
export function isSnapshotValidFor(
  snap: WorkoutSessionSnapshot | null,
  alumnoId: string,
  rutinaId: string,
  diaRutinaId: string,
  exerciseIds: string[]
): boolean {
  if (!snap) return false;
  if (snap.alumnoId !== alumnoId) return false;
  const s = snap.sesion;
  if (!s || s.completada || s.alumnoId !== alumnoId) return false;
  if (s.rutinaId !== rutinaId || s.diaRutinaId !== diaRutinaId) return false;
  if (!Array.isArray(s.series)) return false;
  const valid = new Set(exerciseIds);
  if (s.series.some((ser) => !valid.has(ser.ejercicioId))) return false;
  return true;
}

export function injectSessionIntoStore(sesion: SesionEntreno): void {
  const state = useAppStore.getState();
  const already = state.sesionesEntreno.some((s) => s.id === sesion.id);
  if (already) return;
  useAppStore.setState({
    sesionesEntreno: [
      sesion,
      ...state.sesionesEntreno.filter(
        (s) => s.alumnoId !== sesion.alumnoId || s.completada
      ),
    ],
  });
}

// Restaura el snapshot en el store y lo devuelve (null si no hay sesión activa).
export function restoreWorkoutSession(alumnoId: string): WorkoutSessionSnapshot | null {
  const snap = loadSessionSnapshot(alumnoId);
  if (!snap || snap.sesion.completada) return null;
  injectSessionIntoStore(snap.sesion);
  return snap;
}