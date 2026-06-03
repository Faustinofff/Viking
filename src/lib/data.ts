import { supabase } from "./supabase";

const NUTRITION_PREFIX = "NUTRITION: ";

// ─── Profiles ───────────────────────────────────────────────

export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProfile(
  id: string,
  email: string,
  displayName: string,
  role: "coach" | "alumno"
) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      email,
      display_name: displayName,
      role: role === "alumno" ? "student" : role,
      onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

// ─── Week helpers ────────────────────────────────────────────

/** Returns 0-based week index (0-3) based on 7-day periods since the given date, or calendar month if no startDate. */
export function getCurrentWeekIndex(startDate?: string): number {
  if (startDate) {
    const start = new Date(startDate);
    const now = new Date();
    if (isNaN(start.getTime())) {
      console.warn("getCurrentWeekIndex: invalid startDate", startDate);
      const day = now.getDate();
      return Math.min(Math.floor((day - 1) / 7), 3);
    }
    const diffMs = now.getTime() - start.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(diffWeeks, 0), 3);
  }
  const day = new Date().getDate();
  return Math.min(Math.floor((day - 1) / 7), 3);
}

/** Parse weekly indications from the plan's description JSON: {"wi":["text1","text2","text3","text4"]} */
export function parseIndicacionesSemanales(description?: string | null): string[] | undefined {
  if (!description) return undefined;
  try {
    const parsed = JSON.parse(description);
    if (Array.isArray(parsed.wi) && parsed.wi.length > 0) return parsed.wi;
  } catch {}
  return undefined;
}

/** Serialize weekly indications into a JSON string for the plan's description field. */
export function serializeIndicacionesSemanales(indicaciones: string[]): string {
  return JSON.stringify({ wi: indicaciones });
}

/** Returns the week-appropriate value from an exercise's per-week array, or falls back to the scalar. */
export function ejercicioWeekValue<T>(ej: { seriesPorSemana?: T[]; repsPorSemana?: T[]; descansoPorSemana?: T[]; notasPorSemana?: string[] }, field: "series" | "reps" | "descanso" | "notas", scalar: T, weekIndex?: number): T {
  const idx = weekIndex ?? getCurrentWeekIndex();
  if (field === "notas") {
    const arr = ej.notasPorSemana;
    if (arr && arr.length > idx && arr[idx] !== undefined && arr[idx] !== null) return arr[idx] as T;
    return scalar;
  }
  const map: Record<string, T[] | undefined> = {
    series: ej.seriesPorSemana as T[] | undefined,
    reps: ej.repsPorSemana as T[] | undefined,
    descanso: ej.descansoPorSemana as T[] | undefined,
  };
  const arr = map[field];
  if (arr && arr.length > idx && arr[idx] !== undefined && arr[idx] !== null) return arr[idx];
  return scalar;
}

// ─── Coach-Students ─────────────────────────────────────────

export async function findStudentByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function linkStudentToCoach(coachId: string, studentId: string) {
  const { error } = await supabase.from("coach_students").upsert(
    { coach_id: coachId, student_id: studentId, status: "active" },
    { onConflict: "coach_id, student_id" }
  );
  if (error) throw error;
}

export async function getCoachWorkoutPlans(coachId: string) {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(`
      id, name, description, student_id, created_at,
      workout_days(
        id, day_name, week_day, sort_order, notes
      )
    `)
    .eq("coach_id", coachId)
    .not("name", "ilike", `${NUTRITION_PREFIX}%`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCoachNutritionPlans(coachId: string) {
  const { data, error } = await supabase
    .from("workout_plans")
    .select("id, name, description, student_id, created_at")
    .eq("coach_id", coachId)
    .ilike("name", `${NUTRITION_PREFIX}%`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => {
    let dias: any[] = [];
    try { dias = JSON.parse(p.description || "[]"); } catch {}
    return {
      id: p.id,
      coachId,
      nombre: p.name.replace(NUTRITION_PREFIX, ""),
      alumnoId: p.student_id,
      dias,
      activo: true,
      creadoEn: p.created_at,
    };
  });
}

export async function deleteWorkoutPlan(planId: string) {
  const { error } = await supabase.from("workout_plans").delete().eq("id", planId);
  if (error) throw error;
}

export async function getCoachStudents(coachId: string) {
  const { data, error } = await supabase
    .from("coach_students")
    .select("student_id, profiles!coach_students_student_id_fkey(id, email, display_name)")
    .eq("coach_id", coachId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.student_id,
    nombre: r.profiles?.display_name ?? "",
    email: r.profiles?.email ?? "",
    coachId,
  }));
}

