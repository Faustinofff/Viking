import { supabase } from "./supabase";
import type { Macros } from "./food-catalog";

// ─── Franjas horarias del día ───────────────────────────────
export const FRANJAS = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "snack", label: "Snack" },
  { id: "cena", label: "Cena" },
] as const;

export type FranjaId = (typeof FRANJAS)[number]["id"];

/** Máximo de análisis con IA permitidos por franja, por día. */
export const MAX_USOS_POR_FRANJA = 3;

/** Cuenta de prueba: única habilitada hasta que exista el gate de suscripción. */
export const ESCANER_TEST_EMAIL = "pruebachequeo430@gmail.com";

/**
 * Fecha (YYYY-MM-DD) en horario de Argentina (UTC-3, sin horario de verano).
 * El día "de hoy" para las comidas corta a medianoche local, no UTC.
 */
export function fechaHoyAR(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split("T")[0];
}

// ─── Modelo de datos (guardado en profiles.avatar_url blob) ──

export interface MealLogItem {
  nombre: string;
  gramos: number;
  macros: Macros;
}

export interface MealLogEntry {
  id: string;
  franja: FranjaId;
  items: MealLogItem[];
  totales: Macros;
  creadoEn: string;
}

/** Entradas registradas por franja para un día. */
export type MealLogDia = Record<string, MealLogEntry[]>;

/** Snapshot guardado de un día (lo genera "Registrar comidas de hoy"). */
export interface MealDayComida {
  franja: string;
  label: string;
  items: MealLogItem[];
  totales: Macros;
}

export interface MealDaySummary {
  fecha: string;
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  comidaCount: number;
  comidas: MealDayComida[];
  registradoEn: string;
}

/** Semana actual (lunes a domingo) con fechas en horario de Argentina. */
export function getSemanaAR(): { key: string; label: string; isToday: boolean }[] {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const hoyKey = fechaHoyAR();
  const hoy = new Date(hoyKey + "T00:00:00Z");
  const offsetToMonday = (hoy.getUTCDay() + 6) % 7;
  const monday = new Date(hoy);
  monday.setUTCDate(hoy.getUTCDate() - offsetToMonday);
  const dias: { key: string; label: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const key = d.toISOString().split("T")[0];
    dias.push({ key, label: labels[i], isToday: key === hoyKey });
  }
  return dias;
}


// ─── Blob helpers (mismo patrón que src/lib/data.ts) ────────

async function readBlob(userId: string): Promise<{ data: Record<string, any>; originalUrl: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  let data: Record<string, any> = {};
  let originalUrl = "";
  if (profile?.avatar_url) {
    try {
      data = JSON.parse(profile.avatar_url);
      if (typeof data !== "object" || Array.isArray(data)) data = {};
      originalUrl = data._url ?? "";
    } catch {
      originalUrl = profile.avatar_url;
    }
  }
  return { data, originalUrl };
}

async function saveBlob(userId: string, blob: Record<string, any>, originalUrl: string) {
  if (originalUrl) blob._url = originalUrl;
  await supabase.from("profiles").update({ avatar_url: JSON.stringify(blob) }).eq("id", userId);
}

// ─── Meal log ───────────────────────────────────────────────

export async function getMealLog(userId: string, date: string): Promise<MealLogDia> {
  if (!userId) return {};
  const { data } = await readBlob(userId);
  const dia = data.mealLog?.[date];
  return dia && typeof dia === "object" ? dia : {};
}

export async function saveMealLogEntry(
  userId: string,
  date: string,
  entry: MealLogEntry
): Promise<MealLogDia> {
  const { data, originalUrl } = await readBlob(userId);
  const mealLog = data.mealLog ?? {};
  const dia: MealLogDia = mealLog[date] ?? {};
  dia[entry.franja] = [...(dia[entry.franja] ?? []), entry];
  mealLog[date] = dia;
  data.mealLog = mealLog;
  await saveBlob(userId, data, originalUrl);
  return dia;
}

export async function removeMealLogEntry(
  userId: string,
  date: string,
  franja: string,
  entryId: string
): Promise<MealLogDia> {
  const { data, originalUrl } = await readBlob(userId);
  const mealLog = data.mealLog ?? {};
  const dia: MealLogDia = mealLog[date] ?? {};
  dia[franja] = (dia[franja] ?? []).filter((e) => e.id !== entryId);
  mealLog[date] = dia;
  data.mealLog = mealLog;
  await saveBlob(userId, data, originalUrl);
  return dia;
}

// ─── Snapshots diarios (registros guardados) ────────────────

export async function getMealDays(userId: string): Promise<Record<string, MealDaySummary>> {
  if (!userId) return {};
  const { data } = await readBlob(userId);
  const days = data.mealDays;
  return days && typeof days === "object" ? days : {};
}

export async function saveMealDay(
  userId: string,
  summary: MealDaySummary
): Promise<Record<string, MealDaySummary>> {
  const { data, originalUrl } = await readBlob(userId);
  const mealDays: Record<string, MealDaySummary> = data.mealDays ?? {};
  mealDays[summary.fecha] = summary;
  data.mealDays = mealDays;
  await saveBlob(userId, data, originalUrl);
  return mealDays;
}

// ─── Usos de IA por franja (los incrementa el servidor) ─────

export async function getScanUses(userId: string, date: string): Promise<Record<string, number>> {
  if (!userId) return {};
  const { data } = await readBlob(userId);
  const dia = data.mealScanUses?.[date];
  return dia && typeof dia === "object" ? dia : {};
}

/** Suma totales de todas las entradas de un día. */
export function sumarTotalesDia(dia: MealLogDia): Macros {
  const total: Macros = { kcal: 0, proteina: 0, carbohidratos: 0, grasas: 0 };
  for (const entries of Object.values(dia)) {
    for (const e of entries) {
      total.kcal += e.totales.kcal;
      total.proteina += e.totales.proteina;
      total.carbohidratos += e.totales.carbohidratos;
      total.grasas += e.totales.grasas;
    }
  }
  total.kcal = Math.round(total.kcal);
  total.proteina = Math.round(total.proteina * 10) / 10;
  total.carbohidratos = Math.round(total.carbohidratos * 10) / 10;
  total.grasas = Math.round(total.grasas * 10) / 10;
  return total;
}
