import { create } from "zustand";
import { supabase } from "./supabase";
import { signOut as supabaseSignOut } from "./auth";
import {
  findStudentByEmail,
  linkStudentToCoach,
  getCoachStudents,
  getCoachWorkoutPlans,
  getCoachNutritionPlans,
  createWorkoutPlan,
  getStudentWorkoutPlans,
  saveNutritionPlan,
  getStudentNutritionPlans,
  deleteWorkoutPlan,
  updateWorkoutPlan,
  parseIndicacionesSemanales,
  removeStudentFromCoach,
  saveWaterEntry,
  removeWaterEntry,
  getWaterToday,
  saveStudentActivity,
  getStudentsActivities,
  getCoachByStudentEmail,
  saveStudentPhone,
  getStudentPhone,
  saveStudentWeight,
  getStudentWeight,
  saveCoachExercises,
  getCoachExercises,
  saveAgendaForCoach,
  getCoachAgenda,
  saveRedesForCoach,
  getCoachRedes,
  saveCoachUnassignedRoutines,
  getCoachUnassignedRoutines,
  saveCoachUnassignedPlans,
  getCoachUnassignedPlans,
  getCurrentWeekIndex,
  ejercicioWeekValue,
  getCoachPhone,
  getCoachSubscription,
  saveCoachSubscription,
  getPremium,
  savePremium,
  getStudentCurrentWeek,
  saveStudentCurrentWeek,
  saveStudentApodo,
  loadStudentApodos,
  saveEjercicioTutorial,
  loadEjercicioTutoriales,
  PLANES_PREMIUM,
  esCoachGratuito,
  type PremiumPlan,
  type PremiumData,
  type StudentActivity,
} from "./data";
import { trackActivity } from "./telemetry";
import { getCoachBranding, saveStudentCoachId, clearStudentCoachId, getBrandingEnabled, cacheBrandingEnabled, loadCachedBrandingEnabled, type CoachBranding } from "./branding";
import { getPaginaWebEnabled, cachePaginaWebEnabled, loadCachedPaginaWebEnabled } from "./pagina-web";

// ─── Types ─────────────────────────────────────────────────

export type PlanType = "solo_rutina" | "rutina_nutricion" | "acompanamiento_total";
export type Goal = string;
export type WeekDay = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
export type MealType = "desayuno" | "almuerzo" | "cena" | "snack" | "pre_entreno" | "post_entreno";
export type Rol = "coach" | "alumno";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono?: string;
  avatar?: string;
  /** Permiso de branding otorgado por el admin (solo coaches). */
  brandingEnabled?: boolean;
  /** Permiso de página web otorgado por el admin (solo coaches). */
  paginaWebEnabled?: boolean;
}

export interface Alumno {
  id: string;
  coachId: string;
  redId: string;
  nombre: string;
  apodo?: string;
  email: string;
  telefono?: string;
  edad: number;
  peso: number;
  altura?: number;
  objetivo: Goal;
  plan: PlanType;
  notas?: string;
  ultimoPesoRegistrado?: number;
  fechaPeso?: string;
  creadoEn: string;
}

export interface Red {
  id: string;
  coachId: string;
  nombre: string;
  tipo: "gimnasio" | "online";
  alumnoIds: string[];
}

export interface Ejercicio {
  id: string;
  nombre: string;
  grupoMuscular: string;
  equipo: string;
  descripcion?: string;
}

export interface EjercicioRutina {
  id: string;
  ejercicioId: string;
  ejercicioNombre: string;
  grupoMuscular: string;
  series: number;
  reps: number;
  descansoSegundos: number;
  notas?: string;
  videoUrl?: string;
  seriesPorSemana?: number[];
  repsPorSemana?: number[];
  descansoPorSemana?: number[];
  notasPorSemana?: string[];
}

export interface DiaRutina {
  id: string;
  nombre: string; // "Push", "Pull", etc.
  diaSemana: WeekDay;
  ejercicios: EjercicioRutina[];
}

export interface Rutina {
  id: string;
  coachId: string;
  nombre: string;
  descripcion?: string;
  alumnoId: string;
  mes: number;
  anio: number;
  dias: DiaRutina[];
  activa: boolean;
  creadoEn: string;
  indicacionesSemanales?: string[];
}

export interface Comida {
  id: string;
  tipo: MealType;
  nombre: string;
  alimentos: string[];
  instrucciones?: string;
}

export interface DiaComida {
  id: string;
  diaSemana: WeekDay;
  comidas: Comida[];
}

export interface PlanNutricional {
  id: string;
  coachId: string;
  nombre: string;
  alumnoId: string;
  dias: DiaComida[];
  activo: boolean;
  creadoEn: string;
}

export interface SesionAgenda {
  id: string;
  coachId: string;
  diaSemana: WeekDay;
  hora: string;
  titulo: string;
  grupoMuscular: string;
  alumnoIds: string[];
  alumnoEmails?: string[];
  fecha?: string;
}

export interface RegistroAgua {
  id: string;
  alumnoId: string;
  vasos: number;
  fecha: string;
}

export interface RegistroPeso {
  id: string;
  alumnoId: string;
  peso: number;
  fecha: string;
}

export interface SerieCompletada {
  ejercicioId: string;
  serie: number;
  completada: boolean;
  pesoUsado?: number;
  repsHechas?: number;
}

export interface SesionEntreno {
  id: string;
  alumnoId: string;
  rutinaId: string;
  diaRutinaId: string;
  fecha: string;
  completada: boolean;
  series: SerieCompletada[];
  duracionSegundos?: number;
}

export interface Actividad {
  id: string;
  tipo: "peso" | "entreno" | "agua" | "logro";
  alumnoId: string;
  alumnoNombre: string;
  mensaje: string;
  timestamp: string;
}

// ─── Datos Iniciales ────────────────────────────────────────

const EJERCICIOS_GLOBALES: Ejercicio[] = [
  { id: "e1", nombre: "Press Banca", grupoMuscular: "Pecho", equipo: "Barra" },
  { id: "e2", nombre: "Press Banca Inclinado", grupoMuscular: "Pecho", equipo: "Barra" },
  { id: "e3", nombre: "Press Banca Declinado", grupoMuscular: "Pecho", equipo: "Barra" },
  { id: "e4", nombre: "Aperturas con Mancuernas", grupoMuscular: "Pecho", equipo: "Mancuerna" },
  { id: "e5", nombre: "Pull Up", grupoMuscular: "Espalda", equipo: "Barra" },
  { id: "e6", nombre: "Remo con Barra", grupoMuscular: "Espalda", equipo: "Barra" },
  { id: "e7", nombre: "Remo en Máquina", grupoMuscular: "Espalda", equipo: "Máquina" },
  { id: "e8", nombre: "Jalón al Pecho", grupoMuscular: "Espalda", equipo: "Cable" },
  { id: "e9", nombre: "Press Militar", grupoMuscular: "Hombros", equipo: "Barra" },
  { id: "e10", nombre: "Elevaciones Laterales", grupoMuscular: "Hombros", equipo: "Mancuerna" },
  { id: "e11", nombre: "Elevaciones Frontales", grupoMuscular: "Hombros", equipo: "Mancuerna" },
  { id: "e12", nombre: "Curl con Barra", grupoMuscular: "Báceps", equipo: "Barra" },
  { id: "e13", nombre: "Curl con Mancuernas", grupoMuscular: "Báceps", equipo: "Mancuerna" },
  { id: "e14", nombre: "Curl Martillo", grupoMuscular: "Báceps", equipo: "Mancuerna" },
  { id: "e15", nombre: "Press Francés", grupoMuscular: "Tríceps", equipo: "Barra" },
  { id: "e16", nombre: "Jalón de Tríceps", grupoMuscular: "Tríceps", equipo: "Cable" },
  { id: "e17", nombre: "Sentadilla", grupoMuscular: "Cuádriceps", equipo: "Barra" },
  { id: "e18", nombre: "Prensa", grupoMuscular: "Cuádriceps", equipo: "Máquina" },
  { id: "e19", nombre: "Peso Muerto", grupoMuscular: "Espalda", equipo: "Barra" },
  { id: "e20", nombre: "Curl Femoral", grupoMuscular: "Isquiotibiales", equipo: "Máquina" },
  { id: "e21", nombre: "Elevación de Talones", grupoMuscular: "Gemelos", equipo: "Máquina" },
  { id: "e22", nombre: "Plancha", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
  { id: "e23", nombre: "Crunches", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
  { id: "e24", nombre: "Elevación de Piernas", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
  { id: "e25", nombre: "Zancadas", grupoMuscular: "Cuádriceps", equipo: "Mancuerna" },
];

const INITIAL_ALUMNOS: Alumno[] = [];

const STORAGE_REDES_KEY = "viking_redes";
const STORAGE_AGENDA_KEY = "viking_agenda";
const STORAGE_AGUA_KEY = "viking_agua";
const STORAGE_ACTIVIDADES_KEY = "viking_actividades";
const STORAGE_TELEFONO_KEY = "viking_telefono";
const STORAGE_COACHES_KEY = "viking_coaches";
const STORAGE_PESO_KEY = "viking_peso";
const STORAGE_ALUMNOS_PESO_KEY = "viking_alumnos_peso";
const STORAGE_PAGE_DRAFTS_KEY = "viking_page_drafts";
const STORAGE_UNASSIGNED_ROUTINES_KEY = "viking_unassigned_routines";
const STORAGE_UNASSIGNED_PLANS_KEY = "viking_unassigned_plans";

function loadPeso(): RegistroPeso[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_PESO_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function savePeso(registros: RegistroPeso[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_PESO_KEY, JSON.stringify(registros)); } catch {}
}

function loadAlumnosPeso(): Record<string, { peso: number; fecha: string }> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_ALUMNOS_PESO_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveAlumnosPeso(map: Record<string, { peso: number; fecha: string }>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_ALUMNOS_PESO_KEY, JSON.stringify(map)); } catch {}
}

function loadPageDrafts(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_PAGE_DRAFTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function savePageDrafts(drafts: Record<string, any>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_PAGE_DRAFTS_KEY, JSON.stringify(drafts)); } catch {}
}

function loadUnassignedRoutines(): Rutina[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_UNASSIGNED_ROUTINES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveUnassignedRoutines(routines: Rutina[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_UNASSIGNED_ROUTINES_KEY, JSON.stringify(routines)); } catch {}
}

function loadUnassignedPlans(): PlanNutricional[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_UNASSIGNED_PLANS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveUnassignedPlans(plans: PlanNutricional[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_UNASSIGNED_PLANS_KEY, JSON.stringify(plans)); } catch {}
}