export async function getCoachByStudentEmail(studentEmail: string) {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", studentEmail)
    .eq("role", "student")
    .maybeSingle();
  if (profileErr || !profile) return null;

  const { data, error } = await supabase
    .from("coach_students")
    .select("coach_id")
    .eq("student_id", profile.id)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  return data.coach_id;
}

// ─── Workout Plans ──────────────────────────────────────────

export async function createWorkoutPlan(
  coachId: string,
  studentId: string,
  nombre: string,
  descripcion: string | undefined,
  _mes: number,
  _anio: number,
  dias: { id: string; nombre: string; diaSemana: string; ejercicios: { id: string; ejercicioId: string; ejercicioNombre: string; grupoMuscular: string; series: number; reps: number; descansoSegundos: number; notas?: string; videoUrl?: string; seriesPorSemana?: number[]; repsPorSemana?: number[]; descansoPorSemana?: number[]; notasPorSemana?: string[] }[] }[],
  ejerciciosGlobales: { id: string; nombre: string; grupoMuscular: string }[],
  indicacionesSemanales?: string[]
) {
  const finalDesc = indicacionesSemanales?.length
    ? serializeIndicacionesSemanales(indicacionesSemanales)
    : (descripcion ?? "");
  const { data: plan, error: planErr } = await supabase
    .from("workout_plans")
    .insert({
      name: nombre,
      description: finalDesc,
      coach_id: coachId,
      student_id: studentId,
      is_template: false,
      weeks: 4,
    })
    .select()
    .single();
  if (planErr || !plan) throw planErr ?? new Error("No plan created");

  for (const dia of dias) {
    const dayName = dia.diaSemana === "lunes" ? "monday" :
      dia.diaSemana === "martes" ? "tuesday" :
      dia.diaSemana === "miercoles" ? "wednesday" :
      dia.diaSemana === "jueves" ? "thursday" :
      dia.diaSemana === "viernes" ? "friday" :
      dia.diaSemana === "sabado" ? "saturday" : "sunday";

    const ejerciciosData = dia.ejercicios.map((ej) => {
      const globalEj = ejerciciosGlobales.find((g) => g.id === ej.ejercicioId);
      return {
        ejercicioId: ej.ejercicioId,
        ejercicioNombre: globalEj?.nombre ?? ej.ejercicioNombre,
        grupoMuscular: globalEj?.grupoMuscular ?? ej.grupoMuscular,
        series: ej.series,
        reps: ej.reps,
        descansoSegundos: ej.descansoSegundos,
        notas: ej.notas ?? "",
        videoUrl: ej.videoUrl ?? "",
        seriesPorSemana: ej.seriesPorSemana ?? [ej.series, ej.series, ej.series, ej.series],
        repsPorSemana: ej.repsPorSemana ?? [ej.reps, ej.reps, ej.reps, ej.reps],
        descansoPorSemana: ej.descansoPorSemana ?? [ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos],
        notasPorSemana: ej.notasPorSemana ?? [ej.notas ?? "", "", "", ""],
      };
    });

    const { data: day, error: dayErr } = await supabase
      .from("workout_days")
      .insert({
        plan_id: plan.id,
        day_name: dia.nombre,
        week_day: dayName,
        sort_order: 0,
        notes: JSON.stringify(ejerciciosData),
      })
      .select()
      .single();
    if (dayErr || !day) continue;
  }

  return plan;
}

