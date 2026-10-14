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
  { id: "e12", nombre: "Curl con Barra", grupoMuscular: "Biceps", equipo: "Barra" },
  { id: "e13", nombre: "Curl con Mancuernas", grupoMuscular: "Biceps", equipo: "Mancuerna" },
  { id: "e14", nombre: "Curl Martillo", grupoMuscular: "Biceps", equipo: "Mancuerna" },
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
  { id: "e26", nombre: "Hip Thrust con barra", grupoMuscular: "Glúteos", equipo: "Barra" },
  { id: "e27", nombre: "Hip Thrust con mancuerna", grupoMuscular: "Glúteos", equipo: "Mancuerna" },
  { id: "e28", nombre: "Patada de glúteo en polea", grupoMuscular: "Glúteos", equipo: "Cable" },
  { id: "e29", nombre: "Patada de glúteo en máquina", grupoMuscular: "Glúteos", equipo: "Máquina" },
  { id: "e30", nombre: "Sentadilla sumo con mancuerna", grupoMuscular: "Glúteos", equipo: "Mancuerna" },
  { id: "e31", nombre: "Puente de glúteos en suelo", grupoMuscular: "Glúteos", equipo: "Bodyweight" },
  { id: "e32", nombre: "Abducción de cadera en máquina", grupoMuscular: "Glúteos", equipo: "Máquina" },
  { id: "e33", nombre: "Abducción de cadera con banda", grupoMuscular: "Glúteos", equipo: "Banda" },
  { id: "e34", nombre: "Peso muerto rumano para glúteo", grupoMuscular: "Glúteos", equipo: "Barra" },
  { id: "e35", nombre: "Step-up en cajón", grupoMuscular: "Glúteos", equipo: "Mancuerna" },
];