function loadRedes(): Red[] {
  if (typeof window === "undefined") return INITIAL_REDES;
  try {
    const saved = localStorage.getItem(STORAGE_REDES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_REDES;
}

function saveRedes(redes: Red[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_REDES_KEY, JSON.stringify(redes)); } catch {}
}

const INITIAL_COACHES: Record<string, { id: string; nombre: string; telefono?: string; email?: string }> = {};

const INITIAL_AGENDA: SesionAgenda[] = [];

function loadAgenda(): SesionAgenda[] {
  if (typeof window === "undefined") return INITIAL_AGENDA;
  try {
    const saved = localStorage.getItem(STORAGE_AGENDA_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_AGENDA;
}

function saveAgenda(agenda: SesionAgenda[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_AGENDA_KEY, JSON.stringify(agenda)); } catch {}
}

function loadAgua(): RegistroAgua[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_AGUA_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveAgua(registros: RegistroAgua[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_AGUA_KEY, JSON.stringify(registros)); } catch {}
}

const INITIAL_ACTIVIDADES: Actividad[] = [];

function loadActividades(): Actividad[] {
  if (typeof window === "undefined") return INITIAL_ACTIVIDADES;
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVIDADES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_ACTIVIDADES;
}

function saveActividades(actividades: Actividad[]) {
  if (typeof window === "undefined") return;
  const capped = actividades.slice(0, 50);
  try { localStorage.setItem(STORAGE_ACTIVIDADES_KEY, JSON.stringify(capped)); } catch {}
}

function loadTelefono(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(STORAGE_TELEFONO_KEY) ?? ""; } catch { return ""; }
}

function loadCoaches(): Record<string, { id: string; nombre: string; telefono?: string; email?: string; branding?: CoachBranding | null }> {
  if (typeof window === "undefined") return INITIAL_COACHES;
  try {
    const saved = localStorage.getItem(STORAGE_COACHES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_COACHES;
}

const INITIAL_REDES: Red[] = [];

// ─── Store ──────────────────────────────────────────────────

interface AppState {
  // Auth
  usuarioActual: Usuario | null;
  setUsuario: (u: Usuario) => void;
  iniciarSesion: (rol: Rol, nombre: string, email: string) => void;
  cerrarSesion: () => void;
  refreshBrandingEnabled: () => Promise<void>;
  refreshPaginaWebEnabled: () => Promise<void>;
  _cerrandoSesion: boolean;

  // Datos
  alumnos: Alumno[];
  redes: Red[];
  ejercicios: Ejercicio[];
  rutinas: Rutina[];
  planesNutricionales: PlanNutricional[];
  agenda: SesionAgenda[];
  registrosAgua: RegistroAgua[];
  registrosPeso: RegistroPeso[];
  sesionesEntreno: SesionEntreno[];
  actividades: Actividad[];
  coaches: Record<string, { id: string; nombre: string; telefono?: string; email?: string; branding?: CoachBranding | null }>;
  ejerciciosPersonalizados: Ejercicio[];
  premium: PremiumData | null;
  premiumCargado: boolean;
  unassignedRoutines: Rutina[];
  unassignedPlans: PlanNutricional[];
  ejercicioTutoriales: Record<string, string>;  // ejercicioId → videoUrl
  setEjercicioTutorial: (ejercicioId: string, videoUrl: string) => Promise<void>;
  agregarAlumno: (a: Omit<Alumno, "id" | "creadoEn">) => Promise<void>;
  eliminarAlumno: (id: string) => Promise<void>;
  actualizarPesoAlumno: (alumnoId: string, peso: number) => Promise<void>;
  actualizarApodoAlumno: (alumnoId: string, apodo: string) => Promise<void>;
  getAlumnosPorRed: (redId: string) => Alumno[];

  // Acciones Red
  agregarRed: (nombre: string, tipo: "gimnasio" | "online") => void;
  eliminarRed: (id: string) => void;
  agregarAlumnoARed: (redId: string, alumnoId: string) => void;

  // Acciones Rutina
  asignarRutina: (r: Omit<Rutina, "id" | "creadoEn">) => Promise<void>;
  getRutinasAlumno: (alumnoId: string) => Rutina[];
  eliminarRutina: (id: string) => Promise<void>;

  // Sync
  syncCoachData: () => Promise<void>;
  syncStudentData: () => Promise<void>;

  // Acciones Nutrición
  asignarPlanNutricional: (p: Omit<PlanNutricional, "id" | "creadoEn">) => Promise<void>;
  getPlanesAlumno: (alumnoId: string) => PlanNutricional[];
  eliminarPlanNutricional: (id: string) => Promise<void>;

  // Acciones Ejercicios
  agregarEjercicioPersonalizado: (e: Omit<Ejercicio, "id">) => Ejercicio;
  eliminarEjercicioPersonalizado: (id: string) => void;

  // Acciones Agenda
  agregarSesion: (s: Omit<SesionAgenda, "id">) => void;
  editarSesion: (id: string, updates: Partial<Omit<SesionAgenda, "id">>) => void;
  eliminarSesion: (id: string) => void;

  // Acciones Progreso
  registrarAgua: (alumnoId: string, vasos: number) => void;
  quitarAgua: (alumnoId: string, vasos: number) => void;
  getAguaHoy: (alumnoId: string) => number;
  registrarPeso: (alumnoId: string, peso: number) => void;

  // Sesiones de entreno
  iniciarSesionEntreno: (alumnoId: string, rutinaId: string, diaRutinaId: string) => string;
  completarSerie: (sesionId: string, ejercicioId: string, serie: number, peso?: number, reps?: number) => void;
  completarEntreno: (sesionId: string) => void;
  getSesionEntrenoActiva: (alumnoId: string) => SesionEntreno | undefined;

  // Perfil
  actualizarTelefono: (telefono: string) => void;
  actualizarNombre: (nombre: string) => void;
  actualizarCoachEnAlumnos: () => void;
  actualizarCoachBranding: (coachId: string, branding: CoachBranding | null) => void;

  // Ejercicios personalizados (independiente mode)
  agregarEjercicioPropio: (e: Omit<Ejercicio, "id">) => void;
  eliminarEjercicioPropio: (id: string) => void;

  // Rutinas propias (independiente mode)
  agregarRutinaPropia: (r: Omit<Rutina, "id" | "creadoEn">) => void;
  eliminarRutinaPropia: (id: string) => void;

  // Plan nutricional propio (independiente mode)
  agregarPlanPropio: (p: Omit<PlanNutricional, "id" | "creadoEn">) => void;
  eliminarPlanPropio: (id: string) => void;

  // Helpers
  getAlumno: (id: string) => Alumno | undefined;
  getEjercicios: () => Ejercicio[];
  getActividadesRecientes: () => Actividad[];

  // Unassigned Routines & Plans
  saveUnassignedRoutine: (r: Omit<Rutina, "id" | "creadoEn">) => Promise<void>;
  deleteUnassignedRoutine: (id: string) => void;
  assignUnassignedRoutine: (routineId: string, alumnoId: string) => Promise<void>;
  saveUnassignedPlan: (p: Omit<PlanNutricional, "id" | "creadoEn">) => Promise<void>;
  deleteUnassignedPlan: (id: string) => void;
  assignUnassignedPlan: (planId: string, alumnoId: string) => Promise<void>;
  unassignRoutine: (routineId: string) => Promise<void>;
  unassignPlan: (planId: string) => Promise<void>;

  // Premium
  premiumError: string | null;
  upgradeReason: "students" | "routines" | null;
  setPremiumError: (msg: string | null) => void;
  abrirUpgrade: (tipo: "students" | "routines", msg: string) => void;
  cerrarPaywall: () => void;
  cargarSuscripcion: () => Promise<void>;
  cambiarPlan: (planId: string) => Promise<void>;
  contratarPremium: (plan: PremiumPlan, meses?: number) => Promise<void>;
  getLimiteAlumnos: () => number;
  getLimiteRutinas: () => number;
  verificarCupoRutinas: (nuevas: number) => void;

  // Current Week
  currentWeek: number | null;
  loadCurrentWeek: () => Promise<void>;
  setCurrentWeek: (week: number) => Promise<void>;

  // Page draft state — survives SPA navigation because Zustand store is module-singleton
  pageDrafts: Record<string, any>;
  setPageDraft: (page: string, data: any) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const requierePremium = () => {
    const { usuarioActual, premium } = get();
    if (usuarioActual?.rol !== "coach") return;
    if (esCoachGratuito(usuarioActual?.email)) return;
    if (premium && new Date(premium.premiumExpiresAt) > new Date()) return;
    const total = get().alumnos.length;
    if (total > 3) {
      const msg = "Tu plan premium ha vencido. Contratá un plan para seguir gestionando.";
      set({ premiumError: msg });
      throw new Error(msg);
    }
  };

  const verificarCupoRutinas = (nuevas: number) => {
    const { usuarioActual, premium } = get();
    if (usuarioActual?.rol !== "coach") return;
    if (esCoachGratuito(usuarioActual?.email)) return;
    if (premium && new Date(premium.premiumExpiresAt) > new Date()) return;
    const limite = get().getLimiteRutinas();
    const total = get().rutinas.length + get().unassignedRoutines.length;
    if (total + nuevas > limite) {
      const msg = `Llegaste al límite de ${limite} rutinas de tu cuenta de prueba. Suscribite a un plan para crear más.`;
      set({ premiumError: msg, upgradeReason: "routines" });
      throw new Error(msg);
    }
  };

  return {
  // Auth
  usuarioActual: null,
  _cerrandoSesion: false,
  setUsuario: (u) => set({ usuarioActual: { ...u, telefono: u.telefono || loadTelefono() || undefined, brandingEnabled: u.rol === "coach" ? (u.brandingEnabled ?? loadCachedBrandingEnabled(u.id) ?? undefined) : undefined, paginaWebEnabled: u.rol === "coach" ? (u.paginaWebEnabled ?? loadCachedPaginaWebEnabled(u.id) ?? undefined) : undefined } }),
  refreshBrandingEnabled: async () => {
    const u = get().usuarioActual;
    if (!u || u.rol !== "coach") return;
    const enabled = await getBrandingEnabled(u.id);
    cacheBrandingEnabled(u.id, enabled);
    set({ usuarioActual: { ...get().usuarioActual!, brandingEnabled: enabled } });
  },
  refreshPaginaWebEnabled: async () => {
    const u = get().usuarioActual;
    if (!u || u.rol !== "coach") return;
    const enabled = await getPaginaWebEnabled(u.id);
    cachePaginaWebEnabled(u.id, enabled);
    set({ usuarioActual: { ...get().usuarioActual!, paginaWebEnabled: enabled } });
  },
  iniciarSesion: async (rol, nombre, email) => {
    const { data: { user } } = await supabase.auth.getUser();
    const id = user?.id ?? `anon_${Date.now()}`;
    const telefono = loadTelefono() || undefined;
    set({ usuarioActual: { id, nombre, email, rol, telefono, brandingEnabled: rol === "coach" ? (loadCachedBrandingEnabled(id) ?? undefined) : undefined, paginaWebEnabled: rol === "coach" ? (loadCachedPaginaWebEnabled(id) ?? undefined) : undefined } });
    if (rol === "coach") { get().refreshBrandingEnabled(); get().refreshPaginaWebEnabled(); }
  },
  cerrarSesion: async () => {
    if (get()._cerrandoSesion) return;
    get()._cerrandoSesion = true;
    const storageKeys = [
      STORAGE_REDES_KEY, STORAGE_AGENDA_KEY, STORAGE_AGUA_KEY,
      STORAGE_ACTIVIDADES_KEY, STORAGE_TELEFONO_KEY, STORAGE_COACHES_KEY,
      STORAGE_PESO_KEY, STORAGE_ALUMNOS_PESO_KEY, STORAGE_PAGE_DRAFTS_KEY,
      STORAGE_UNASSIGNED_ROUTINES_KEY, STORAGE_UNASSIGNED_PLANS_KEY,
      "viking_last_path",
    ];
    for (const k of storageKeys) { try { localStorage.removeItem(k); } catch {} }
    clearStudentCoachId();
    set({
      usuarioActual: null, alumnos: [], redes: [], ejercicios: [],
      rutinas: [], planesNutricionales: [], agenda: [], registrosAgua: [],
      registrosPeso: [], sesionesEntreno: [], actividades: [], coaches: {},
      ejerciciosPersonalizados: [], premium: null, premiumCargado: false,
      unassignedRoutines: [], unassignedPlans: [], currentWeek: null,
      premiumError: null, upgradeReason: null, ejercicioTutoriales: {},
    });
    await supabaseSignOut().catch(() => {});
    set({ _cerrandoSesion: false });
  },

  // Datos iniciales
  alumnos: (() => {
    const saved = loadAlumnosPeso();
    return INITIAL_ALUMNOS.map((a) => {
      const s = saved[a.id];
      return s ? { ...a, peso: s.peso, fechaPeso: s.fecha, ultimoPesoRegistrado: a.peso } : a;
    });
  })(),
  redes: loadRedes(),
  ejercicios: EJERCICIOS_GLOBALES,
  rutinas: [],
  planesNutricionales: [],
  agenda: loadAgenda(),
  registrosAgua: loadAgua(),
  registrosPeso: loadPeso(),
  sesionesEntreno: [],
  actividades: loadActividades(),
  coaches: loadCoaches(),
  ejerciciosPersonalizados: [],
  premium: null,
  premiumCargado: false,
  premiumError: null,
  upgradeReason: null,
  currentWeek: null,
  unassignedRoutines: loadUnassignedRoutines(),
  unassignedPlans: loadUnassignedPlans(),
  ejercicioTutoriales: {},

  // ─── Alumnos ──────────────────────────────────────────────

  agregarAlumno: async (a) => {
    requierePremium();
    const student = await findStudentByEmail(a.email);
    if (!student) throw new Error("Alumno no encontrado. Debe registrarse primero con Google.");
    const coachId = get().usuarioActual?.id;
    const email = get().usuarioActual?.email;
    if (!coachId) throw new Error("Debes iniciar sesión como coach");
    if (!esCoachGratuito(email)) {
      const premium = get().premium;
      const premiumActivo = premium && new Date(premium.premiumExpiresAt) > new Date();
      if (!premiumActivo) {
        const total = get().alumnos.length;
        const limite = get().getLimiteAlumnos();
        if (total >= limite) {
          const msg =
            `Llegaste al límite de ${limite} alumnos de tu cuenta de prueba. Suscribite a un plan para agregar más.`;
          set({ premiumError: msg, upgradeReason: "students" });
          throw new Error(msg);
        }
      }
    }
    await linkStudentToCoach(coachId, student.id);
    const nuevoAlumno: Alumno = {
      ...a,
      id: student.id,
      creadoEn: new Date().toISOString(),
    };
    if (a.apodo) {
      saveStudentApodo(coachId, student.id, a.apodo).catch(() => {});
    }
    set((state) => {
      const nuevasRedes = state.redes.map((r) =>
        r.id === a.redId ? { ...r, alumnoIds: [...r.alumnoIds, student.id] } : r
      );
      saveRedes(nuevasRedes);
      return {
        alumnos: [...state.alumnos, nuevoAlumno],
        redes: nuevasRedes,
      };
    });
    trackActivity("student_added", `Agregó al alumno ${a.nombre}`, { studentId: student.id, studentName: a.nombre });
  },

  eliminarAlumno: async (id) => {
    requierePremium();
    const coachId = get().usuarioActual?.id;
    const alumno = get().alumnos.find((x) => x.id === id);
    if (!coachId) return;
    try {
      await removeStudentFromCoach(coachId, id);
    } catch (e) {
      console.error("Error removing student from Supabase:", e);
    }
    set((state) => {
      const nuevasRedes = state.redes.map((r) => ({
        ...r,
        alumnoIds: r.alumnoIds.filter((aid) => aid !== id),
      }));
      saveRedes(nuevasRedes);
      return {
        alumnos: state.alumnos.filter((a) => a.id !== id),
        redes: nuevasRedes,
        rutinas: state.rutinas.filter((r) => r.alumnoId !== id),
        planesNutricionales: state.planesNutricionales.filter((p) => p.alumnoId !== id),
        sesionesEntreno: state.sesionesEntreno.filter((s) => s.alumnoId !== id),
        agenda: state.agenda.map((a) => ({
          ...a,
          alumnoIds: a.alumnoIds.filter((aid) => aid !== id),
        })),
        actividades: state.actividades.filter((a) => a.alumnoId !== id),
        registrosAgua: state.registrosAgua.filter((r) => r.alumnoId !== id),
        registrosPeso: state.registrosPeso.filter((r) => r.alumnoId !== id),
      };
    });
    trackActivity("student_removed", `Eliminó al alumno${alumno ? ` ${alumno.nombre}` : ""}`, alumno ? { studentId: id, studentName: alumno.nombre } : undefined);
  },

  actualizarPesoAlumno: async (alumnoId, peso) => {
    const state = get();
    const _a = state.alumnos.find((a) => a.id === alumnoId);
    const alumnoNombre = _a ? (_a.apodo || _a.nombre) : "";
    const actividadId = `act_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const mensaje = `actualizó su peso: ${peso}kg`;
    const nuevasActividades: Actividad[] = [
      { id: actividadId, tipo: "peso", alumnoId, alumnoNombre, mensaje, timestamp },
      ...state.actividades,
    ];
    set({
      alumnos: state.alumnos.map((a) =>
        a.id === alumnoId
          ? { ...a, ultimoPesoRegistrado: a.peso, peso, fechaPeso: new Date().toISOString().split("T")[0] }
          : a
      ),
      actividades: nuevasActividades,
    });
    saveActividades(nuevasActividades);
    await saveStudentActivity(alumnoId, { id: actividadId, tipo: "peso", alumnoId, alumnoNombre, mensaje, timestamp }).catch(() => {});
    // Fire-and-forget: POST to API for cross-machine sync
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        let targetCoachId = state.alumnos.find((a) => a.id === alumnoId)?.coachId;
        if (!targetCoachId) {
          const email = state.usuarioActual?.email;
          if (email) {
            const cid = await getCoachByStudentEmail(email).catch(() => null);
            if (cid) targetCoachId = cid;
          }
        }
        if (targetCoachId) {
          fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              activity: { id: actividadId, tipo: "peso", alumnoId, alumnoNombre, mensaje, timestamp, coachId: targetCoachId },
            }),
          }).catch(() => {});
        }
      }
    } catch {}
    if (get().usuarioActual?.rol === "coach") {
      trackActivity("weight_updated", `Actualizó el peso de ${alumnoNombre || "un alumno"} a ${peso}kg`, { studentId: alumnoId, studentName: alumnoNombre || undefined, detail: `${peso}kg` });
    }
  },

  actualizarApodoAlumno: async (alumnoId, apodo) => {
    const coachId = get().usuarioActual?.id;
    if (!coachId) return;
    set({ alumnos: get().alumnos.map((a) => a.id === alumnoId ? { ...a, apodo } : a) });
    await saveStudentApodo(coachId, alumnoId, apodo);
    trackActivity("student_updated", `Renombró a un alumno como "${apodo}"`, { studentId: alumnoId, studentName: apodo });
  },

  getAlumnosPorRed: (redId) => {
    const red = get().redes.find((r) => r.id === redId);
    if (!red) return [];
    return get().alumnos.filter((a) => red.alumnoIds.includes(a.id));
  },

  // ─── Redes ────────────────────────────────────────────────

  agregarRed: (nombre, tipo) => {
    requierePremium();
    set((state) => {
      const nuevas = [...state.redes, { id: `r_${Date.now()}`, coachId: state.usuarioActual?.id ?? "", nombre, tipo, alumnoIds: [] }];
      saveRedes(nuevas);
      const coachId = state.usuarioActual?.id;
      if (coachId) saveRedesForCoach(coachId, nuevas).catch(() => {});
      return { redes: nuevas };
    });
    trackActivity("red_created", `Creó la red "${nombre}"`, { redName: nombre });
  },
  eliminarRed: (id) => {
    requierePremium();
    set((state) => {
      const nuevas = state.redes.filter((r) => r.id !== id);
      saveRedes(nuevas);
      const coachId = state.usuarioActual?.id;
      if (coachId) saveRedesForCoach(coachId, nuevas).catch(() => {});
      return { redes: nuevas };
    });
  },
  agregarAlumnoARed: (redId, alumnoId) => {
    requierePremium();
    set((state) => {
      const nuevas = state.redes.map((r) =>
        r.id === redId ? { ...r, alumnoIds: [...r.alumnoIds, alumnoId] } : r
      );
      saveRedes(nuevas);
      const coachId = state.usuarioActual?.id;
      if (coachId) saveRedesForCoach(coachId, nuevas).catch(() => {});
      return {
        redes: nuevas,
        alumnos: state.alumnos.map((a) =>
          a.id === alumnoId ? { ...a, redId } : a
        ),
      };
    });
  },

  // ─── Rutinas ──────────────────────────────────────────────

  asignarRutina: async (r) => {
    requierePremium();
    verificarCupoRutinas(1);
    const coachId = get().usuarioActual?.id ?? r.coachId;
    const ejercicios = get().ejercicios;
    const plan = await createWorkoutPlan(coachId, r.alumnoId, r.nombre, r.descripcion, r.mes, r.anio, r.dias, ejercicios, r.indicacionesSemanales);
    const nueva: Rutina = {
      ...r,
      id: plan?.id ?? `rut_${Date.now()}`,
      creadoEn: new Date().toISOString(),
    };
    const state = get();
    const alumno = state.alumnos.find((a) => a.id === r.alumnoId);
    const alumnoNombre = alumno ? (alumno.apodo || alumno.nombre) : "";
    const actividadId = `act_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const mensaje = `recibió nueva rutina: ${r.nombre}`;
    const nuevasActividades: Actividad[] = [
      { id: actividadId, tipo: "entreno", alumnoId: r.alumnoId, alumnoNombre, mensaje, timestamp },
      ...state.actividades,
    ];
    set({
      rutinas: [...state.rutinas, nueva],
      actividades: nuevasActividades,
    });
    saveActividades(nuevasActividades);
    await saveStudentActivity(r.alumnoId, { id: actividadId, tipo: "entreno", alumnoId: r.alumnoId, alumnoNombre, mensaje, timestamp }).catch(() => {});
  },

  getRutinasAlumno: (alumnoId) =>
    get().rutinas.filter((r) => r.alumnoId === alumnoId && r.activa),

  eliminarRutina: async (id) => {
    requierePremium();
    const rutina = get().rutinas.find((r) => r.id === id);
    try { await deleteWorkoutPlan(id); } catch {}
    set((state) => ({
      rutinas: state.rutinas.filter((r) => r.id !== id),
    }));
    trackActivity("routine_deleted", `Eliminó la rutina${rutina ? ` "${rutina.nombre}"` : ""}`, rutina ? { routineName: rutina.nombre } : undefined);
  },

  syncCoachData: async () => {
    const coachId = get().usuarioActual?.id;
    if (!coachId) return;
    try {
      const students = await getCoachStudents(coachId);
      const apodos = await loadStudentApodos(coachId);
      const existingIds = new Set(get().alumnos.map((a) => a.id));
      const redesActuales = get().redes;
      const newAlumnos = students
        .filter((s) => !existingIds.has(s.id))
        .map((s) => {
          const redMatch = redesActuales.find((r) => r.alumnoIds.includes(s.id));
          return {
            id: s.id,
            coachId,
            redId: redMatch?.id ?? "",
            nombre: s.nombre,
            apodo: apodos[s.id] ?? undefined,
            email: s.email,
            edad: 0,
            peso: 0,
            objetivo: "mantenimiento" as Goal,
            plan: "solo_rutina" as PlanType,
            creadoEn: new Date().toISOString(),
          } as Alumno;
        });
      // Update existing students' names/emails/apodos from Supabase + blob
      const updatedAlumnos = get().alumnos.map((a) => {
        const match = students.find((s) => s.id === a.id);
        if (match) return { ...a, nombre: match.nombre, email: match.email, apodo: apodos[match.id] ?? a.apodo };
        return a;
      });
      if (newAlumnos.length > 0 || updatedAlumnos.some((a, i) => a !== get().alumnos[i])) {
        set({ alumnos: [...updatedAlumnos, ...newAlumnos] });
      }

      const plans = await getCoachWorkoutPlans(coachId);
      const DAY_ORDER: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
      const parsedRutinas: Rutina[] = plans.map((p: any) => ({
        id: p.id,
        coachId,
        nombre: p.name,
        descripcion: p.description ?? "",
        alumnoId: p.student_id,
        mes: 1,
        anio: 2026,
        activa: true,
        creadoEn: p.created_at,
        indicacionesSemanales: parseIndicacionesSemanales(p.description),
        dias: (p.workout_days ?? []).sort((a: any, b: any) => (DAY_ORDER[a.week_day] ?? 99) - (DAY_ORDER[b.week_day] ?? 99)).map((d: any) => {
          let ejercicios: any[] = [];
          try {
            const parsed = JSON.parse(d.notes || "[]");
            if (Array.isArray(parsed)) {
              ejercicios = parsed.map((ej: any, idx: number) => ({
                id: `syn_${d.id}_${idx}`,
                ejercicioId: ej.ejercicioId ?? null,
                ejercicioNombre: ej.ejercicioNombre ?? ej.n ?? "",
                grupoMuscular: ej.grupoMuscular ?? ej.g ?? "",
                series: ej.series ?? 0,
                reps: ej.reps ?? 0,
                descansoSegundos: ej.descansoSegundos ?? 90,
                notas: ej.notas ?? "",
                videoUrl: ej.videoUrl ?? "",
                seriesPorSemana: ej.seriesPorSemana ?? null,
                repsPorSemana: ej.repsPorSemana ?? null,
                descansoPorSemana: ej.descansoPorSemana ?? null,
                notasPorSemana: ej.notasPorSemana ?? null,
              }));
            }
          } catch {}
          return {
            id: d.id,
            nombre: d.day_name,
            diaSemana: d.week_day === "monday" ? "lunes" :
              d.week_day === "tuesday" ? "martes" :
              d.week_day === "wednesday" ? "miercoles" :
              d.week_day === "thursday" ? "jueves" :
              d.week_day === "friday" ? "viernes" :
              d.week_day === "saturday" ? "sabado" : "domingo",
            ejercicios,
          };
        }),
      }));
      set((state) => {
        const merged = [...state.rutinas];
        for (const r of parsedRutinas) {
          const idx = merged.findIndex((m) => m.id === r.id);
          if (idx >= 0) merged[idx] = r;
          else merged.push(r);
        }
        return { rutinas: merged };
      });

      const nutrition = await getCoachNutritionPlans(coachId);
      set((state) => {
        const merged = [...state.planesNutricionales];
        for (const n of nutrition) {
          const idx = merged.findIndex((m) => m.id === n.id);
          if (idx >= 0) merged[idx] = n;
          else merged.push(n);
        }
        return { planesNutricionales: merged };
      });

      // Load activities from all students — merge by ID, keep 50 most recent
      const studentIds = students.map((s) => s.id);
      if (studentIds.length > 0) {
        const allActivities = await getStudentsActivities(studentIds, coachId);
        if (allActivities.length > 0) {
          const existingIds = new Set(get().actividades.map((a: any) => a.id));
          const newOnes = allActivities.filter((a: any) => !existingIds.has(a.id));
          if (newOnes.length > 0) {
            const merged = [...get().actividades, ...newOnes]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 50);
            set({ actividades: merged });
            saveActividades(merged);
          }
        }

        // Load phone numbers and weight for students
        for (const sid of studentIds) {
          try {
            const phone = await getStudentPhone(sid);
            if (phone) {
              set((state) => ({
                alumnos: state.alumnos.map((a) => a.id === sid ? { ...a, telefono: phone } : a),
              }));
            }
          } catch {}
          try {
            const weightData = await getStudentWeight(sid);
            if (weightData && weightData.peso > 0) {
              set((state) => ({
                alumnos: state.alumnos.map((a) =>
                  a.id === sid ? { ...a, peso: weightData.peso, fechaPeso: weightData.fecha, ultimoPesoRegistrado: a.peso } : a
                ),
              }));
            }
          } catch {}
        }
      }
      // Load custom exercises from blob
      try {
        const customEx = await getCoachExercises(coachId);
        if (customEx.length > 0) {
          const existingIds = new Set(get().ejercicios.map((e) => e.id));
          const nuevos = customEx.filter((e) => !existingIds.has(e.id));
          if (nuevos.length > 0) {
            set((state) => ({ ejercicios: [...state.ejercicios, ...nuevos] }));
          }
        }
      } catch {}

      // Auto-apply new Viking library for new coaches + faustinofiordalisi@gmail.com
      try {
        const { data: cprof } = await supabase
          .from("profiles")
          .select("id,email,created_at")
          .eq("id", coachId)
          .maybeSingle();
        const today = new Date().toISOString().slice(0, 10);
        const isMe = cprof?.email === "faustinofiordalisi@gmail.com";
        const isNew = cprof?.created_at ? new Date(cprof.created_at).toISOString().slice(0, 10) >= today : false;
        if (isMe || isNew) {
          const customEx2 = await getCoachExercises(coachId);
          const norm = (x: any) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").replace(/[^\w\s-]/g, "").trim();
          const existing = new Set(customEx2.map((x: any) => norm(x.nombre)));
          const lib = [{"id":"e26","nombre":"Press de banca plano con barra","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e27","nombre":"Press de banca plano con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e28","nombre":"Press de banca plano en Smith","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e29","nombre":"Press de banca plano en máquina convergente","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e30","nombre":"Press de pecho sentado en máquina","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e31","nombre":"Press inclinado con barra","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e32","nombre":"Press inclinado con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e33","nombre":"Press inclinado en Smith","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e34","nombre":"Press inclinado en máquina","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e35","nombre":"Press declinado con barra","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e36","nombre":"Press declinado con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e37","nombre":"Press declinado en Smith","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e38","nombre":"Press declinado en máquina","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e39","nombre":"Press con agarre cerrado para pecho","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e40","nombre":"Press con mancuernas con agarre neutro","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e41","nombre":"Press con mancuernas alternado","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e42","nombre":"Press unilateral en máquina","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e43","nombre":"Press en máquina Hammer","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e44","nombre":"Press en multipower con banco inclinado","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e45","nombre":"Press en poleas de pie","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e46","nombre":"Press de pecho con bandas elásticas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e47","nombre":"Aperturas planas con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e48","nombre":"Aperturas inclinadas con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e49","nombre":"Aperturas declinadas con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e50","nombre":"Aperturas en peck deck","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e51","nombre":"Aperturas en máquina sentado","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e52","nombre":"Cruce de poleas alto a bajo","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e53","nombre":"Cruce de poleas bajo a alto","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e54","nombre":"Cruce de poleas a la altura del pecho","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e55","nombre":"Cruce unilateral de polea","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e56","nombre":"Cruce de poleas con paso al frente","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e57","nombre":"Cruce de poleas arrodillado","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e58","nombre":"Pullover con mancuerna","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e59","nombre":"Pullover en polea alta","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e60","nombre":"Pullover en máquina","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e61","nombre":"Fondos en paralelas inclinando el torso","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e62","nombre":"Flexiones de brazos","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e63","nombre":"Flexiones con manos elevadas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e64","nombre":"Flexiones con pies elevados","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e65","nombre":"Flexiones con lastre","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e66","nombre":"Flexiones con agarre amplio","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e67","nombre":"Flexiones con agarre cerrado","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e68","nombre":"Flexiones con manos juntas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e69","nombre":"Flexiones explosivas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e70","nombre":"Flexiones en anillas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e71","nombre":"Flexiones con bandas elásticas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e72","nombre":"Press squeeze con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e73","nombre":"Press de pecho en el suelo con mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e74","nombre":"Press unilateral en el suelo","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e75","nombre":"Aperturas en poleas acostado","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e76","nombre":"Press inclinado con agarre neutro","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e77","nombre":"Press plano con pausa","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e78","nombre":"Press con mancuernas desde posición neutra","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e79","nombre":"Flexiones con apoyo sobre mancuernas","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e80","nombre":"Press de pecho en máquina unilateral","grupoMuscular":"Pecho","equipo":"Bodyweight"},{"id":"e81","nombre":"Dominadas pronas","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e82","nombre":"Dominadas supinas","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e83","nombre":"Dominadas con agarre neutro","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e84","nombre":"Dominadas asistidas","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e85","nombre":"Dominadas con lastre","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e86","nombre":"Dominadas en máquina","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e87","nombre":"Jalón al pecho con barra larga","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e88","nombre":"Jalón al pecho con agarre amplio","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e89","nombre":"Jalón al pecho con agarre cerrado","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e90","nombre":"Jalón al pecho con agarre neutro","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e91","nombre":"Jalón supino al pecho","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e92","nombre":"Jalón unilateral en polea","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e93","nombre":"Jalón con brazos rectos","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e94","nombre":"Jalón tras nuca","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e95","nombre":"Jalón con cuerda","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e96","nombre":"Jalón con agarre paralelo","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e97","nombre":"Remo con barra inclinado","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e98","nombre":"Remo Pendlay","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e99","nombre":"Remo con barra T","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e100","nombre":"Remo en máquina T","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e101","nombre":"Remo con mancuerna a una mano","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e102","nombre":"Remo con dos mancuernas","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e103","nombre":"Remo con pecho apoyado","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e104","nombre":"Remo en banco inclinado","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e105","nombre":"Remo sentado en polea baja","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e106","nombre":"Remo en polea con barra V","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e107","nombre":"Remo en polea con barra recta","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e108","nombre":"Remo en polea con cuerda","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e109","nombre":"Remo unilateral en polea","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e110","nombre":"Remo alto en polea","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e111","nombre":"Remo en máquina convergente","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e112","nombre":"Remo en máquina unilateral","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e113","nombre":"Remo Hammer Strength","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e114","nombre":"Remo invertido en barra","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e115","nombre":"Remo invertido en Smith","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e116","nombre":"Remo en anillas","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e117","nombre":"Remo con banda elástica","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e118","nombre":"Peso muerto convencional","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e119","nombre":"Peso muerto sumo","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e120","nombre":"Peso muerto con trap bar","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e121","nombre":"Peso muerto desde bloques","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e122","nombre":"Peso muerto con déficit","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e123","nombre":"Peso muerto rumano","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e124","nombre":"Buenos días con barra","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e125","nombre":"Hiperextensiones lumbares","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e126","nombre":"Hiperextensiones a 45 grados","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e127","nombre":"Extensión lumbar en máquina","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e128","nombre":"Pull-over en polea alta","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e129","nombre":"Pull-over con mancuerna","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e130","nombre":"Pull-over en máquina","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e131","nombre":"Face pull","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e132","nombre":"Encogimientos con barra","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e133","nombre":"Encogimientos con mancuernas","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e134","nombre":"Encogimientos en Smith","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e135","nombre":"Encogimientos en máquina","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e136","nombre":"Remo Meadows","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e137","nombre":"Remo en landmine unilateral","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e138","nombre":"Jalón unilateral arrodillado","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e139","nombre":"Remo con barra supino","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e140","nombre":"Remo con barra agarre amplio","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e141","nombre":"Remo con mancuernas pecho apoyado","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e142","nombre":"Remo sentado con agarre ancho","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e143","nombre":"Remo sentado con agarre neutro","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e144","nombre":"Remo sentado con agarre supino","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e145","nombre":"Dominadas escapulares","grupoMuscular":"Espalda","equipo":"Bodyweight"},{"id":"e146","nombre":"Peso muerto rumano con barra","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e147","nombre":"Peso muerto rumano con mancuernas","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e148","nombre":"Peso muerto rumano unilateral","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e149","nombre":"Peso muerto piernas rígidas","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e150","nombre":"Peso muerto piernas rígidas con mancuernas","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e151","nombre":"Curl femoral acostado","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e152","nombre":"Curl femoral sentado","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e153","nombre":"Curl femoral de pie","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e154","nombre":"Curl femoral unilateral","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e155","nombre":"Curl femoral en máquina sentado unilateral","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e156","nombre":"Curl femoral con fitball","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e157","nombre":"Curl femoral deslizante","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e158","nombre":"Curl nórdico de isquios","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e159","nombre":"Curl nórdico asistido","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e160","nombre":"Buenos días con banda","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e161","nombre":"Hiperextensión con énfasis en isquios","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e162","nombre":"Pull-through en polea","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e163","nombre":"Pull-through con banda","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e164","nombre":"Puente de isquios con talones elevados","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e165","nombre":"Puente de glúteos con talones alejados","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e166","nombre":"Curl femoral con toalla","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e167","nombre":"Curl femoral en anillas","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e168","nombre":"Curl femoral con sliders","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e169","nombre":"Curl femoral con banda elástica","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e170","nombre":"Peso muerto rumano en Smith","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e171","nombre":"Peso muerto rumano desde déficit","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e172","nombre":"Extensión de cadera en banco 45 grados","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e173","nombre":"Hip hinge con banda","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e174","nombre":"Curl femoral en máquina unilateral de pie","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e175","nombre":"Nordic curl excéntrico","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e176","nombre":"Peso muerto con kettlebell","grupoMuscular":"Isquiotibiales","equipo":"Bodyweight"},{"id":"e177","nombre":"Elevación de gemelos de pie","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e178","nombre":"Elevación de gemelos sentado","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e179","nombre":"Elevación de gemelos en prensa","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e180","nombre":"Elevación unilateral de gemelos de pie","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e181","nombre":"Elevación unilateral de gemelos sentado","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e182","nombre":"Elevación de gemelos en Smith","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e183","nombre":"Elevación de gemelos con mancuernas","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e184","nombre":"Elevación de gemelos con barra","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e185","nombre":"Elevación de gemelos en máquina hack","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e186","nombre":"Elevación de gemelos en escalón","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e187","nombre":"Elevación de gemelos con rodillas flexionadas","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e188","nombre":"Elevación de gemelos con rodillas extendidas","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e189","nombre":"Elevación de gemelos en prensa horizontal","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e190","nombre":"Elevación de gemelos en máquina de pie","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e191","nombre":"Elevación de gemelos en máquina sentado unilateral","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e192","nombre":"Elevación de gemelos con peso corporal","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e193","nombre":"Elevación de gemelos con pausa arriba","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e194","nombre":"Elevación de gemelos excéntrica","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e195","nombre":"Saltos de cuerda","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e196","nombre":"Caminata de puntas","grupoMuscular":"Gemelos","equipo":"Bodyweight"},{"id":"e197","nombre":"Crunch abdominal en suelo","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e198","nombre":"Crunch abdominal en máquina","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e199","nombre":"Crunch en polea arrodillado","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e200","nombre":"Crunch con disco","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e201","nombre":"Crunch con pelota suiza","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e202","nombre":"Crunch inverso","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e203","nombre":"Elevación de rodillas colgado","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e204","nombre":"Elevación de piernas colgado","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e205","nombre":"Elevación de rodillas en silla romana","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e206","nombre":"Elevación de piernas en banco","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e207","nombre":"Elevación de piernas en suelo","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e208","nombre":"Plancha frontal","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e209","nombre":"Plancha lateral","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e210","nombre":"Plancha con apoyo de rodillas","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e211","nombre":"Plancha con toque de hombros","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e212","nombre":"Plancha con elevación alternada de piernas","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e213","nombre":"Rueda abdominal","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e214","nombre":"Ab wheel desde rodillas","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e215","nombre":"Ab wheel de pie","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e216","nombre":"Dead bug","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e217","nombre":"Bird dog","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e218","nombre":"Hollow hold","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e219","nombre":"V-ups","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e220","nombre":"Bicicleta abdominal","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e221","nombre":"Russian twist","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e222","nombre":"Giros de torso en polea","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e223","nombre":"Pallof press","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e224","nombre":"Woodchopper alto a bajo","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e225","nombre":"Woodchopper bajo a alto","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e226","nombre":"Leñador en polea unilateral","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e227","nombre":"Flexión lateral con mancuerna","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e228","nombre":"Flexión lateral en polea","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e229","nombre":"Sit-up","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e230","nombre":"Sit-up declinado","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e231","nombre":"Sit-up con disco","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e232","nombre":"Mountain climbers","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e233","nombre":"Flutter kicks","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e234","nombre":"Scissor kicks","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e235","nombre":"Reverse crunch en banco declinado","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e236","nombre":"Dragon flag","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e237","nombre":"L-sit","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e238","nombre":"Plancha con desplazamiento","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e239","nombre":"Plancha con rueda","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e240","nombre":"Marcha de granjero unilateral","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e241","nombre":"Suitcase carry","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e242","nombre":"Paseo del granjero","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e243","nombre":"Respiración abdominal bracing","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e244","nombre":"Crunch con piernas elevadas","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e245","nombre":"Elevación de pelvis en banco","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e246","nombre":"Plancha Copenhagen","grupoMuscular":"Abdomen","equipo":"Bodyweight"},{"id":"e247","nombre":"Caminata en cinta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e248","nombre":"Caminata en cinta con inclinación","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e249","nombre":"Trote en cinta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e250","nombre":"Carrera continua en cinta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e251","nombre":"Intervalos en cinta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e252","nombre":"Sprints en cinta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e253","nombre":"Bicicleta fija","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e254","nombre":"Bicicleta reclinada","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e255","nombre":"Bicicleta de spinning","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e256","nombre":"Intervalos en bicicleta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e257","nombre":"Elíptico","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e258","nombre":"Escaladora","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e259","nombre":"Máquina de remo","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e260","nombre":"Air bike","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e261","nombre":"Assault bike por intervalos","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e262","nombre":"Saltar la cuerda","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e263","nombre":"Cuerda de velocidad","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e264","nombre":"Remo ergómetro por intervalos","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e265","nombre":"Subida de escaleras","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e266","nombre":"Caminata al aire libre","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e267","nombre":"Trote al aire libre","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e268","nombre":"Carrera de intervalos al aire libre","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e269","nombre":"Sprints en cuesta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e270","nombre":"Ciclismo al aire libre","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e271","nombre":"Natación continua","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e272","nombre":"Natación por intervalos","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e273","nombre":"Marcha rápida","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e274","nombre":"Marcha en el lugar","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e275","nombre":"Jumping jacks","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e276","nombre":"Burpees","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e277","nombre":"Burpees sin salto","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e278","nombre":"Skaters laterales","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e279","nombre":"Saltos de tijera","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e280","nombre":"Step-ups continuos","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e281","nombre":"Circuito aeróbico de bajo impacto","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e282","nombre":"Shadow boxing","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e283","nombre":"Boxeo con saco","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e284","nombre":"Golpes al aire por intervalos","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e285","nombre":"Trineo de empuje","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e286","nombre":"Trineo de arrastre","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e287","nombre":"Caminata con chaleco lastrado","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e288","nombre":"Battle ropes","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e289","nombre":"Circuito de remo y bicicleta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e290","nombre":"Caminata en cinta lateral","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e291","nombre":"Caminata hacia atrás en cinta","grupoMuscular":"Cardio","equipo":"Bodyweight"},{"id":"e292","nombre":"Press militar con barra","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e293","nombre":"Press militar sentado con mancuernas","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e294","nombre":"Press Arnold","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e295","nombre":"Press de hombros en máquina","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e296","nombre":"Press de hombros en Smith","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e297","nombre":"Press unilateral en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e298","nombre":"Elevación lateral con mancuernas","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e299","nombre":"Elevación lateral sentado","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e300","nombre":"Elevación lateral en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e301","nombre":"Elevación lateral unilateral en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e302","nombre":"Elevación lateral en máquina","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e303","nombre":"Elevación lateral inclinada","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e304","nombre":"Elevación frontal con mancuernas","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e305","nombre":"Elevación frontal con barra","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e306","nombre":"Elevación frontal con disco","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e307","nombre":"Elevación frontal en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e308","nombre":"Pájaros con mancuernas","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e309","nombre":"Pájaros en banco inclinado","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e310","nombre":"Pájaros en peck deck inverso","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e311","nombre":"Pájaros en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e312","nombre":"Face pull con cuerda","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e313","nombre":"Remo al mentón con barra EZ","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e314","nombre":"Remo al mentón con polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e315","nombre":"Remo al mentón con mancuernas","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e316","nombre":"Encogimientos en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e317","nombre":"Y-raise en banco inclinado","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e318","nombre":"Y-raise en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e319","nombre":"Rotación externa con banda","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e320","nombre":"Rotación externa en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e321","nombre":"Rotación externa acostado con mancuerna","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e322","nombre":"Elevación en plano escapular","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e323","nombre":"Press landmine","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e324","nombre":"Press landmine unilateral","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e325","nombre":"Elevación lateral con banda","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e326","nombre":"Remo alto con cuerda","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e327","nombre":"Reverse fly en máquina","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e328","nombre":"Press de hombros con agarre neutro","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e329","nombre":"Elevación frontal alternada","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e330","nombre":"Pájaros unilateral en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e331","nombre":"Encogimiento con trap bar","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e332","nombre":"Farmer's carry","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e333","nombre":"Scaption con mancuernas","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e334","nombre":"Rotación interna en polea","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e335","nombre":"Elevación lateral parcial controlada","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e336","nombre":"Press Z sentado en suelo","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e337","nombre":"Wall slides","grupoMuscular":"Hombros","equipo":"Bodyweight"},{"id":"e338","nombre":"Curl de muñeca con barra supinado","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e339","nombre":"Curl de muñeca con barra pronado","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e340","nombre":"Curl de muñeca con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e341","nombre":"Extensión de muñeca con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e342","nombre":"Curl inverso con barra EZ","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e343","nombre":"Curl inverso con barra recta","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e344","nombre":"Curl inverso con mancuernas","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e345","nombre":"Curl martillo cruzado","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e346","nombre":"Pronación de antebrazo con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e347","nombre":"Supinación de antebrazo con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e348","nombre":"Desviación radial con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e349","nombre":"Desviación cubital con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e350","nombre":"Agarre estático con discos","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e351","nombre":"Pinza de discos","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e352","nombre":"Colgado de barra","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e353","nombre":"Flexión de dedos con mancuerna","grupoMuscular":"Antebrazos","equipo":"Bodyweight"},{"id":"e354","nombre":"Extensión de dedos con banda","grupoMuscular":"Antebrazos","equipo":"Bodyweight"}];
          const toAdd = lib.filter((x: any) => !existing.has(norm(x.nombre)));
          if (toAdd.length > 0) {
            await saveCoachExercises(coachId, [...customEx2, ...toAdd]);
            const existingIds = new Set(get().ejercicios.map((e) => e.id));
            const nuevos = toAdd.filter((e: any) => !existingIds.has(e.id));
            if (nuevos.length > 0) {
              set((state) => ({ ejercicios: [...state.ejercicios, ...nuevos] }));
            }
          }
        }
      } catch (e) { console.error("auto-apply library", e); }


      // Load ejercicio tutoriales from blob
      try {
        const tutoriales = await loadEjercicioTutoriales(coachId);
        set({ ejercicioTutoriales: tutoriales });
      } catch {}

      // Sync agenda between localStorage and Supabase blob (MERGE by ID)
      try {
        const localAgenda = get().agenda;
        const remoteAgenda = await getCoachAgenda(coachId);
        if (remoteAgenda.length > 0 || localAgenda.length > 0) {
          // Merge: keep unique sessions by ID, prefer whichever version has more fields
          const merged = [...localAgenda];
          for (const r of remoteAgenda) {
            const idx = merged.findIndex((m) => m.id === r.id);
            if (idx === -1) {
              merged.push(r);
            } else if (Object.keys(r).length > Object.keys(merged[idx]).length) {
              merged[idx] = r;
            }
          }
          if (merged.length !== localAgenda.length || JSON.stringify(merged) !== JSON.stringify(localAgenda)) {
            saveAgenda(merged);
            set({ agenda: merged });
          }
          // Save merged back to blob for cross-device sync
          await saveAgendaForCoach(coachId, merged);
        }
      } catch {}

      // Sync redes from Supabase blob (MERGE by ID)
      try {
        const localRedes = get().redes;
        const remoteRedes = await getCoachRedes(coachId);
        if (remoteRedes.length > 0) {
          // Merge: keep unique redes by ID
          const merged = [...localRedes];
          let changed = false;
          for (const r of remoteRedes) {
            const idx = merged.findIndex((m) => m.id === r.id);
            if (idx === -1) {
              merged.push(r);
              changed = true;
            } else if (Object.keys(r).length > Object.keys(merged[idx]).length) {
              merged[idx] = r;
              changed = true;
            }
          }
          if (changed) {
            saveRedes(merged);
            set({ redes: merged });
          }
        } else if (localRedes.length > 0) {
          // No remote redes but local exists — push to blob
          await saveRedesForCoach(coachId, localRedes);
        }
      } catch {}

      // Sync unassigned routines from blob
      try {
        const local = get().unassignedRoutines;
        const remote = await getCoachUnassignedRoutines(coachId);
        if (remote.length > 0) {
          const merged = [...local];
          let changed = false;
          for (const r of remote) {
            if (!merged.find((m) => m.id === r.id)) {
              merged.push(r);
              changed = true;
            }
          }
          if (changed) {
            saveUnassignedRoutines(merged);
            set({ unassignedRoutines: merged });
          }
        } else if (local.length > 0) {
          await saveCoachUnassignedRoutines(coachId, local);
        }
      } catch {}

      // Sync unassigned plans from blob
      try {
        const local = get().unassignedPlans;
        const remote = await getCoachUnassignedPlans(coachId);
        if (remote.length > 0) {
          const merged = [...local];
          let changed = false;
          for (const p of remote) {
            if (!merged.find((m) => m.id === p.id)) {
              merged.push(p);
              changed = true;
            }
          }
          if (changed) {
            saveUnassignedPlans(merged);
            set({ unassignedPlans: merged });
          }
        } else if (local.length > 0) {
          await saveCoachUnassignedPlans(coachId, local);
        }
      } catch {}

      // Load premium data
      try {
        const premium = await getPremium(coachId);
        if (premium) set({ premium, premiumCargado: true });
        else set({ premium: null, premiumCargado: true });
      } catch {
        set({ premium: null, premiumCargado: true });
      }
    } catch (e) {
      console.error("Error syncing coach data:", e);
    }
  },

  syncStudentData: async () => {
    const studentId = get().usuarioActual?.id;
    const email = get().usuarioActual?.email;
    if (!studentId || !email) return;

    // Workout plans (independent, may fail)
    try {
      const plans = await getStudentWorkoutPlans(studentId);
      const DAY_ORDER: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
      const parsed: Rutina[] = plans.map((p: any) => ({
        id: p.id,
        coachId: p.coach_id ?? "",
        nombre: p.name,
        descripcion: p.description ?? "",
        alumnoId: studentId,
        mes: 1,
        anio: 2026,
        activa: true,
        creadoEn: p.created_at,
        indicacionesSemanales: parseIndicacionesSemanales(p.description),
        dias: (p.workout_days ?? []).sort((a: any, b: any) => (DAY_ORDER[a.week_day] ?? 99) - (DAY_ORDER[b.week_day] ?? 99)).map((d: any) => ({
          id: d.id,
          nombre: d.day_name,
          diaSemana: d.week_day === "monday" ? "lunes" :
            d.week_day === "tuesday" ? "martes" :
            d.week_day === "wednesday" ? "miercoles" :
            d.week_day === "thursday" ? "jueves" :
            d.week_day === "friday" ? "viernes" :
            d.week_day === "saturday" ? "sabado" : "domingo",
          ejercicios: (d.workout_exercises ?? []).map((we: any) => {
            let nombre = "", grupo = "", videoUrl = "", notas = we.notes ?? "";
            let seriesPorSemana = null, repsPorSemana = null, descansoPorSemana = null, notasPorSemana = null;
            if (typeof notas === "object" && notas !== null) {
              nombre = notas.n ?? ""; grupo = notas.g ?? ""; videoUrl = notas.v ?? "";
              seriesPorSemana = notas.sps ?? null; repsPorSemana = notas.rps ?? null;
              descansoPorSemana = notas.dps ?? null; notasPorSemana = notas.nps ?? null;
              notas = notas.c ?? "";
            } else {
              try { const m = JSON.parse(notas || "{}"); if (m.n) { nombre = m.n; grupo = m.g; videoUrl = m.v ?? ""; seriesPorSemana = m.sps ?? null; repsPorSemana = m.rps ?? null; descansoPorSemana = m.dps ?? null; notasPorSemana = m.nps ?? null; notas = m.c ?? ""; } } catch {}
            }
            return {
              id: we.id,
              ejercicioId: we.exercise_id,
              ejercicioNombre: nombre,
              grupoMuscular: grupo,
              series: (we.exercise_sets ?? []).length,
              reps: (we.exercise_sets ?? [])[0]?.reps ?? 0,
              descansoSegundos: (we.exercise_sets ?? [])[0]?.rest_seconds ?? 90,
              notas,
              videoUrl,
              seriesPorSemana,
              repsPorSemana,
              descansoPorSemana,
              notasPorSemana,
            };
          }),
        })),
      }));
      set((state) => ({
        rutinas: [...state.rutinas.filter((r) => r.alumnoId !== studentId), ...parsed],
      }));
    } catch (e) { console.error("sync workouts:", e); }

    // Nutrition plans (independent)
    try {
      const nutritionPlans = await getStudentNutritionPlans(studentId);
      if (nutritionPlans.length > 0) {
        set((state) => ({
          planesNutricionales: [
            ...state.planesNutricionales.filter((p) => p.alumnoId !== studentId),
            ...nutritionPlans,
          ],
        }));
      }
    } catch (e) { console.error("sync nutrition:", e); }

    // Water (independent)
    try {
      const agua = await getWaterToday(studentId);
      if (agua > 0) {
        const hoy = new Date().toISOString().split("T")[0];
        const existing = get().registrosAgua.find((r) => r.alumnoId === studentId && r.fecha === hoy);
        if (!existing) {
          set((state) => ({
            registrosAgua: [...state.registrosAgua, { id: `agua_sync_${Date.now()}`, alumnoId: studentId, vasos: agua, fecha: hoy }],
          }));
        }
      }
    } catch (e) { console.error("sync water:", e); }

    // Current week
    try {
      const week = await getStudentCurrentWeek(studentId);
      set({ currentWeek: week });
    } catch {}

    // Profile + coach + phone + agenda (most critical, separate from supabase tables)
    try {
      let resolvedCoachId = "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, display_name, role")
        .eq("id", studentId)
        .maybeSingle();
      if (profile) {
        try {
          const cid = await getCoachByStudentEmail(email);
          if (cid) {
            resolvedCoachId = cid;
            saveStudentCoachId(cid);
            const { data: coachProfile } = await supabase
              .from("profiles")
              .select("id, email, display_name")
              .eq("id", cid)
              .maybeSingle();
            if (coachProfile) {
              let coachPhone = "";
              try { coachPhone = await getCoachPhone(cid); } catch {}
              let coachBranding: CoachBranding | null = null;
              try { coachBranding = (await getCoachBranding(cid)) ?? get().coaches[cid]?.branding ?? null; } catch { coachBranding = get().coaches[cid]?.branding ?? null; }
              const coaches = { ...get().coaches, [cid]: { id: cid, nombre: coachProfile.display_name, email: coachProfile.email, telefono: coachPhone || undefined, branding: coachBranding } };
              set({ coaches });
              try { localStorage.setItem(STORAGE_COACHES_KEY, JSON.stringify(coaches)); } catch {}
            }
            // Load agenda from coach's blob (RLS blocks coach writing student blob)
            try {
              const agendaSessions = await getCoachAgenda(cid);
              if (agendaSessions.length > 0) {
                const filtered = agendaSessions.filter((s: any) =>
                  s.alumnoIds?.includes(studentId) ||
                  s.alumnoEmails?.includes(email)
                );
                if (filtered.length > 0) {
                  set((state) => {
                    const merged = [...state.agenda];
                    for (const s of filtered) {
                      if (!merged.find((m) => m.id === s.id)) merged.push(s);
                    }
                    return { agenda: merged };
                  });
                }
              }
            } catch {}
          }
        } catch {}

        try {
          const phone = await getStudentPhone(studentId);
          if (phone) {
            set((s) => ({ usuarioActual: s.usuarioActual ? { ...s.usuarioActual, telefono: phone } : null }));
          }
        } catch {}

        try {
          const weightData = await getStudentWeight(studentId);
          if (weightData) {
            set((s) => ({
              alumnos: s.alumnos.map((a) =>
                a.id === studentId ? { ...a, peso: weightData.peso, fechaPeso: weightData.fecha, ultimoPesoRegistrado: a.peso } : a
              ),
            }));
          }
        } catch {}

        const existingAlumno = get().alumnos.find((a) => a.email === email);
        const existingSaved = loadAlumnosPeso()[profile.id];
        const pesoInicial = existingAlumno?.peso ?? existingSaved?.peso ?? 0;
        const fechaPesoInicial = existingAlumno?.fechaPeso ?? existingSaved?.fecha ?? undefined;
        const ultimoPesoInicial = existingAlumno?.ultimoPesoRegistrado;
        const phone = get().usuarioActual?.telefono ?? "";
        set((state) => ({
          alumnos: [
            ...state.alumnos.filter((a) => a.email !== email),
            {
              id: profile.id,
              coachId: resolvedCoachId,
              redId: "",
              nombre: profile.display_name,
              email: profile.email,
              telefono: phone || undefined,
              edad: existingAlumno?.edad ?? 0,
              peso: pesoInicial,
              ultimoPesoRegistrado: ultimoPesoInicial,
              fechaPeso: fechaPesoInicial,
              objetivo: "mantenimiento" as Goal,
              plan: "solo_rutina" as PlanType,
              creadoEn: new Date().toISOString(),
            } as Alumno,
          ],
        }));
      }
    } catch (e) { console.error("sync profile:", e); }
  },

  // ─── Nutrición ────────────────────────────────────────────

  asignarPlanNutricional: async (p) => {
    requierePremium();
    const coachId = get().usuarioActual?.id ?? p.coachId;
    try {
      const plan = await saveNutritionPlan(coachId, p.alumnoId, p.nombre, p.dias);
      const nuevo: PlanNutricional = {
        ...p,
        id: plan?.id ?? `plan_${Date.now()}`,
        creadoEn: new Date().toISOString(),
      };
      const state = get();
      const _alumno = state.alumnos.find((al) => al.id === p.alumnoId);
      const alumnoNombre = _alumno ? (_alumno.apodo || _alumno.nombre) : "";
      const actividadId = `act_${Date.now()}`;
      const timestamp = new Date().toISOString();
      const mensaje = `recibió nuevo plan nutricional: ${p.nombre}`;
      const nuevasActividades: Actividad[] = [
        { id: actividadId, tipo: "entreno", alumnoId: p.alumnoId, alumnoNombre, mensaje, timestamp },
        ...state.actividades,
      ];
      set({ planesNutricionales: [...state.planesNutricionales, nuevo], actividades: nuevasActividades });
      saveActividades(nuevasActividades);
      await saveStudentActivity(p.alumnoId, { id: actividadId, tipo: "entreno", alumnoId: p.alumnoId, alumnoNombre, mensaje, timestamp }).catch(() => {});
    } catch {
      const state = get();
      const nuevo: PlanNutricional = { ...p, id: `plan_${Date.now()}`, creadoEn: new Date().toISOString() };
      set({ planesNutricionales: [...state.planesNutricionales, nuevo] });
    }
  },

  getPlanesAlumno: (alumnoId) =>
    get().planesNutricionales.filter((p) => p.alumnoId === alumnoId && p.activo),

  eliminarPlanNutricional: async (id) => {
    requierePremium();
    const plan = get().planesNutricionales.find((p) => p.id === id);
    try { await deleteWorkoutPlan(id); } catch {}
    set((state) => ({
      planesNutricionales: state.planesNutricionales.filter((p) => p.id !== id),
    }));
    trackActivity("nutrition_deleted", `Eliminó el plan nutricional${plan ? ` "${plan.nombre}"` : ""}`, plan ? { planName: plan.nombre } : undefined);
  },

  // ─── Ejercicios Personalizados ─────────────────────────────

  agregarEjercicioPersonalizado: (e) => {
    requierePremium();
    const nuevo = { ...e, id: `ej_${Date.now()}` };
    set((state) => {
      const updated = [...state.ejercicios, nuevo];
      const coachId = state.usuarioActual?.id ?? "";
      const personalizados = updated.filter((ej) => ej.id.startsWith("ej_"));
      saveCoachExercises(coachId, personalizados).catch(() => {});
      return { ejercicios: updated };
    });
    trackActivity("exercise_created", `Creó el ejercicio "${e.nombre}"`, { exerciseName: e.nombre });
    return nuevo;
  },

  eliminarEjercicioPersonalizado: (id: string) => {
    requierePremium();
    set((state) => {
      const updated = state.ejercicios.filter((e) => e.id !== id);
      const coachId = state.usuarioActual?.id ?? "";
      const personalizados = updated.filter((ej) => ej.id.startsWith("ej_"));
      saveCoachExercises(coachId, personalizados).catch(() => {});
      return { ejercicios: updated };
    });
  },

  setEjercicioTutorial: async (ejercicioId, videoUrl) => {
    const coachId = get().usuarioActual?.id;
    if (!coachId) return;
    set((state) => ({ ejercicioTutoriales: { ...state.ejercicioTutoriales, [ejercicioId]: videoUrl } }));
    await saveEjercicioTutorial(coachId, ejercicioId, videoUrl);
  },

  // ─── Agenda ───────────────────────────────────────────────

  agregarSesion: (s) => {
    requierePremium();
    const state = get();
    const id = `ag_${Date.now()}`;
    const alumnoEmails = state.alumnos.filter(a => s.alumnoIds?.includes(a.id)).map(a => a.email).filter(Boolean);
    const session = { ...s, id, coachId: state.usuarioActual?.id ?? s.coachId ?? "", alumnoEmails: alumnoEmails.length ? alumnoEmails : undefined };
    const nueva = [...state.agenda, session];
    saveAgenda(nueva);
    set({ agenda: nueva });
    try { saveAgendaForCoach(state.usuarioActual?.id ?? s.coachId ?? "", nueva); } catch {}
    trackActivity("session_created", `Agendó la sesión "${s.titulo}"`, { sessionTitle: s.titulo });
  },

  eliminarSesion: (id) => {
    requierePremium();
    const state = get();
    const coachId = state.usuarioActual?.id ?? "";
    const nueva = state.agenda.filter((s) => s.id !== id);
    saveAgenda(nueva);
    set({ agenda: nueva });
    try { saveAgendaForCoach(coachId, nueva); } catch {}
  },
  editarSesion: (id, updates) => {
    requierePremium();
    const state = get();
    const coachId = state.usuarioActual?.id ?? "";
    const nueva = state.agenda.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    saveAgenda(nueva);
    set({ agenda: nueva });
    try { saveAgendaForCoach(coachId, nueva); } catch {}
  },

  // ─── Progreso ─────────────────────────────────────────────

  registrarAgua: async (alumnoId, vasos) => {
    const state = get();
    const hoy = new Date().toISOString().split("T")[0];
    const existente = state.registrosAgua.find(
      (r) => r.alumnoId === alumnoId && r.fecha === hoy
    );
    let nuevosRegistros: RegistroAgua[];
    if (existente) {
      nuevosRegistros = state.registrosAgua.map((r) =>
        r.id === existente.id ? { ...r, vasos: r.vasos + vasos } : r
      );
    } else {
      nuevosRegistros = [
        ...state.registrosAgua,
        { id: `agua_${Date.now()}`, alumnoId, vasos, fecha: hoy },
      ];
    }
    const _a = state.alumnos.find((a) => a.id === alumnoId);
    const alumnoNombre = _a ? (_a.apodo || _a.nombre) : "";
    const actividadId = `act_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const mensaje = `tomó ${vasos} vaso(s) de agua`;
    const nuevasActividades: Actividad[] = [
      { id: actividadId, tipo: "agua", alumnoId, alumnoNombre, mensaje, timestamp },
      ...state.actividades,
    ];
    set({ registrosAgua: nuevosRegistros, actividades: nuevasActividades });
    saveAgua(nuevosRegistros);
    saveActividades(nuevasActividades);
    try { saveWaterEntry(alumnoId, vasos); } catch {}
    await saveStudentActivity(alumnoId, { id: actividadId, tipo: "agua", alumnoId, alumnoNombre, mensaje, timestamp }).catch(() => {});
  },

  quitarAgua: (alumnoId, vasos) => {
    const state = get();
    const hoy = new Date().toISOString().split("T")[0];
    const existente = state.registrosAgua.find(
      (r) => r.alumnoId === alumnoId && r.fecha === hoy
    );
    if (!existente) return;
    const nuevosRegistros = state.registrosAgua.map((r) =>
      r.id === existente.id
        ? { ...r, vasos: Math.max(0, r.vasos - vasos) }
        : r
    ).filter((r) => r.vasos > 0);
    set({ registrosAgua: nuevosRegistros });
    saveAgua(nuevosRegistros);
    try { removeWaterEntry(alumnoId, vasos); } catch {}
  },

  getAguaHoy: (alumnoId) => {
    const hoy = new Date().toISOString().split("T")[0];
    return (
      get().registrosAgua.find((r) => r.alumnoId === alumnoId && r.fecha === hoy)
        ?.vasos ?? 0
    );
  },

  registrarPeso: async (alumnoId, peso) => {
    get().actualizarPesoAlumno(alumnoId, peso);
    const state = get();
    const nuevosRegistros = [
      ...state.registrosPeso,
      { id: `peso_${Date.now()}`, alumnoId, peso, fecha: new Date().toISOString().split("T")[0] },
    ];
    set({ registrosPeso: nuevosRegistros });
    savePeso(nuevosRegistros);
    const saved = loadAlumnosPeso();
    saved[alumnoId] = { peso, fecha: new Date().toISOString().split("T")[0] };
    saveAlumnosPeso(saved);
    try { await saveStudentWeight(alumnoId, peso); } catch {}
  },

  // ─── Sesiones de Entreno ──────────────────────────────────

  iniciarSesionEntreno: (alumnoId, rutinaId, diaRutinaId) => {
    const id = `se_${Date.now()}`;
    const rutina = get().rutinas.find((r) => r.id === rutinaId);
    const dia = rutina?.dias.find((d) => d.id === diaRutinaId);
    const weekIdx = (get().currentWeek ?? 1) - 1;
    const series = dia?.ejercicios.flatMap((e) =>
      Array.from({ length: ejercicioWeekValue(e, "series", e.series, weekIdx) }, (_, i) => ({
        ejercicioId: e.ejercicioId,
        serie: i + 1,
        completada: false,
      }))
    ) ?? [];

    set((state) => ({
      sesionesEntreno: [
        ...state.sesionesEntreno,
        { id, alumnoId, rutinaId, diaRutinaId, fecha: new Date().toISOString(), completada: false, series },
      ],
    }));
    return id;
  },

  completarSerie: (sesionId, ejercicioId, serieNum, peso, reps) =>
    set((state) => ({
      sesionesEntreno: state.sesionesEntreno.map((s) =>
        s.id === sesionId
          ? {
              ...s,
              series: s.series.map((ser) =>
                ser.ejercicioId === ejercicioId && ser.serie === serieNum
                  ? { ...ser, completada: true, pesoUsado: peso, repsHechas: reps }
                  : ser
              ),
            }
          : s
      ),
    })),

  completarEntreno: async (sesionId) => {
    const state = get();
    const sesion = state.sesionesEntreno.find((s) => s.id === sesionId);
    if (!sesion) return;
    try {
      const { saveWorkoutCompletion } = await import("./data");
      await saveWorkoutCompletion(sesion.alumnoId, sesion.diaRutinaId, sesion.series, state.currentWeek ?? undefined);
    } catch {}
    const _alumno = state.alumnos.find((a) => a.id === sesion.alumnoId);
    const alumnoNombre = _alumno ? (_alumno.apodo || _alumno.nombre) : "";
    const diaNombre = state.rutinas.flatMap((r) => r.dias).find((d) => d.id === sesion.diaRutinaId)?.nombre ?? "";
    const hoy = new Date();
    const fechaStr = `${hoy.getDate()} de ${hoy.toLocaleDateString("es-AR", { month: "long" })}`;
    const msg = diaNombre ? `completó ${diaNombre} (${fechaStr})` : `completó el entrenamiento de hoy (${fechaStr})`;
    const actividadId = `act_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const nuevasActividades: Actividad[] = [
      {
        id: actividadId,
        tipo: "entreno",
        alumnoId: sesion.alumnoId,
        alumnoNombre,
        mensaje: msg,
        timestamp,
      },
      ...state.actividades,
    ];
    set({
      sesionesEntreno: state.sesionesEntreno.map((s) =>
        s.id === sesionId ? { ...s, completada: true } : s
      ),
      actividades: nuevasActividades,
    });
    saveActividades(nuevasActividades);
    await saveStudentActivity(sesion.alumnoId, { id: actividadId, tipo: "entreno", alumnoId: sesion.alumnoId, alumnoNombre, mensaje: msg, timestamp }).catch(() => {});
    // Fire-and-forget: POST to API for cross-machine sync
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        let targetCoachId = state.alumnos.find((a) => a.id === sesion.alumnoId)?.coachId;
        if (!targetCoachId) {
          const email = state.usuarioActual?.email;
          if (email) {
            const cid = await getCoachByStudentEmail(email).catch(() => null);
            if (cid) targetCoachId = cid;
          }
        }
        const weekCode = (() => {
          const d = new Date();
          const start = new Date(d.getFullYear(), 0, 1);
          const diff = d.getTime() - start.getTime();
          const dayOfYear = Math.floor(diff / 86400000);
          const weekNum = Math.ceil((dayOfYear + start.getDay() + 1) / 7);
          return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
        })();
        const routineWeek = state.currentWeek ?? 1;
        if (targetCoachId) {
          fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              activity: { id: actividadId, tipo: "entreno", alumnoId: sesion.alumnoId, alumnoNombre, mensaje: msg, timestamp, coachId: targetCoachId },
              completion: { weekKey: `${sesion.diaRutinaId}_w${routineWeek}_${weekCode}` },
            }),
          }).catch(() => {});
        }
      }
    } catch {}
  },

  getSesionEntrenoActiva: (alumnoId) =>
    get().sesionesEntreno.find(
      (s) => s.alumnoId === alumnoId && !s.completada
    ),

  // ─── Perfil ───────────────────────────────────────────────

  actualizarTelefono: (telefono) => {
    const state = get();
    if (state.usuarioActual) {
      set({ usuarioActual: { ...state.usuarioActual, telefono } });
    }
    try { localStorage.setItem(STORAGE_TELEFONO_KEY, telefono); } catch {}
    // If coach, propagate to coaches map & sync to students
    const user = state.usuarioActual;
    if (user?.rol === "coach") {
      const coaches = { ...state.coaches, [user.id]: { id: user.id, nombre: user.nombre, telefono, email: user.email } };
      set({ coaches });
      try { localStorage.setItem(STORAGE_COACHES_KEY, JSON.stringify(coaches)); } catch {}
      try { saveStudentPhone(user.id, telefono); } catch {}
    } else if (user?.rol === "alumno") {
      set((s) => ({ alumnos: s.alumnos.map((a) => a.id === user.id ? { ...a, telefono } : a) }));
      try { saveStudentPhone(user.id, telefono); } catch {}
    }
  },
  actualizarNombre: (nombre) => {
    const state = get();
    if (state.usuarioActual) {
      set({ usuarioActual: { ...state.usuarioActual, nombre } });
    }
    if (state.usuarioActual?.rol === "alumno") {
      set((s) => ({ alumnos: s.alumnos.map((a) => a.id === state.usuarioActual!.id ? { ...a, nombre } : a) }));
    }
  },
  actualizarCoachEnAlumnos: () => {
    const state = get();
    const user = state.usuarioActual;
    if (user?.rol === "coach") {
      const coaches = { ...state.coaches, [user.id]: { id: user.id, nombre: user.nombre, telefono: user.telefono, email: user.email } };
      set({ coaches });
      try { localStorage.setItem(STORAGE_COACHES_KEY, JSON.stringify(coaches)); } catch {}
    }
  },
  actualizarCoachBranding: (coachId, branding) => {
    const state = get();
    const coaches = {
      ...state.coaches,
      [coachId]: { ...(state.coaches[coachId] ?? { id: coachId, nombre: "" }), branding },
    };
    set({ coaches });
    try { localStorage.setItem(STORAGE_COACHES_KEY, JSON.stringify(coaches)); } catch {}
  },

  // ─── Ejercicios propios ───────────────────────────────────

  agregarEjercicioPropio: (e) => {
    requierePremium();
    set((state) => ({
      ejerciciosPersonalizados: [...state.ejerciciosPersonalizados, { ...e, id: `ejp_${Date.now()}` }],
    }));
  },
  eliminarEjercicioPropio: (id) => {
    requierePremium();
    set((state) => ({
      ejerciciosPersonalizados: state.ejerciciosPersonalizados.filter((e) => e.id !== id),
    }));
  },

  // ─── Rutinas propias ──────────────────────────────────────

  agregarRutinaPropia: (r) => {
    requierePremium();
    set((state) => ({
      rutinas: [...state.rutinas, { ...r, id: `rut_${Date.now()}`, creadoEn: new Date().toISOString() }],
    }));
  },
  eliminarRutinaPropia: (id) => {
    requierePremium();
    set((state) => ({
      rutinas: state.rutinas.filter((r) => r.id !== id),
    }));
  },

  // ─── Planes propios ───────────────────────────────────────

  agregarPlanPropio: (p) => {
    requierePremium();
    set((state) => ({
      planesNutricionales: [...state.planesNutricionales, { ...p, id: `plan_${Date.now()}`, creadoEn: new Date().toISOString() }],
    }));
  },
  eliminarPlanPropio: (id) => {
    requierePremium();
    set((state) => ({
      planesNutricionales: state.planesNutricionales.filter((pl) => pl.id !== id),
    }));
  },

  // ─── Helpers ──────────────────────────────────────────────

  getAlumno: (id) => get().alumnos.find((a) => a.id === id),
  getEjercicios: () => [...get().ejercicios, ...get().ejerciciosPersonalizados],
  getActividadesRecientes: () => get().actividades.slice(0, 20),

  // ─── Premium ─────────────────────────────────────────

  setPremiumError: (msg) => set({ premiumError: msg, upgradeReason: null }),
  abrirUpgrade: (tipo, msg) => set({ premiumError: msg, upgradeReason: tipo }),
  cerrarPaywall: () => set({ premiumError: null, upgradeReason: null }),
  getLimiteAlumnos: () => {
    const user = get().usuarioActual;
    if (esCoachGratuito(user?.email)) return 9999;
    const premium = get().premium;
    if (premium && new Date(premium.premiumExpiresAt) > new Date()) return 9999;
    return 2;
  },
  getLimiteRutinas: () => {
    const user = get().usuarioActual;
    if (esCoachGratuito(user?.email)) return 9999;
    const premium = get().premium;
    if (premium && new Date(premium.premiumExpiresAt) > new Date()) return 9999;
    return 3;
  },
  verificarCupoRutinas,
  cargarSuscripcion: async () => {
    const coachId = get().usuarioActual?.id;
    if (!coachId) return;
    try {
      const premium = await getPremium(coachId);
      if (premium) set({ premium, premiumCargado: true });
      else set({ premium: null, premiumCargado: true });
    } catch {
      set({ premium: null, premiumCargado: true });
    }
  },
  cambiarPlan: async (planId) => {
    // Premium plans are handled via MP payment flow
  },
  contratarPremium: async (plan: PremiumPlan, meses = 1) => {
    const coachId = get().usuarioActual?.id;
    if (!coachId) throw new Error("Debés iniciar sesión como coach");
    const cantidad = Math.min(Math.max(Number(meses) || 1, 1), 36);
    const dias = plan.dias * cantidad;
    const isDev = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.search.includes("dev"));
    const isTest = typeof window !== "undefined" && window.location.search.includes("test=1");
    const usaMp = typeof window !== "undefined" && window.location.search.includes("mp=1");
    if ((isDev || isTest) && !usaMp) {
      const now = new Date();
      const existing = get().premium;
      const base = existing?.premiumExpiresAt && new Date(existing.premiumExpiresAt) > now
        ? new Date(existing.premiumExpiresAt)
        : now;
      const premium: PremiumData = {
        planId: plan.id,
        planName: plan.nombre,
        planDurationDays: dias,
        planPrice: plan.precio * cantidad,
        premiumExpiresAt: new Date(base.getTime() + dias * 86400000).toISOString(),
        paymentStatus: "approved",
        paymentDate: now.toISOString(),
      };
      set({ premium });
      await savePremium(coachId, premium);
      return;
    }
    const res = await fetch("/api/mp/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, months: cantidad }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al crear pago");
    window.location.href = data.init_point;
  },

  // ─── Current Week ───────────────────────────────────────────

  loadCurrentWeek: async () => {
    const studentId = get().usuarioActual?.id;
    if (!studentId) return;
    try {
      const week = await getStudentCurrentWeek(studentId);
      set({ currentWeek: week });
    } catch {}
  },

  setCurrentWeek: async (week) => {
    const studentId = get().usuarioActual?.id;
    if (!studentId) return;
    try {
      await saveStudentCurrentWeek(studentId, week);
      set({ currentWeek: week });
    } catch {}
  },

  // ─── Unassigned Routines & Plans ──────────────────────────────

  saveUnassignedRoutine: async (r) => {
    requierePremium();
    verificarCupoRutinas(1);
    const coachId = get().usuarioActual?.id ?? r.coachId;
    const state = get();
    const nueva: Rutina = { ...r, id: `rut_prop_${Date.now()}`, creadoEn: new Date().toISOString() };
    const nuevas = [...state.unassignedRoutines, nueva];
    saveUnassignedRoutines(nuevas);
    set({ unassignedRoutines: nuevas });
    if (coachId) saveCoachUnassignedRoutines(coachId, nuevas).catch(() => {});
    trackActivity("routine_created", `Creó la rutina "${r.nombre}"`, { routineName: r.nombre });
  },

  deleteUnassignedRoutine: (id) => {
    requierePremium();
    const state = get();
    const nuevas = state.unassignedRoutines.filter((r) => r.id !== id);
    saveUnassignedRoutines(nuevas);
    set({ unassignedRoutines: nuevas });
    const coachId = state.usuarioActual?.id;
    if (coachId) saveCoachUnassignedRoutines(coachId, nuevas).catch(() => {});
  },

  assignUnassignedRoutine: async (routineId, alumnoId) => {
    const state = get();
    const rutina = state.unassignedRoutines.find((r) => r.id === routineId);
    if (!rutina) return;
    await get().asignarRutina({ ...rutina, alumnoId });
    await get().deleteUnassignedRoutine(routineId);
  },

  saveUnassignedPlan: async (p) => {
    requierePremium();
    const coachId = get().usuarioActual?.id ?? p.coachId;
    const state = get();
    const nuevo: PlanNutricional = { ...p, id: `plan_prop_${Date.now()}`, creadoEn: new Date().toISOString() };
    const nuevos = [...state.unassignedPlans, nuevo];
    saveUnassignedPlans(nuevos);
    set({ unassignedPlans: nuevos });
    if (coachId) saveCoachUnassignedPlans(coachId, nuevos).catch(() => {});
    trackActivity("nutrition_created", `Creó el plan nutricional "${p.nombre}"`, { planName: p.nombre });
  },

  deleteUnassignedPlan: (id) => {
    requierePremium();
    const state = get();
    const nuevos = state.unassignedPlans.filter((p) => p.id !== id);
    saveUnassignedPlans(nuevos);
    set({ unassignedPlans: nuevos });
    const coachId = state.usuarioActual?.id;
    if (coachId) saveCoachUnassignedPlans(coachId, nuevos).catch(() => {});
  },

  assignUnassignedPlan: async (planId, alumnoId) => {
    const state = get();
    const plan = state.unassignedPlans.find((p) => p.id === planId);
    if (!plan) return;
    await get().asignarPlanNutricional({ ...plan, alumnoId });
    await get().deleteUnassignedPlan(planId);
  },

  unassignRoutine: async (routineId) => {
    const state = get();
    const rutina = state.rutinas.find((r) => r.id === routineId);
    if (!rutina) return;
    await get().saveUnassignedRoutine({ ...rutina, alumnoId: "" });
    await get().eliminarRutina(routineId);
  },

  unassignPlan: async (planId) => {
    const state = get();
    const plan = state.planesNutricionales.find((p) => p.id === planId);
    if (!plan) return;
    await get().saveUnassignedPlan({ ...plan, alumnoId: "" });
    await get().eliminarPlanNutricional(planId);
  },

  // Page draft state — persists across SPA navigation and full reloads via localStorage
  pageDrafts: loadPageDrafts(),
  setPageDraft: (page, data) => set((s) => {
    const next = { ...s.pageDrafts, [page]: data };
    savePageDrafts(next);
    return { pageDrafts: next };
  }),
};
});