export async function updateWorkoutPlan(
  planId: string,
  nombre: string,
  descripcion: string | undefined,
  dias: { id: string; nombre: string; diaSemana: string; ejercicios: { id: string; ejercicioId: string; ejercicioNombre: string; grupoMuscular: string; series: number; reps: number; descansoSegundos: number; notas?: string; videoUrl?: string; seriesPorSemana?: number[]; repsPorSemana?: number[]; descansoPorSemana?: number[]; notasPorSemana?: string[] }[] }[],
  ejerciciosGlobales: { id: string; nombre: string; grupoMuscular: string }[],
  indicacionesSemanales?: string[]
) {
  const finalDesc = indicacionesSemanales?.length
    ? serializeIndicacionesSemanales(indicacionesSemanales)
    : (descripcion ?? "");
  const { error: planErr } = await supabase
    .from("workout_plans")
    .update({ name: nombre, description: finalDesc })
    .eq("id", planId);
  if (planErr) throw planErr;

  // Delete existing workout_days
  await supabase.from("workout_days").delete().eq("plan_id", planId);

  // Re-insert days with updated exercises
  for (const dia of dias) {
    const dayName = dia.diaSemana === "lunes" ? "monday" :
      dia.diaSemana === "martes" ? "tuesday" :
      dia.diaSemana === "miercoles" ? "wednesday" :
      dia.diaSemana === "jueves" ? "thursday" :
      dia.diaSemana === "viernes" ? "friday" :
      dia.diaSemana === "sabado" ? "saturday" : "sunday";

    const ejerciciosData = dia.ejercicios.map((ej) => {
      const globalEj = ejerciciosGlobales.find((g) => g.id === ej.ejercicioId);
      return {
        ejercicioId: ej.ejercicioId,
        ejercicioNombre: globalEj?.nombre ?? ej.ejercicioNombre,
        grupoMuscular: globalEj?.grupoMuscular ?? ej.grupoMuscular,
        series: ej.series,
        reps: ej.reps,
        descansoSegundos: ej.descansoSegundos,
        notas: ej.notas ?? "",
        videoUrl: ej.videoUrl ?? "",
        seriesPorSemana: ej.seriesPorSemana ?? [ej.series, ej.series, ej.series, ej.series],
        repsPorSemana: ej.repsPorSemana ?? [ej.reps, ej.reps, ej.reps, ej.reps],
        descansoPorSemana: ej.descansoPorSemana ?? [ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos],
        notasPorSemana: ej.notasPorSemana ?? [ej.notas ?? "", "", "", ""],
      };
    });

    const { error: dayErr } = await supabase
      .from("workout_days")
      .insert({
        plan_id: planId,
        day_name: dia.nombre,
        week_day: dayName,
        sort_order: 0,
        notes: JSON.stringify(ejerciciosData),
      });
    if (dayErr) console.error("Error updating workout_day:", dayErr);
  }
}