const BIBLIOTECA_EXTENDIDA: Ejercicio[] = [
  { id: "e36", nombre: "Press Inclinado con Mancuernas", grupoMuscular: "Pecho", equipo: "Mancuerna" },
  { id: "e37", nombre: "Aperturas en Polea", grupoMuscular: "Pecho", equipo: "Cable" },
  { id: "e38", nombre: "Press Declinado con Mancuerna", grupoMuscular: "Pecho", equipo: "Mancuerna" },
  { id: "e39", nombre: "Fondos en Paralelas", grupoMuscular: "Pecho", equipo: "Bodyweight" },
  { id: "e40", nombre: "Press en Máquina", grupoMuscular: "Pecho", equipo: "Máquina" },
  { id: "e41", nombre: "Cruce de Poleas", grupoMuscular: "Pecho", equipo: "Cable" },
  { id: "e42", nombre: "Remo con Mancuerna", grupoMuscular: "Espalda", equipo: "Mancuerna" },
  { id: "e43", nombre: "Pull Over", grupoMuscular: "Espalda", equipo: "Mancuerna" },
  { id: "e44", nombre: "Remo en Polea Baja", grupoMuscular: "Espalda", equipo: "Cable" },
  { id: "e45", nombre: "Jalón Agarre Cerrado", grupoMuscular: "Espalda", equipo: "Cable" },
  { id: "e46", nombre: "Dominadas Asistidas", grupoMuscular: "Espalda", equipo: "Máquina" },
  { id: "e47", nombre: "Press Arnold", grupoMuscular: "Hombros", equipo: "Mancuerna" },
  { id: "e48", nombre: "Elevaciones Posteriores", grupoMuscular: "Hombros", equipo: "Mancuerna" },
  { id: "e49", nombre: "Pájaros con Mancuerna", grupoMuscular: "Hombros", equipo: "Mancuerna" },
  { id: "e50", nombre: "Press Militar con Mancuerna", grupoMuscular: "Hombros", equipo: "Mancuerna" },
  { id: "e51", nombre: "Elevación Lateral en Polea", grupoMuscular: "Hombros", equipo: "Cable" },
  { id: "e52", nombre: "Remo al Mentón", grupoMuscular: "Hombros", equipo: "Barra" },
  { id: "e53", nombre: "Face Pull", grupoMuscular: "Hombros", equipo: "Cable" },
  { id: "e54", nombre: "Curl Predicador", grupoMuscular: "Biceps", equipo: "Barra" },
  { id: "e55", nombre: "Curl en Polea", grupoMuscular: "Biceps", equipo: "Cable" },
  { id: "e56", nombre: "Curl Concentrado", grupoMuscular: "Biceps", equipo: "Mancuerna" },
  { id: "e57", nombre: "Curl Inclinado con Mancuerna", grupoMuscular: "Biceps", equipo: "Mancuerna" },
  { id: "e58", nombre: "Curl Araña", grupoMuscular: "Biceps", equipo: "Mancuerna" },
  { id: "e59", nombre: "Curl con Banda", grupoMuscular: "Biceps", equipo: "Banda" },
  { id: "e60", nombre: "Curl 21", grupoMuscular: "Biceps", equipo: "Barra" },
  { id: "e61", nombre: "Extensión de Tríceps en Polea", grupoMuscular: "Tríceps", equipo: "Cable" },
  { id: "e62", nombre: "Extensión de Tríceps sobre Cabeza", grupoMuscular: "Tríceps", equipo: "Mancuerna" },
  { id: "e63", nombre: "Fondos en Banco", grupoMuscular: "Tríceps", equipo: "Bodyweight" },
  { id: "e64", nombre: "Patada de Tríceps", grupoMuscular: "Tríceps", equipo: "Mancuerna" },
  { id: "e65", nombre: "Press Cerrado", grupoMuscular: "Tríceps", equipo: "Barra" },
  { id: "e66", nombre: "Extensión de Tríceps en Máquina", grupoMuscular: "Tríceps", equipo: "Máquina" },
  { id: "e67", nombre: "Rompecráneos", grupoMuscular: "Tríceps", equipo: "Barra" },
  { id: "e68", nombre: "Fondos en Paralelas para Tríceps", grupoMuscular: "Tríceps", equipo: "Bodyweight" },
  { id: "e69", nombre: "Sentadilla Frontal", grupoMuscular: "Cuádriceps", equipo: "Barra" },
  { id: "e70", nombre: "Sentadilla Búlgara", grupoMuscular: "Cuádriceps", equipo: "Mancuerna" },
  { id: "e71", nombre: "Extensión de Cuádriceps", grupoMuscular: "Cuádriceps", equipo: "Máquina" },
  { id: "e72", nombre: "Hack Squat", grupoMuscular: "Cuádriceps", equipo: "Máquina" },
  { id: "e73", nombre: "Sentadilla con Mancuerna", grupoMuscular: "Cuádriceps", equipo: "Mancuerna" },
  { id: "e74", nombre: "Zancadas Caminando", grupoMuscular: "Cuádriceps", equipo: "Mancuerna" },
  { id: "e75", nombre: "Prensa Inclinada", grupoMuscular: "Cuádriceps", equipo: "Máquina" },
  { id: "e76", nombre: "Curl Femoral Sentado", grupoMuscular: "Isquiotibiales", equipo: "Máquina" },
  { id: "e77", nombre: "Curl Femoral Tumbado", grupoMuscular: "Isquiotibiales", equipo: "Máquina" },
  { id: "e78", nombre: "Peso Muerto Rumano", grupoMuscular: "Isquiotibiales", equipo: "Barra" },
  { id: "e79", nombre: "Peso Muerto Piernas Rígidas", grupoMuscular: "Isquiotibiales", equipo: "Barra" },
  { id: "e80", nombre: "Curl Nórdico", grupoMuscular: "Isquiotibiales", equipo: "Bodyweight" },
  { id: "e81", nombre: "Buenos Días", grupoMuscular: "Isquiotibiales", equipo: "Barra" },
  { id: "e82", nombre: "Curl Femoral con Banda", grupoMuscular: "Isquiotibiales", equipo: "Banda" },
  { id: "e83", nombre: "Peso Muerto Rumano con Mancuernas", grupoMuscular: "Isquiotibiales", equipo: "Mancuerna" },
  { id: "e84", nombre: "Curl Femoral en Polea", grupoMuscular: "Isquiotibiales", equipo: "Cable" },
  { id: "e85", nombre: "Elevación de Talones Sentado", grupoMuscular: "Gemelos", equipo: "Máquina" },
  { id: "e86", nombre: "Elevación de Talones de Pie", grupoMuscular: "Gemelos", equipo: "Máquina" },
  { id: "e87", nombre: "Elevación de Talones en Prensa", grupoMuscular: "Gemelos", equipo: "Máquina" },
  { id: "e88", nombre: "Elevación de Talones con Mancuerna", grupoMuscular: "Gemelos", equipo: "Mancuerna" },
  { id: "e89", nombre: "Elevación de Talones a una Pierna", grupoMuscular: "Gemelos", equipo: "Bodyweight" },
  { id: "e90", nombre: "Elevación de Talones en Escalón", grupoMuscular: "Gemelos", equipo: "Bodyweight" },
  { id: "e91", nombre: "Elevación de Talones con Banda", grupoMuscular: "Gemelos", equipo: "Banda" },
  { id: "e92", nombre: "Elevación de Talones en Smith", grupoMuscular: "Gemelos", equipo: "Barra" },
  { id: "e93", nombre: "Salto de Gemelos", grupoMuscular: "Gemelos", equipo: "Bodyweight" },
  { id: "e94", nombre: "Plancha Lateral", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
  { id: "e95", nombre: "Elevación de Rodillas en Barra", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
  { id: "e96", nombre: "Rueda Abdominal", grupoMuscular: "Abdomen", equipo: "Otro" },
  { id: "e97", nombre: "Crunch en Polea", grupoMuscular: "Abdomen", equipo: "Cable" },
  { id: "e98", nombre: "Russian Twist", grupoMuscular: "Abdomen", equipo: "Mancuerna" },
  { id: "e99", nombre: "Elevación de Piernas Colgado", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
  { id: "e100", nombre: "Mountain Climbers", grupoMuscular: "Abdomen", equipo: "Bodyweight" },
];

const GRUPOS_CANONICOS: Record<string, string> = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Biceps",
  triceps: "Tríceps",
  cuadriceps: "Cuádriceps",
  isquiotibiales: "Isquiotibiales",
  isquios: "Isquiotibiales",
  gemelos: "Gemelos",
  abdomen: "Abdomen",
  gluteos: "Glúteos",
  cardio: "Cardio",
  antebrazos: "Antebrazos",
};

function canonGrupo(g: string): string {
  const k = String(g).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();
  return GRUPOS_CANONICOS[k] ?? g;
}

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
        const { data: cprof } = await supabase
          .from("profiles")
          .select("created_at,email")
          .eq("id", coachId)
          .maybeSingle();
        const creadoMs = cprof?.created_at ? new Date(cprof.created_at).getTime() : 0;
        const BIBLIOTECA_DESDE = new Date("2026-10-13T00:00:00.000Z").getTime();
        const esCuentaPreview = cprof?.email === "faustinofiordalisi@gmail.com";
        const customEx2 = (await getCoachExercises(coachId)).map((e: any) => ({ ...e, grupoMuscular: canonGrupo(e.grupoMuscular) }));
        const normBase = (x: any) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").replace(/[^\w\s-]/g, "").trim();
        if (customEx2.length > 0) {
          set((state) => {
            const idsActuales = new Set(state.ejercicios.map((e) => e.id));
            const nombresActuales = new Set(state.ejercicios.map((e) => normBase(e.nombre)));
            const faltantes: any[] = [];
            for (const e of customEx2) {
              const k = normBase(e.nombre);
              if (idsActuales.has(e.id) || nombresActuales.has(k)) continue;
              idsActuales.add(e.id);
              nombresActuales.add(k);
              faltantes.push(e);
            }
            return faltantes.length > 0 ? { ejercicios: [...state.ejercicios, ...faltantes] as any } : {};
          });
        }
        if (creadoMs >= BIBLIOTECA_DESDE || esCuentaPreview) {
          const norm = (x: any) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").replace(/[^\w\s-]/g, "").trim();
          const existing = new Set([
            ...customEx2.map((x: any) => norm(x.nombre)),
            ...EJERCICIOS_GLOBALES.map((x) => norm(x.nombre)),
          ]);
          const rawLib = [{"nombre":"Press de banca plano con barra","grupoMuscular":"Pecho"},{"nombre":"Press de banca plano con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Press de banca plano en Smith","grupoMuscular":"Pecho"},{"nombre":"Press de banca plano en máquina convergente","grupoMuscular":"Pecho"},{"nombre":"Press de pecho sentado en máquina","grupoMuscular":"Pecho"},{"nombre":"Press inclinado con barra","grupoMuscular":"Pecho"},{"nombre":"Press inclinado con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Press inclinado en Smith","grupoMuscular":"Pecho"},{"nombre":"Press inclinado en máquina","grupoMuscular":"Pecho"},{"nombre":"Press declinado con barra","grupoMuscular":"Pecho"},{"nombre":"Press declinado con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Press declinado en Smith","grupoMuscular":"Pecho"},{"nombre":"Press declinado en máquina","grupoMuscular":"Pecho"},{"nombre":"Press con agarre cerrado para pecho","grupoMuscular":"Pecho"},{"nombre":"Press con mancuernas con agarre neutro","grupoMuscular":"Pecho"},{"nombre":"Press con mancuernas alternado","grupoMuscular":"Pecho"},{"nombre":"Press unilateral en máquina","grupoMuscular":"Pecho"},{"nombre":"Press en máquina Hammer","grupoMuscular":"Pecho"},{"nombre":"Press en multipower con banco inclinado","grupoMuscular":"Pecho"},{"nombre":"Press en poleas de pie","grupoMuscular":"Pecho"},{"nombre":"Press de pecho con bandas elásticas","grupoMuscular":"Pecho"},{"nombre":"Aperturas planas con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Aperturas inclinadas con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Aperturas declinadas con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Aperturas en peck deck","grupoMuscular":"Pecho"},{"nombre":"Aperturas en máquina sentado","grupoMuscular":"Pecho"},{"nombre":"Cruce de poleas alto a bajo","grupoMuscular":"Pecho"},{"nombre":"Cruce de poleas bajo a alto","grupoMuscular":"Pecho"},{"nombre":"Cruce de poleas a la altura del pecho","grupoMuscular":"Pecho"},{"nombre":"Cruce unilateral de polea","grupoMuscular":"Pecho"},{"nombre":"Cruce de poleas con paso al frente","grupoMuscular":"Pecho"},{"nombre":"Cruce de poleas arrodillado","grupoMuscular":"Pecho"},{"nombre":"Pullover con mancuerna","grupoMuscular":"Pecho"},{"nombre":"Pullover en polea alta","grupoMuscular":"Pecho"},{"nombre":"Pullover en máquina","grupoMuscular":"Pecho"},{"nombre":"Fondos en paralelas inclinando el torso","grupoMuscular":"Pecho"},{"nombre":"Flexiones de brazos","grupoMuscular":"Pecho"},{"nombre":"Flexiones con manos elevadas","grupoMuscular":"Pecho"},{"nombre":"Flexiones con pies elevados","grupoMuscular":"Pecho"},{"nombre":"Flexiones con lastre","grupoMuscular":"Pecho"},{"nombre":"Flexiones con agarre amplio","grupoMuscular":"Pecho"},{"nombre":"Flexiones con agarre cerrado","grupoMuscular":"Pecho"},{"nombre":"Flexiones con manos juntas","grupoMuscular":"Pecho"},{"nombre":"Flexiones explosivas","grupoMuscular":"Pecho"},{"nombre":"Flexiones en anillas","grupoMuscular":"Pecho"},{"nombre":"Flexiones con bandas elásticas","grupoMuscular":"Pecho"},{"nombre":"Press squeeze con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Press de pecho en el suelo con mancuernas","grupoMuscular":"Pecho"},{"nombre":"Press unilateral en el suelo","grupoMuscular":"Pecho"},{"nombre":"Aperturas en poleas acostado","grupoMuscular":"Pecho"},{"nombre":"Press inclinado con agarre neutro","grupoMuscular":"Pecho"},{"nombre":"Press plano con pausa","grupoMuscular":"Pecho"},{"nombre":"Press con mancuernas desde posición neutra","grupoMuscular":"Pecho"},{"nombre":"Flexiones con apoyo sobre mancuernas","grupoMuscular":"Pecho"},{"nombre":"Press de pecho en máquina unilateral","grupoMuscular":"Pecho"},{"nombre":"Dominadas pronas","grupoMuscular":"Espalda"},{"nombre":"Dominadas supinas","grupoMuscular":"Espalda"},{"nombre":"Dominadas con agarre neutro","grupoMuscular":"Espalda"},{"nombre":"Dominadas asistidas","grupoMuscular":"Espalda"},{"nombre":"Dominadas con lastre","grupoMuscular":"Espalda"},{"nombre":"Dominadas en máquina","grupoMuscular":"Espalda"},{"nombre":"Jalón al pecho con barra larga","grupoMuscular":"Espalda"},{"nombre":"Jalón al pecho con agarre amplio","grupoMuscular":"Espalda"},{"nombre":"Jalón al pecho con agarre cerrado","grupoMuscular":"Espalda"},{"nombre":"Jalón al pecho con agarre neutro","grupoMuscular":"Espalda"},{"nombre":"Jalón supino al pecho","grupoMuscular":"Espalda"},{"nombre":"Jalón unilateral en polea","grupoMuscular":"Espalda"},{"nombre":"Jalón con brazos rectos","grupoMuscular":"Espalda"},{"nombre":"Jalón tras nuca","grupoMuscular":"Espalda"},{"nombre":"Jalón con cuerda","grupoMuscular":"Espalda"},{"nombre":"Jalón con agarre paralelo","grupoMuscular":"Espalda"},{"nombre":"Remo con barra inclinado","grupoMuscular":"Espalda"},{"nombre":"Remo Pendlay","grupoMuscular":"Espalda"},{"nombre":"Remo con barra T","grupoMuscular":"Espalda"},{"nombre":"Remo en máquina T","grupoMuscular":"Espalda"},{"nombre":"Remo con mancuerna a una mano","grupoMuscular":"Espalda"},{"nombre":"Remo con dos mancuernas","grupoMuscular":"Espalda"},{"nombre":"Remo con pecho apoyado","grupoMuscular":"Espalda"},{"nombre":"Remo en banco inclinado","grupoMuscular":"Espalda"},{"nombre":"Remo sentado en polea baja","grupoMuscular":"Espalda"},{"nombre":"Remo en polea con barra V","grupoMuscular":"Espalda"},{"nombre":"Remo en polea con barra recta","grupoMuscular":"Espalda"},{"nombre":"Remo en polea con cuerda","grupoMuscular":"Espalda"},{"nombre":"Remo unilateral en polea","grupoMuscular":"Espalda"},{"nombre":"Remo alto en polea","grupoMuscular":"Espalda"},{"nombre":"Remo en máquina convergente","grupoMuscular":"Espalda"},{"nombre":"Remo en máquina unilateral","grupoMuscular":"Espalda"},{"nombre":"Remo Hammer Strength","grupoMuscular":"Espalda"},{"nombre":"Remo invertido en barra","grupoMuscular":"Espalda"},{"nombre":"Remo invertido en Smith","grupoMuscular":"Espalda"},{"nombre":"Remo en anillas","grupoMuscular":"Espalda"},{"nombre":"Remo con banda elástica","grupoMuscular":"Espalda"},{"nombre":"Peso muerto convencional","grupoMuscular":"Espalda"},{"nombre":"Peso muerto sumo","grupoMuscular":"Espalda"},{"nombre":"Peso muerto con trap bar","grupoMuscular":"Espalda"},{"nombre":"Peso muerto desde bloques","grupoMuscular":"Espalda"},{"nombre":"Peso muerto con déficit","grupoMuscular":"Espalda"},{"nombre":"Peso muerto rumano","grupoMuscular":"Espalda"},{"nombre":"Buenos días con barra","grupoMuscular":"Espalda"},{"nombre":"Hiperextensiones lumbares","grupoMuscular":"Espalda"},{"nombre":"Hiperextensiones a 45 grados","grupoMuscular":"Espalda"},{"nombre":"Extensión lumbar en máquina","grupoMuscular":"Espalda"},{"nombre":"Pull-over en polea alta","grupoMuscular":"Espalda"},{"nombre":"Pull-over con mancuerna","grupoMuscular":"Espalda"},{"nombre":"Pull-over en máquina","grupoMuscular":"Espalda"},{"nombre":"Face pull","grupoMuscular":"Espalda"},{"nombre":"Encogimientos con barra","grupoMuscular":"Espalda"},{"nombre":"Encogimientos con mancuernas","grupoMuscular":"Espalda"},{"nombre":"Encogimientos en Smith","grupoMuscular":"Espalda"},{"nombre":"Encogimientos en máquina","grupoMuscular":"Espalda"},{"nombre":"Remo Meadows","grupoMuscular":"Espalda"},{"nombre":"Remo en landmine unilateral","grupoMuscular":"Espalda"},{"nombre":"Jalón unilateral arrodillado","grupoMuscular":"Espalda"},{"nombre":"Remo con barra supino","grupoMuscular":"Espalda"},{"nombre":"Remo con barra agarre amplio","grupoMuscular":"Espalda"},{"nombre":"Remo con mancuernas pecho apoyado","grupoMuscular":"Espalda"},{"nombre":"Remo sentado con agarre ancho","grupoMuscular":"Espalda"},{"nombre":"Remo sentado con agarre neutro","grupoMuscular":"Espalda"},{"nombre":"Remo sentado con agarre supino","grupoMuscular":"Espalda"},{"nombre":"Dominadas escapulares","grupoMuscular":"Espalda"},{"nombre":"Curl con barra recta","grupoMuscular":"Biceps"},{"nombre":"Curl con barra EZ","grupoMuscular":"Biceps"},{"nombre":"Curl con mancuernas simultáneo","grupoMuscular":"Biceps"},{"nombre":"Curl alternado con mancuernas","grupoMuscular":"Biceps"},{"nombre":"Curl alternado con supinación","grupoMuscular":"Biceps"},{"nombre":"Curl concentrado","grupoMuscular":"Biceps"},{"nombre":"Curl inclinado con mancuernas","grupoMuscular":"Biceps"},{"nombre":"Curl martillo","grupoMuscular":"Biceps"},{"nombre":"Curl martillo cruzado","grupoMuscular":"Biceps"},{"nombre":"Curl martillo sentado","grupoMuscular":"Biceps"},{"nombre":"Curl Scott con barra EZ","grupoMuscular":"Biceps"},{"nombre":"Curl Scott con barra recta","grupoMuscular":"Biceps"},{"nombre":"Curl Scott con mancuernas","grupoMuscular":"Biceps"},{"nombre":"Curl Scott en máquina","grupoMuscular":"Biceps"},{"nombre":"Curl araña con barra EZ","grupoMuscular":"Biceps"},{"nombre":"Curl araña con mancuernas","grupoMuscular":"Biceps"},{"nombre":"Curl en polea baja con barra","grupoMuscular":"Biceps"},{"nombre":"Curl en polea baja con cuerda","grupoMuscular":"Biceps"},{"nombre":"Curl unilateral en polea","grupoMuscular":"Biceps"},{"nombre":"Curl en polea alta doble","grupoMuscular":"Biceps"},{"nombre":"Curl bayesian en polea","grupoMuscular":"Biceps"},{"nombre":"Curl predicador unilateral","grupoMuscular":"Biceps"},{"nombre":"Curl con agarre inverso","grupoMuscular":"Biceps"},{"nombre":"Curl Zottman","grupoMuscular":"Biceps"},{"nombre":"Curl de muñeca supinado","grupoMuscular":"Biceps"},{"nombre":"Curl de bíceps en máquina","grupoMuscular":"Biceps"},{"nombre":"Curl con mancuernas sentado","grupoMuscular":"Biceps"},{"nombre":"Curl con barra agarre amplio","grupoMuscular":"Biceps"},{"nombre":"Curl con barra agarre cerrado","grupoMuscular":"Biceps"},{"nombre":"Curl con banda elástica","grupoMuscular":"Biceps"},{"nombre":"Curl en banco inclinado alternado","grupoMuscular":"Biceps"},{"nombre":"Curl en banco predicador","grupoMuscular":"Biceps"},{"nombre":"Curl con polea detrás del cuerpo","grupoMuscular":"Biceps"},{"nombre":"Curl de bíceps arrodillado en polea","grupoMuscular":"Biceps"},{"nombre":"Curl isométrico con mancuernas","grupoMuscular":"Biceps"},{"nombre":"Curl 21 con barra EZ","grupoMuscular":"Biceps"},{"nombre":"Curl con pausa","grupoMuscular":"Biceps"},{"nombre":"Curl martillo con cuerda","grupoMuscular":"Biceps"},{"nombre":"Curl con barra en polea baja","grupoMuscular":"Biceps"},{"nombre":"Curl en máquina unilateral","grupoMuscular":"Biceps"},{"nombre":"Curl con mancuerna apoyado en muslo","grupoMuscular":"Biceps"},{"nombre":"Jalón de tríceps con cuerda","grupoMuscular":"Triceps"},{"nombre":"Jalón de tríceps con barra recta","grupoMuscular":"Triceps"},{"nombre":"Jalón de tríceps con barra V","grupoMuscular":"Triceps"},{"nombre":"Jalón de tríceps unilateral","grupoMuscular":"Triceps"},{"nombre":"Extensión de tríceps por encima de la cabeza con cuerda","grupoMuscular":"Triceps"},{"nombre":"Extensión sobre la cabeza con mancuerna","grupoMuscular":"Triceps"},{"nombre":"Extensión unilateral sobre la cabeza","grupoMuscular":"Triceps"},{"nombre":"Press francés con barra EZ","grupoMuscular":"Triceps"},{"nombre":"Press francés con mancuernas","grupoMuscular":"Triceps"},{"nombre":"Press francés inclinado","grupoMuscular":"Triceps"},{"nombre":"Press francés sentado","grupoMuscular":"Triceps"},{"nombre":"Rompecráneos con barra EZ","grupoMuscular":"Triceps"},{"nombre":"Rompecráneos con mancuernas","grupoMuscular":"Triceps"},{"nombre":"Extensión tumbado con mancuernas","grupoMuscular":"Triceps"},{"nombre":"Extensión tumbado con barra","grupoMuscular":"Triceps"},{"nombre":"Extensión de tríceps en polea alta","grupoMuscular":"Triceps"},{"nombre":"Extensión inversa de tríceps en polea","grupoMuscular":"Triceps"},{"nombre":"Patada de tríceps con mancuerna","grupoMuscular":"Triceps"},{"nombre":"Patada de tríceps en polea","grupoMuscular":"Triceps"},{"nombre":"Fondos en paralelas","grupoMuscular":"Triceps"},{"nombre":"Fondos en banco","grupoMuscular":"Triceps"},{"nombre":"Press banca con agarre cerrado","grupoMuscular":"Triceps"},{"nombre":"Press cerrado en Smith","grupoMuscular":"Triceps"},{"nombre":"Press JM con barra","grupoMuscular":"Triceps"},{"nombre":"Extensión unilateral en polea con agarre inverso","grupoMuscular":"Triceps"},{"nombre":"Extensión de tríceps con banda","grupoMuscular":"Triceps"},{"nombre":"Extensión de tríceps arrodillado en polea","grupoMuscular":"Triceps"},{"nombre":"Extensión cruzada de tríceps en polea","grupoMuscular":"Triceps"},{"nombre":"Extensión de tríceps sentado en máquina","grupoMuscular":"Triceps"},{"nombre":"Fondos asistidos en máquina","grupoMuscular":"Triceps"},{"nombre":"Extensión por encima de la cabeza con barra EZ","grupoMuscular":"Triceps"},{"nombre":"Press de tríceps en máquina","grupoMuscular":"Triceps"},{"nombre":"Extensión de tríceps con cuerda a una mano","grupoMuscular":"Triceps"},{"nombre":"Extensión con barra EZ en polea","grupoMuscular":"Triceps"},{"nombre":"Sentadilla trasera con barra","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla frontal con barra","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla en Smith","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla goblet","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla con mancuernas","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla hack","grupoMuscular":"Cuadriceps"},{"nombre":"Hack squat en máquina","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa a 45 grados","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa horizontal","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa vertical","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa unilateral","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa con pies bajos","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla en multipower con talones elevados","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla sissy","grupoMuscular":"Cuadriceps"},{"nombre":"Extensión de cuádriceps en máquina","grupoMuscular":"Cuadriceps"},{"nombre":"Extensión unilateral de cuádriceps","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla búlgara","grupoMuscular":"Cuadriceps"},{"nombre":"Zancadas caminando con mancuernas","grupoMuscular":"Cuadriceps"},{"nombre":"Zancadas hacia atrás","grupoMuscular":"Cuadriceps"},{"nombre":"Zancadas hacia delante","grupoMuscular":"Cuadriceps"},{"nombre":"Zancadas en Smith","grupoMuscular":"Cuadriceps"},{"nombre":"Zancadas en multipower","grupoMuscular":"Cuadriceps"},{"nombre":"Step-up al cajón","grupoMuscular":"Cuadriceps"},{"nombre":"Step-up con mancuernas","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla split","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla split en Smith","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla en landmine","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla con cinturón","grupoMuscular":"Cuadriceps"},{"nombre":"Belt squat","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla con pausa","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla con tempo","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla con banda elástica","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla sumo con mancuerna","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla en máquina pendular","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla en máquina V-squat","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa con pies juntos","grupoMuscular":"Cuadriceps"},{"nombre":"Prensa con rango parcial controlado","grupoMuscular":"Cuadriceps"},{"nombre":"Extensión de rodilla con banda","grupoMuscular":"Cuadriceps"},{"nombre":"Wall sit","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla española con banda","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla ciclista","grupoMuscular":"Cuadriceps"},{"nombre":"Zancada lateral","grupoMuscular":"Cuadriceps"},{"nombre":"Zancada estática con mancuernas","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla frontal con dos mancuernas","grupoMuscular":"Cuadriceps"},{"nombre":"Sentadilla con barra safety","grupoMuscular":"Cuadriceps"},{"nombre":"Peso muerto rumano con barra","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto rumano con mancuernas","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto rumano unilateral","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto piernas rígidas","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto piernas rígidas con mancuernas","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral acostado","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral sentado","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral de pie","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral unilateral","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral en máquina sentado unilateral","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral con fitball","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral deslizante","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl nórdico de isquios","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl nórdico asistido","grupoMuscular":"Isquiotibiales"},{"nombre":"Buenos días con banda","grupoMuscular":"Isquiotibiales"},{"nombre":"Hiperextensión con énfasis en isquios","grupoMuscular":"Isquiotibiales"},{"nombre":"Pull-through en polea","grupoMuscular":"Isquiotibiales"},{"nombre":"Pull-through con banda","grupoMuscular":"Isquiotibiales"},{"nombre":"Puente de isquios con talones elevados","grupoMuscular":"Isquiotibiales"},{"nombre":"Puente de glúteos con talones alejados","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral con toalla","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral en anillas","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral con sliders","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral con banda elástica","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto rumano en Smith","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto rumano desde déficit","grupoMuscular":"Isquiotibiales"},{"nombre":"Extensión de cadera en banco 45 grados","grupoMuscular":"Isquiotibiales"},{"nombre":"Hip hinge con banda","grupoMuscular":"Isquiotibiales"},{"nombre":"Curl femoral en máquina unilateral de pie","grupoMuscular":"Isquiotibiales"},{"nombre":"Nordic curl excéntrico","grupoMuscular":"Isquiotibiales"},{"nombre":"Peso muerto con kettlebell","grupoMuscular":"Isquiotibiales"},{"nombre":"Elevación de gemelos de pie","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos sentado","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en prensa","grupoMuscular":"Gemelos"},{"nombre":"Elevación unilateral de gemelos de pie","grupoMuscular":"Gemelos"},{"nombre":"Elevación unilateral de gemelos sentado","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en Smith","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos con mancuernas","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos con barra","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en máquina hack","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en escalón","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos con rodillas flexionadas","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos con rodillas extendidas","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en prensa horizontal","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en máquina de pie","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos en máquina sentado unilateral","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos con peso corporal","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos con pausa arriba","grupoMuscular":"Gemelos"},{"nombre":"Elevación de gemelos excéntrica","grupoMuscular":"Gemelos"},{"nombre":"Saltos de cuerda","grupoMuscular":"Gemelos"},{"nombre":"Caminata de puntas","grupoMuscular":"Gemelos"},{"nombre":"Crunch abdominal en suelo","grupoMuscular":"Abdomen"},{"nombre":"Crunch abdominal en máquina","grupoMuscular":"Abdomen"},{"nombre":"Crunch en polea arrodillado","grupoMuscular":"Abdomen"},{"nombre":"Crunch con disco","grupoMuscular":"Abdomen"},{"nombre":"Crunch con pelota suiza","grupoMuscular":"Abdomen"},{"nombre":"Crunch inverso","grupoMuscular":"Abdomen"},{"nombre":"Elevación de rodillas colgado","grupoMuscular":"Abdomen"},{"nombre":"Elevación de piernas colgado","grupoMuscular":"Abdomen"},{"nombre":"Elevación de rodillas en silla romana","grupoMuscular":"Abdomen"},{"nombre":"Elevación de piernas en banco","grupoMuscular":"Abdomen"},{"nombre":"Elevación de piernas en suelo","grupoMuscular":"Abdomen"},{"nombre":"Plancha frontal","grupoMuscular":"Abdomen"},{"nombre":"Plancha lateral","grupoMuscular":"Abdomen"},{"nombre":"Plancha con apoyo de rodillas","grupoMuscular":"Abdomen"},{"nombre":"Plancha con toque de hombros","grupoMuscular":"Abdomen"},{"nombre":"Plancha con elevación alternada de piernas","grupoMuscular":"Abdomen"},{"nombre":"Rueda abdominal","grupoMuscular":"Abdomen"},{"nombre":"Ab wheel desde rodillas","grupoMuscular":"Abdomen"},{"nombre":"Ab wheel de pie","grupoMuscular":"Abdomen"},{"nombre":"Dead bug","grupoMuscular":"Abdomen"},{"nombre":"Bird dog","grupoMuscular":"Abdomen"},{"nombre":"Hollow hold","grupoMuscular":"Abdomen"},{"nombre":"V-ups","grupoMuscular":"Abdomen"},{"nombre":"Bicicleta abdominal","grupoMuscular":"Abdomen"},{"nombre":"Russian twist","grupoMuscular":"Abdomen"},{"nombre":"Giros de torso en polea","grupoMuscular":"Abdomen"},{"nombre":"Pallof press","grupoMuscular":"Abdomen"},{"nombre":"Woodchopper alto a bajo","grupoMuscular":"Abdomen"},{"nombre":"Woodchopper bajo a alto","grupoMuscular":"Abdomen"},{"nombre":"Leñador en polea unilateral","grupoMuscular":"Abdomen"},{"nombre":"Flexión lateral con mancuerna","grupoMuscular":"Abdomen"},{"nombre":"Flexión lateral en polea","grupoMuscular":"Abdomen"},{"nombre":"Sit-up","grupoMuscular":"Abdomen"},{"nombre":"Sit-up declinado","grupoMuscular":"Abdomen"},{"nombre":"Sit-up con disco","grupoMuscular":"Abdomen"},{"nombre":"Mountain climbers","grupoMuscular":"Abdomen"},{"nombre":"Flutter kicks","grupoMuscular":"Abdomen"},{"nombre":"Scissor kicks","grupoMuscular":"Abdomen"},{"nombre":"Reverse crunch en banco declinado","grupoMuscular":"Abdomen"},{"nombre":"Dragon flag","grupoMuscular":"Abdomen"},{"nombre":"L-sit","grupoMuscular":"Abdomen"},{"nombre":"Plancha con desplazamiento","grupoMuscular":"Abdomen"},{"nombre":"Plancha con rueda","grupoMuscular":"Abdomen"},{"nombre":"Marcha de granjero unilateral","grupoMuscular":"Abdomen"},{"nombre":"Suitcase carry","grupoMuscular":"Abdomen"},{"nombre":"Paseo del granjero","grupoMuscular":"Abdomen"},{"nombre":"Respiración abdominal bracing","grupoMuscular":"Abdomen"},{"nombre":"Crunch con piernas elevadas","grupoMuscular":"Abdomen"},{"nombre":"Elevación de pelvis en banco","grupoMuscular":"Abdomen"},{"nombre":"Plancha Copenhagen","grupoMuscular":"Abdomen"},{"nombre":"Caminata en cinta","grupoMuscular":"Cardio"},{"nombre":"Caminata en cinta con inclinación","grupoMuscular":"Cardio"},{"nombre":"Trote en cinta","grupoMuscular":"Cardio"},{"nombre":"Carrera continua en cinta","grupoMuscular":"Cardio"},{"nombre":"Intervalos en cinta","grupoMuscular":"Cardio"},{"nombre":"Sprints en cinta","grupoMuscular":"Cardio"},{"nombre":"Bicicleta fija","grupoMuscular":"Cardio"},{"nombre":"Bicicleta reclinada","grupoMuscular":"Cardio"},{"nombre":"Bicicleta de spinning","grupoMuscular":"Cardio"},{"nombre":"Intervalos en bicicleta","grupoMuscular":"Cardio"},{"nombre":"Elíptico","grupoMuscular":"Cardio"},{"nombre":"Escaladora","grupoMuscular":"Cardio"},{"nombre":"Máquina de remo","grupoMuscular":"Cardio"},{"nombre":"Air bike","grupoMuscular":"Cardio"},{"nombre":"Assault bike por intervalos","grupoMuscular":"Cardio"},{"nombre":"Saltar la cuerda","grupoMuscular":"Cardio"},{"nombre":"Cuerda de velocidad","grupoMuscular":"Cardio"},{"nombre":"Remo ergómetro por intervalos","grupoMuscular":"Cardio"},{"nombre":"Subida de escaleras","grupoMuscular":"Cardio"},{"nombre":"Caminata al aire libre","grupoMuscular":"Cardio"},{"nombre":"Trote al aire libre","grupoMuscular":"Cardio"},{"nombre":"Carrera de intervalos al aire libre","grupoMuscular":"Cardio"},{"nombre":"Sprints en cuesta","grupoMuscular":"Cardio"},{"nombre":"Ciclismo al aire libre","grupoMuscular":"Cardio"},{"nombre":"Natación continua","grupoMuscular":"Cardio"},{"nombre":"Natación por intervalos","grupoMuscular":"Cardio"},{"nombre":"Marcha rápida","grupoMuscular":"Cardio"},{"nombre":"Marcha en el lugar","grupoMuscular":"Cardio"},{"nombre":"Jumping jacks","grupoMuscular":"Cardio"},{"nombre":"Burpees","grupoMuscular":"Cardio"},{"nombre":"Burpees sin salto","grupoMuscular":"Cardio"},{"nombre":"Skaters laterales","grupoMuscular":"Cardio"},{"nombre":"Saltos de tijera","grupoMuscular":"Cardio"},{"nombre":"Step-ups continuos","grupoMuscular":"Cardio"},{"nombre":"Circuito aeróbico de bajo impacto","grupoMuscular":"Cardio"},{"nombre":"Shadow boxing","grupoMuscular":"Cardio"},{"nombre":"Boxeo con saco","grupoMuscular":"Cardio"},{"nombre":"Golpes al aire por intervalos","grupoMuscular":"Cardio"},{"nombre":"Trineo de empuje","grupoMuscular":"Cardio"},{"nombre":"Trineo de arrastre","grupoMuscular":"Cardio"},{"nombre":"Caminata con chaleco lastrado","grupoMuscular":"Cardio"},{"nombre":"Battle ropes","grupoMuscular":"Cardio"},{"nombre":"Circuito de remo y bicicleta","grupoMuscular":"Cardio"},{"nombre":"Caminata en cinta lateral","grupoMuscular":"Cardio"},{"nombre":"Caminata hacia atrás en cinta","grupoMuscular":"Cardio"},{"nombre":"Hip thrust con barra","grupoMuscular":"Gluteos"},{"nombre":"Hip thrust en máquina","grupoMuscular":"Gluteos"},{"nombre":"Hip thrust con mancuerna","grupoMuscular":"Gluteos"},{"nombre":"Hip thrust unilateral","grupoMuscular":"Gluteos"},{"nombre":"Puente de glúteos con barra","grupoMuscular":"Gluteos"},{"nombre":"Puente de glúteos con peso corporal","grupoMuscular":"Gluteos"},{"nombre":"Patada de glúteo en polea","grupoMuscular":"Gluteos"},{"nombre":"Patada de glúteo en máquina","grupoMuscular":"Gluteos"},{"nombre":"Patada de glúteo con banda","grupoMuscular":"Gluteos"},{"nombre":"Abducción de cadera en máquina","grupoMuscular":"Gluteos"},{"nombre":"Abducción de cadera en polea","grupoMuscular":"Gluteos"},{"nombre":"Abducción de cadera con banda","grupoMuscular":"Gluteos"},{"nombre":"Abducción lateral acostado","grupoMuscular":"Gluteos"},{"nombre":"Caminata lateral con banda","grupoMuscular":"Gluteos"},{"nombre":"Monster walks con banda","grupoMuscular":"Gluteos"},{"nombre":"Sentadilla sumo","grupoMuscular":"Gluteos"},{"nombre":"Sentadilla búlgara con inclinación del torso","grupoMuscular":"Gluteos"},{"nombre":"Zancadas hacia atrás largas","grupoMuscular":"Gluteos"},{"nombre":"Step-up alto","grupoMuscular":"Gluteos"},{"nombre":"Prensa con pies altos","grupoMuscular":"Gluteos"},{"nombre":"Frog pumps","grupoMuscular":"Gluteos"},{"nombre":"Puente de glúteos con banda","grupoMuscular":"Gluteos"},{"nombre":"Clamshell con banda","grupoMuscular":"Gluteos"},{"nombre":"Hiperextensiones con énfasis en glúteos","grupoMuscular":"Gluteos"},{"nombre":"Extensión de cadera cuadrupedia","grupoMuscular":"Gluteos"},{"nombre":"Fire hydrants","grupoMuscular":"Gluteos"},{"nombre":"Kickback en polea baja","grupoMuscular":"Gluteos"},{"nombre":"Hip thrust con pausa","grupoMuscular":"Gluteos"},{"nombre":"Hip thrust en Smith","grupoMuscular":"Gluteos"},{"nombre":"Sentadilla en belt squat","grupoMuscular":"Gluteos"},{"nombre":"Zancada caminando larga","grupoMuscular":"Gluteos"},{"nombre":"Reverse hyperextension","grupoMuscular":"Gluteos"},{"nombre":"Abducción de cadera sentado con banda","grupoMuscular":"Gluteos"},{"nombre":"Press militar con barra","grupoMuscular":"Hombros"},{"nombre":"Press militar sentado con mancuernas","grupoMuscular":"Hombros"},{"nombre":"Press Arnold","grupoMuscular":"Hombros"},{"nombre":"Press de hombros en máquina","grupoMuscular":"Hombros"},{"nombre":"Press de hombros en Smith","grupoMuscular":"Hombros"},{"nombre":"Press unilateral en polea","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral con mancuernas","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral sentado","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral en polea","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral unilateral en polea","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral en máquina","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral inclinada","grupoMuscular":"Hombros"},{"nombre":"Elevación frontal con mancuernas","grupoMuscular":"Hombros"},{"nombre":"Elevación frontal con barra","grupoMuscular":"Hombros"},{"nombre":"Elevación frontal con disco","grupoMuscular":"Hombros"},{"nombre":"Elevación frontal en polea","grupoMuscular":"Hombros"},{"nombre":"Pájaros con mancuernas","grupoMuscular":"Hombros"},{"nombre":"Pájaros en banco inclinado","grupoMuscular":"Hombros"},{"nombre":"Pájaros en peck deck inverso","grupoMuscular":"Hombros"},{"nombre":"Pájaros en polea","grupoMuscular":"Hombros"},{"nombre":"Face pull con cuerda","grupoMuscular":"Hombros"},{"nombre":"Remo al mentón con barra EZ","grupoMuscular":"Hombros"},{"nombre":"Remo al mentón con polea","grupoMuscular":"Hombros"},{"nombre":"Remo al mentón con mancuernas","grupoMuscular":"Hombros"},{"nombre":"Encogimientos en polea","grupoMuscular":"Hombros"},{"nombre":"Y-raise en banco inclinado","grupoMuscular":"Hombros"},{"nombre":"Y-raise en polea","grupoMuscular":"Hombros"},{"nombre":"Rotación externa con banda","grupoMuscular":"Hombros"},{"nombre":"Rotación externa en polea","grupoMuscular":"Hombros"},{"nombre":"Rotación externa acostado con mancuerna","grupoMuscular":"Hombros"},{"nombre":"Elevación en plano escapular","grupoMuscular":"Hombros"},{"nombre":"Press landmine","grupoMuscular":"Hombros"},{"nombre":"Press landmine unilateral","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral con banda","grupoMuscular":"Hombros"},{"nombre":"Remo alto con cuerda","grupoMuscular":"Hombros"},{"nombre":"Reverse fly en máquina","grupoMuscular":"Hombros"},{"nombre":"Press de hombros con agarre neutro","grupoMuscular":"Hombros"},{"nombre":"Elevación frontal alternada","grupoMuscular":"Hombros"},{"nombre":"Pájaros unilateral en polea","grupoMuscular":"Hombros"},{"nombre":"Encogimiento con trap bar","grupoMuscular":"Hombros"},{"nombre":"Farmer's carry","grupoMuscular":"Hombros"},{"nombre":"Scaption con mancuernas","grupoMuscular":"Hombros"},{"nombre":"Rotación interna en polea","grupoMuscular":"Hombros"},{"nombre":"Elevación lateral parcial controlada","grupoMuscular":"Hombros"},{"nombre":"Press Z sentado en suelo","grupoMuscular":"Hombros"},{"nombre":"Wall slides","grupoMuscular":"Hombros"},{"nombre":"Curl de muñeca con barra supinado","grupoMuscular":"Antebrazos"},{"nombre":"Curl de muñeca con barra pronado","grupoMuscular":"Antebrazos"},{"nombre":"Curl de muñeca con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Extensión de muñeca con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Curl inverso con barra EZ","grupoMuscular":"Antebrazos"},{"nombre":"Curl inverso con barra recta","grupoMuscular":"Antebrazos"},{"nombre":"Curl inverso con mancuernas","grupoMuscular":"Antebrazos"},{"nombre":"Pronación de antebrazo con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Supinación de antebrazo con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Desviación radial con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Desviación cubital con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Agarre estático con discos","grupoMuscular":"Antebrazos"},{"nombre":"Pinza de discos","grupoMuscular":"Antebrazos"},{"nombre":"Colgado de barra","grupoMuscular":"Antebrazos"},{"nombre":"Flexión de dedos con mancuerna","grupoMuscular":"Antebrazos"},{"nombre":"Extensión de dedos con banda","grupoMuscular":"Antebrazos"}];
          const seenSeed = new Set<string>();
          const lib = [
            ...rawLib,
            ...BIBLIOTECA_EXTENDIDA.map(({ nombre, grupoMuscular, equipo }) => ({ nombre, grupoMuscular, equipo })),
          ].map((x: any) => ({ ...x, grupoMuscular: canonGrupo(x.grupoMuscular) })).filter((x: any) => {
            const k = norm(x.nombre);
            if (seenSeed.has(k)) return false;
            seenSeed.add(k);
            return true;
          });
          const toAdd = lib.filter((x: any) => !existing.has(norm(x.nombre)));
          if (toAdd.length > 0) {
            const toAddWithMeta = toAdd.map((x: any, i: number) => ({
              id: `ej_new_${Date.now()}_${i}`,
              nombre: x.nombre,
              grupoMuscular: x.grupoMuscular,
              equipo: x.equipo || "Bodyweight",
            }));
            await saveCoachExercises(coachId, [...customEx2, ...toAddWithMeta] as any);
            const existingIds = new Set(get().ejercicios.map((e) => e.id));
            const nuevos = toAddWithMeta.filter((e: any) => !existingIds.has(e.id));
            if (nuevos.length > 0) {
              set((state) => ({ ejercicios: [...state.ejercicios, ...nuevos] as any }));
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