export async function getStudentWorkoutPlans(studentId: string) {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(`
      id, name, description, coach_id, created_at,
      workout_days(
        id, day_name, week_day, sort_order, notes
      )
    `)
    .eq("student_id", studentId)
    .not("name", "ilike", `${NUTRITION_PREFIX}%`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((plan: any) => ({
    ...plan,
    workout_days: (plan.workout_days ?? []).map((day: any) => {
      let ejercicios: any[] = [];
      try {
        const parsed = JSON.parse(day.notes || "[]");
        if (Array.isArray(parsed)) {
          ejercicios = parsed.map((ej: any, idx: number) => ({
            id: `syn_${day.id}_${idx}`,
            sort_order: idx,
            notes: JSON.stringify({
              n: ej.ejercicioNombre,
              g: ej.grupoMuscular,
              c: ej.notas ?? "",
              v: ej.videoUrl ?? "",
              sps: ej.seriesPorSemana ?? null,
              rps: ej.repsPorSemana ?? null,
              dps: ej.descansoPorSemana ?? null,
              nps: ej.notasPorSemana ?? null,
            }),
            exercise_id: ej.ejercicioId ?? null,
            exercise_sets: Array.from({ length: ej.series ?? 0 }, (_: any, s: number) => ({
              id: `syn_set_${day.id}_${idx}_${s}`,
              set_number: s + 1,
              reps: ej.reps ?? 0,
              rest_seconds: ej.descansoSegundos ?? 90,
            })),
          }));
        }
      } catch {}
      return { ...day, workout_exercises: ejercicios };
    }),
  }));
}

// ─── Nutrition Plans ───────────────────────────────────────────

export async function saveNutritionPlan(
  coachId: string,
  studentId: string,
  nombre: string,
  dias: { id: string; diaSemana: string; comidas: { id: string; tipo: string; nombre: string; alimentos: string[]; instrucciones?: string }[] }[]
) {
  const { data: plan, error } = await supabase
    .from("workout_plans")
    .insert({
      name: NUTRITION_PREFIX + nombre,
      description: JSON.stringify(dias),
      coach_id: coachId,
      student_id: studentId,
      is_template: false,
      weeks: 1,
    })
    .select()
    .single();
  if (error) throw error;
  return plan;
}

export async function getStudentNutritionPlans(studentId: string) {
  const { data, error } = await supabase
    .from("workout_plans")
    .select("id, name, description, coach_id, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((p: any) => p.name?.startsWith(NUTRITION_PREFIX))
    .map((p: any) => {
      let dias: any[] = [];
      try { dias = JSON.parse(p.description || "[]"); } catch {}
      return {
        id: p.id,
        coachId: p.coach_id ?? "",
        nombre: p.name.replace(NUTRITION_PREFIX, ""),
        alumnoId: studentId,
        dias,
        activo: true,
        creadoEn: p.created_at,
      };
    });
}

// ─── Exercises ──────────────────────────────────────────────

export async function getGlobalExercises() {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, muscle_groups, equipment")
    .eq("is_global", true);
  if (error) throw error;
  return (data ?? []).map((e: any) => ({
    id: e.id,
    nombre: e.name,
    grupoMuscular: e.muscle_groups?.[0] ?? "",
    equipo: e.equipment?.[0] ?? "",
  }));
}

// ─── Profile Blob Helpers ─────────────────────────────────────
// Store/read arbitrary JSON data in profiles.avatar_url

async function readProfileBlob(userId: string): Promise<{ data: Record<string, any>; originalUrl: string }> {
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

async function ensureProfileBlob(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) {
    await supabase.from("profiles").insert({
      id: userId,
      email: `${userId}@placeholder.local`,
      display_name: "Usuario",
      role: "student",
      onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).maybeSingle();
  }
}

async function saveProfileBlob(userId: string, blob: Record<string, any>, originalUrl: string) {
  if (originalUrl) blob._url = originalUrl;
  await supabase.from("profiles").update({ avatar_url: JSON.stringify(blob) }).eq("id", userId);
}

// ─── Water Tracking ────────────────────────────────────────────

export async function saveWaterEntry(studentId: string, vasos: number) {
  const { data, originalUrl } = await readProfileBlob(studentId);
  const water = data.water ?? {};
  const hoy = new Date().toISOString().split("T")[0];
  water[hoy] = (water[hoy] ?? 0) + vasos;
  data.water = water;
  await saveProfileBlob(studentId, data, originalUrl);
}

export async function getWaterToday(studentId: string): Promise<number> {
  const { data } = await readProfileBlob(studentId);
  const hoy = new Date().toISOString().split("T")[0];
  return data.water?.[hoy] ?? 0;
}

export async function removeWaterEntry(studentId: string, vasos: number) {
  const { data, originalUrl } = await readProfileBlob(studentId);
  const water = data.water ?? {};
  const hoy = new Date().toISOString().split("T")[0];
  water[hoy] = Math.max(0, (water[hoy] ?? 0) - vasos);
  data.water = water;
  await saveProfileBlob(studentId, data, originalUrl);
}

// ─── Student Activities ────────────────────────────────────────

export interface StudentActivity {
  id: string;
  tipo: "peso" | "entreno" | "agua" | "logro";
  alumnoId: string;
  alumnoNombre: string;
  mensaje: string;
  timestamp: string;
}

export async function saveStudentActivity(studentId: string, activity: StudentActivity) {
  const { data, originalUrl } = await readProfileBlob(studentId);
  const activities = data.activities ?? [];
  activities.unshift(activity);
  if (activities.length > 100) activities.length = 100;
  data.activities = activities;
  await saveProfileBlob(studentId, data, originalUrl);
}

export async function getStudentsActivities(studentIds: string[], coachId?: string): Promise<StudentActivity[]> {
  if (!studentIds.length) return [];

  // Fetch student activities via the API route (uses service key server-side)
  try {
    const { supabase } = await import("./supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await fetch(`/api/activities?studentIds=${studentIds.join(",")}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { activities } = await res.json();
        if (activities?.length > 0) return activities;
      }
    }
  } catch {}

  // Fallback: read directly from student blobs (may be RLS-limited)
  const all: StudentActivity[] = [];
  const seen = new Set<string>();

  for (const sid of studentIds) {
    try {
      const { data } = await readProfileBlob(sid);
      if (!data.activities) continue;
      for (const act of data.activities) {
        if (!seen.has(act.id)) { seen.add(act.id); all.push(act); }
      }
    } catch {}
  }

  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return all.slice(0, 50);
}

// ─── Workout Completions ──────────────────────────────────────

function getWeekCode(date?: Date): string {
  const d = date ?? new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  const weekNum = Math.ceil((dayOfYear + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function saveWorkoutCompletion(
  userId: string,
  dayId: string,
  sets: { ejercicioId: string; serie: number; completada: boolean; pesoUsado?: number; repsHechas?: number }[]
) {
  const { data, originalUrl } = await readProfileBlob(userId);
  const completions = data.completions ?? {};
  const weekCode = getWeekCode();
  completions[`${dayId}_${weekCode}`] = { completed: true, completedAt: new Date().toISOString(), sets };
  data.completions = completions;
  await saveProfileBlob(userId, data, originalUrl);
}

export async function getCompletionsBatch(
  userId: string
): Promise<Record<string, boolean>> {
  if (!userId) return {};
  const { data } = await readProfileBlob(userId);
  const weekCode = getWeekCode();
  const result: Record<string, boolean> = {};
  const completions = data.completions ?? {};
  for (const [key, val] of Object.entries(completions)) {
    if (key.endsWith(`_${weekCode}`)) {
      const dayId = key.slice(0, -(weekCode.length + 1));
      result[dayId] = (val as any).completed;
    }
  }
  return result;
}

export async function removeStudentFromCoach(coachId: string, studentId: string) {
  const { data: plans } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("student_id", studentId);
  if (plans && plans.length > 0) {
    const ids = plans.map((p: any) => p.id);
    await supabase.from("workout_days").delete().in("plan_id", ids);
    await supabase.from("workout_plans").delete().in("id", ids);
  }
  const { error } = await supabase
    .from("coach_students")
    .delete()
    .eq("coach_id", coachId)
    .eq("student_id", studentId);
  if (error) throw error;
}

// ─── Coach Custom Exercises ──────────────────────────────────────

export async function saveCoachExercises(coachId: string, ejercicios: { id: string; nombre: string; grupoMuscular: string; equipo: string }[]) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  data.customExercises = ejercicios;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function getCoachExercises(coachId: string): Promise<{ id: string; nombre: string; grupoMuscular: string; equipo: string }[]> {
  const { data } = await readProfileBlob(coachId);
  return data.customExercises ?? [];
}

// ─── Student Weight ──────────────────────────────────────────────

export async function saveStudentWeight(studentId: string, peso: number) {
  const { data, originalUrl } = await readProfileBlob(studentId);
  data.weight = peso;
  data.weightDate = new Date().toISOString().split("T")[0];
  await saveProfileBlob(studentId, data, originalUrl);
}

export async function getStudentWeight(studentId: string): Promise<{ peso: number; fecha: string } | null> {
  const { data } = await readProfileBlob(studentId);
  if (data.weight != null) {
    return { peso: data.weight, fecha: data.weightDate ?? "" };
  }
  return null;
}

// ─── Student Phone ─────────────────────────────────────────────

export async function saveStudentPhone(studentId: string, phone: string) {
  const { data, originalUrl } = await readProfileBlob(studentId);
  data.phone = phone;
  await saveProfileBlob(studentId, data, originalUrl);
}

export async function getStudentPhone(studentId: string): Promise<string> {
  const { data } = await readProfileBlob(studentId);
  return data.phone ?? "";
}

// ─── Agenda sync (stored in COACH's blob — RLS blocks coach writing student blob) ───

export async function saveAgendaForCoach(
  coachId: string,
  sessions: { id: string; coachId: string; diaSemana: string; hora: string; titulo: string; grupoMuscular: string; alumnoIds: string[]; alumnoEmails?: string[]; fecha?: string }[]
) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  data.agenda = sessions;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function getCoachAgenda(coachId: string): Promise<any[]> {
  const { data } = await readProfileBlob(coachId);
  return data.agenda ?? [];
}

// ─── Redes sync (stored in COACH's blob) ───

export async function saveRedesForCoach(
  coachId: string,
  redes: { id: string; coachId: string; nombre: string; tipo: string; alumnoIds: string[] }[]
) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  data.redes = redes;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function getCoachRedes(coachId: string): Promise<any[]> {
  const { data } = await readProfileBlob(coachId);
  return data.redes ?? [];
}

// ─── Unassigned Routines (stored in COACH's blob) ───

export async function saveCoachUnassignedRoutines(coachId: string, routines: any[]) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  data.unassignedRoutines = routines;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function getCoachUnassignedRoutines(coachId: string): Promise<any[]> {
  const { data } = await readProfileBlob(coachId);
  return data.unassignedRoutines ?? [];
}

// ─── Unassigned Nutrition Plans (stored in COACH's blob) ───

export async function saveCoachUnassignedPlans(coachId: string, plans: any[]) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  data.unassignedPlans = plans;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function getCoachUnassignedPlans(coachId: string): Promise<any[]> {
  const { data } = await readProfileBlob(coachId);
  return data.unassignedPlans ?? [];
}

// Read coach phone from their blob (needed by students)
export async function getCoachPhone(coachId: string): Promise<string> {
  const { data } = await readProfileBlob(coachId);
  return data.phone ?? "";
}

// ─── Premium Plans ─────────────────────────────────────────

export interface PremiumPlan {
  id: string;
  nombre: string;
  dias: number;
  precio: number;
  ahorro?: string;
  destacado?: string;
}

export const PLANES_PREMIUM: PremiumPlan[] = [
  { id: "mensual",     nombre: "Mensual",     dias: 30,  precio: 14999,  ahorro: undefined,                destacado: undefined },
  { id: "trimestral",  nombre: "Trimestral",  dias: 90,  precio: 24999,  ahorro: "Ahorra 17%",             destacado: "Más Popular" },
  { id: "semestral",   nombre: "Semestral",   dias: 180, precio: 44999,  ahorro: "Ahorra 25%",             destacado: undefined },
  { id: "anual",       nombre: "Anual",       dias: 365, precio: 79999,  ahorro: "Ahorra 33%",             destacado: "Mejor Valor" },
] as const;

export interface PremiumData {
  planId: string;
  planName: string;
  planDurationDays: number;
  planPrice: number;
  premiumExpiresAt: string;
  paymentStatus: string;
  paymentDate: string;
}

export async function getPremium(coachId: string): Promise<PremiumData | null> {
  const { data } = await readProfileBlob(coachId);
  return data.premium ?? null;
}

export async function savePremium(coachId: string, premium: PremiumData) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  data.premium = premium;
  await saveProfileBlob(coachId, data, originalUrl);
}

// Legacy alias for compatibility during migration
export const PLANES = PLANES_PREMIUM;
export type PlanId = string;
export async function getCoachSubscription(coachId: string): Promise<{ planId: string; desde?: string } | null> {
  const premium = await getPremium(coachId);
  if (!premium) return null;
  return { planId: premium.planId, desde: premium.paymentDate };
}
export async function saveCoachSubscription(coachId: string, planId: string) {
  // No-op: subscriptions are managed via premium payments
}

// Coach reads student completions via API route (cross-machine, bypasses RLS)
export async function getCoachCompletionsBatch(
  studentId: string
): Promise<Record<string, boolean>> {
  if (!studentId) return {};
  try {
    const { supabase } = await import("./supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    const res = await fetch(`/api/activities?studentId=${studentId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { completions } = await res.json();
      if (!completions) return {};
      // Filter by current week code and strip the suffix
      const weekCode = getWeekCode();
      const result: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(completions)) {
        if (key.endsWith(`_${weekCode}`)) {
          const dayId = key.slice(0, -(weekCode.length + 1));
          result[dayId] = Boolean(val);
        }
      }
      return result;
    }
  } catch {}
  return {};
}

// ─── Payment Tracking ──────────────────────────────────────

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function savePaymentStatus(coachId: string, studentId: string, paid: boolean) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  const payments = data.payments ?? {};
  const month = getMonthKey();
  if (!payments[month]) payments[month] = {};
  payments[month][studentId] = paid;
  data.payments = payments;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function loadPaymentStatus(coachId: string): Promise<Record<string, boolean>> {
  const { data } = await readProfileBlob(coachId);
  const month = getMonthKey();
  return data.payments?.[month] ?? {};
}

export async function resetMonthPayments(coachId: string, studentIds: string[]) {
  const { data, originalUrl } = await readProfileBlob(coachId);
  const payments = data.payments ?? {};
  const month = getMonthKey();
  payments[month] = {};
  for (const id of studentIds) {
    payments[month][id] = false;
  }
  data.payments = payments;
  await saveProfileBlob(coachId, data, originalUrl);
}

export async function getCoachStudentWeeklyStats(
  studentId: string,
  totalDays: number
): Promise<{ completedDays: number; totalDays: number; percentage: number }> {
  const weekData = await getCompletionsBatch(studentId);
  const completedDays = Object.values(weekData).filter(Boolean).length;
  return { completedDays, totalDays, percentage: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0 };
}

// ─── Student Current Week ─────────────────────────────────────

export async function getStudentCurrentWeek(studentId: string): Promise<number | null> {
  const { data } = await readProfileBlob(studentId);
  return data.current_week ?? null;
}

export async function saveStudentCurrentWeek(studentId: string, week: number): Promise<void> {
  const { data, originalUrl } = await readProfileBlob(studentId);
  data.current_week = week;
  await saveProfileBlob(studentId, data, originalUrl);
}


