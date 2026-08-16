import { getAdminClient } from "./admin";
import type {
  ActivityType,
  AdminCoach,
  AdminEvent,
  AdminOverview,
  AdminStats,
  AdminStudent,
  AlertItem,
  CoachDetail,
  GrowthPoint,
  PremiumInfo,
  RelationshipsView,
  SearchResults,
  StudentDetail,
} from "./admin-types";

const NUTRITION_PREFIX = "NUTRITION: ";
const DAY_MS = 24 * 60 * 60 * 1000;

export const COACH_GRATIS_EMAILS = ["faustinofiordalisi@gmail.com", "maxi22albaracin@gmail.com"];

export function isCoachGratuito(email?: string | null): boolean {
  if (!email) return false;
  return COACH_GRATIS_EMAILS.includes(email.toLowerCase());
}

export function parseBlob(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

export function parsePremium(blob: Record<string, any>): PremiumInfo | null {
  const prem = blob.premium;
  if (!prem || typeof prem !== "object") return null;
  if (!prem.premiumExpiresAt) return null;
  return {
    planId: prem.planId ?? "",
    planName: prem.planName ?? "",
    planDurationDays: prem.planDurationDays ?? 0,
    planPrice: prem.planPrice ?? 0,
    premiumExpiresAt: prem.premiumExpiresAt,
    paymentStatus: prem.paymentStatus ?? "",
    paymentDate: prem.paymentDate ?? "",
  };
}

export interface RawSnapshot {
  profiles: any[];
  relations: any[];
  plans: any[];
  hasRelationTimestamps: boolean;
}

export async function loadRawSnapshot(): Promise<RawSnapshot> {
  const client = getAdminClient();

  const { data: profiles } = await client
    .from("profiles")
    .select("id, email, display_name, role, avatar_url, created_at");

  let relations: any[] = [];
  let hasRelationTimestamps = false;
  try {
    const res = await client
      .from("coach_students")
      .select("coach_id, student_id, status, created_at");
    if (res.error) throw res.error;
    relations = res.data ?? [];
    hasRelationTimestamps = relations.some((r) => !!r.created_at);
  } catch {
    const res = await client.from("coach_students").select("coach_id, student_id, status");
    if (!res.error) relations = res.data ?? [];
  }

  const { data: plans } = await client
    .from("workout_plans")
    .select("id, name, description, coach_id, student_id, created_at");

  return {
    profiles: profiles ?? [],
    relations,
    plans: plans ?? [],
    hasRelationTimestamps,
  };
}

function tsMax(...values: (string | null | undefined)[]): string | null {
  let max: string | null = null;
  for (const v of values) {
    if (!v) continue;
    const t = new Date(v).getTime();
    if (!isNaN(t) && (max === null || t > new Date(max).getTime())) max = v;
  }
  return max;
}

function isSameOrAfter(ts: string | null, threshold: number): boolean {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (isNaN(t)) return false;
  return t >= threshold;
}

function activeStatus(activeAt: string | null, now: number): AdminCoach["status"] {
  if (!activeAt) return "inactive";
  const t = new Date(activeAt).getTime();
  if (isNaN(t)) return "inactive";
  if (now - t < 7 * DAY_MS) return "active";
  if (now - t <= 30 * DAY_MS) return "no_recent";
  return "inactive";
}

export interface Computed {
  now: number;
  coaches: AdminCoach[];
  students: AdminStudent[];
  studentNameById: Map<string, string>;
  coachNameById: Map<string, string>;
  eventsByCoach: Record<string, AdminEvent[]>;
  eventsByStudent: Record<string, AdminEvent[]>;
}

export function computeSnapshot(raw: RawSnapshot): Computed {
  const now = Date.now();
  const studentNameById = new Map<string, string>();
  const coachNameById = new Map<string, string>();

  const profileById = new Map<string, any>();
  const blobs: Record<string, Record<string, any>> = {};
  for (const p of raw.profiles) {
    profileById.set(p.id, p);
    blobs[p.id] = parseBlob(p.avatar_url);
    if (p.role === "student") studentNameById.set(p.id, p.display_name ?? p.email ?? p.id);
    if (p.role === "coach") coachNameById.set(p.id, p.display_name ?? p.email ?? p.id);
  }

  const studentsByCoach: Record<string, string[]> = {};
  const coachByStudent: Record<string, string> = {};
  const linkedAtByStudent: Record<string, string | null> = {};
  for (const rel of raw.relations) {
    if (rel.status && rel.status !== "active") continue;
    if (!coachByStudent[rel.student_id]) {
      coachByStudent[rel.student_id] = rel.coach_id;
      linkedAtByStudent[rel.student_id] = rel.created_at ?? null;
    }
    if (!studentsByCoach[rel.coach_id]) studentsByCoach[rel.coach_id] = [];
    if (!studentsByCoach[rel.coach_id].includes(rel.student_id)) {
      studentsByCoach[rel.coach_id].push(rel.student_id);
    }
  }

  const buildEvents = (coachId: string, blob: Record<string, any>, createdAt: string): AdminEvent[] => {
    const coachName = coachNameById.get(coachId) ?? "";
    const events: AdminEvent[] = [];

    const tracked: any[] = Array.isArray(blob.adminActivity) ? blob.adminActivity : [];
    const trackedClean = tracked
      .filter((e) => {
        if (raw.hasRelationTimestamps && e.type === "student_added") return false;
        if (e.type === "routine_assigned" || e.type === "nutrition_assigned") return false;
        return true;
      })
      .map((e) => ({
        id: e.id,
        ts: e.ts,
        type: e.type,
        message: e.message,
        meta: e.meta,
        actorId: coachId,
        actorName: coachName,
        actorRole: "coach",
      }));
    events.push(...trackedClean);

    for (const rel of raw.relations) {
      if (rel.coach_id !== coachId || !rel.created_at) continue;
      const sn = studentNameById.get(rel.student_id);
      events.push({
        id: `rel_${rel.coach_id}_${rel.student_id}`,
        ts: rel.created_at,
        type: "student_added",
        message: `Agregó al alumno${sn ? ` ${sn}` : ""}`,
        actorId: coachId,
        actorName: coachName,
        actorRole: "coach",
        derived: true,
        meta: { studentId: rel.student_id, studentName: sn },
      });
    }

    for (const plan of raw.plans) {
      if (plan.coach_id !== coachId || !plan.created_at || !plan.student_id) continue;
      const isNutri = (plan.name ?? "").startsWith(NUTRITION_PREFIX);
      const nombre = isNutri ? plan.name.slice(NUTRITION_PREFIX.length) : plan.name;
      const sn = studentNameById.get(plan.student_id);
      events.push({
        id: `plan_${plan.id}`,
        ts: plan.created_at,
        type: isNutri ? "nutrition_assigned" : "routine_assigned",
        message: isNutri
          ? `Asignó plan nutricional "${nombre}"${sn ? ` a ${sn}` : ""}`
          : `Asignó rutina "${nombre}"${sn ? ` a ${sn}` : ""}`,
        actorId: coachId,
        actorName: coachName,
        actorRole: "coach",
        derived: true,
        meta: { studentId: plan.student_id, studentName: sn, planName: nombre },
      });
    }

    events.push({
      id: `reg_${coachId}`,
      ts: createdAt,
      type: "register",
      message: "Se registró como coach",
      actorId: coachId,
      actorName: coachName,
      actorRole: "coach",
      derived: true,
    });

    events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return events.slice(0, 300);
  };

  const eventsByCoach: Record<string, AdminEvent[]> = {};
  const coaches: AdminCoach[] = [];
  for (const p of raw.profiles) {
    if (p.role !== "coach") continue;
    const blob = blobs[p.id];
    const events = buildEvents(p.id, blob, p.created_at);
    eventsByCoach[p.id] = events;
    const premium = parsePremium(blob);
    const isFree = isCoachGratuito(p.email);
    const isActivePremium = !!premium && new Date(premium.premiumExpiresAt).getTime() > now;
    const daysLeft =
      premium && !isNaN(new Date(premium.premiumExpiresAt).getTime())
        ? Math.floor((new Date(premium.premiumExpiresAt).getTime() - now) / DAY_MS)
        : null;
    const premiumTrial =
      !!premium && (premium.planId === "prueba" || (premium.planName ?? "").toLowerCase().includes("prueba"));

    const lastActivityAt = tsMax(events[0]?.ts, blob.lastActivityAt, blob.lastLoginAt);

    const countInRange = (events: AdminEvent[], since: number, excludeLogin: boolean) =>
      events.filter((e) => {
        if (excludeLogin && e.type === "login") return false;
        const t = new Date(e.ts).getTime();
        return !isNaN(t) && t >= since;
      }).length;

    const nowMs = now;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const studentIds = studentsByCoach[p.id] ?? [];
    const coach = {
      id: p.id,
      email: p.email,
      name: p.display_name ?? p.email ?? p.id,
      role: "coach" as const,
      createdAt: p.created_at,
      premium,
      isPremiumActive: isActivePremium && !isFree,
      isFreeCoach: isFree,
      premiumExpiresAt: premium?.premiumExpiresAt ?? null,
      premiumDaysLeft: daysLeft,
      premiumTrial,
      studentCount: studentIds.length,
      activeStudentCount: 0,
      inactiveStudentCount: 0,
      lastLoginAt: blob.lastLoginAt ?? null,
      lastActivityAt,
      lastAction: events[0] ?? null,
      activityCount: events.length,
      activityToday: countInRange(events, todayStart.getTime(), true),
      activity7d: countInRange(events, nowMs - 7 * DAY_MS, true),
      activity30d: countInRange(events, nowMs - 30 * DAY_MS, true),
      status: activeStatus(lastActivityAt, nowMs),
    };
    coaches.push(coach);
  }

  const studentStatusById: Record<string, AdminCoach["status"]> = {};
  const buildStudentEvents = (
    studentId: string,
    blob: Record<string, any>,
    createdAt: string,
    coachName: string
  ): AdminEvent[] => {
    const events: AdminEvent[] = [];
    const name = studentNameById.get(studentId) ?? "";
    const tracked: any[] = Array.isArray(blob.adminActivity) ? blob.adminActivity : [];
    events.push(
      ...tracked.map((e) => ({
        id: e.id,
        ts: e.ts,
        type: e.type,
        message: e.message,
        meta: e.meta,
        actorId: studentId,
        actorName: name,
        actorRole: "student",
      }))
    );
    const acts: any[] = Array.isArray(blob.activities) ? blob.activities : [];
    for (const a of acts) {
      events.push({
        id: a.id ?? `sact_${studentId}_${a.timestamp}`,
        ts: a.timestamp,
        type: "other",
        message: a.mensaje ?? "Actividad",
        actorId: studentId,
        actorName: name,
        actorRole: "student",
        derived: true,
        meta: { detail: a.tipo },
      });
    }
    events.push({
      id: `reg_st_${studentId}`,
      ts: createdAt,
      type: "register",
      message: "Se registró como alumno",
      actorId: studentId,
      actorName: name,
      actorRole: "student",
      derived: true,
    });
    events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return events.slice(0, 200);
  };

  const eventsByStudent: Record<string, AdminEvent[]> = {};
  const students: AdminStudent[] = [];
  for (const p of raw.profiles) {
    if (p.role !== "student") continue;
    const blob = blobs[p.id];
    const coachId = coachByStudent[p.id];
    const coachName = coachId ? coachNameById.get(coachId) ?? "" : null;
    const events = buildStudentEvents(p.id, blob, p.created_at, coachName ?? "");
    eventsByStudent[p.id] = events;
    const lastActivityAt = tsMax(events[0]?.ts, blob.lastActivityAt, blob.lastLoginAt);
    studentStatusById[p.id] = activeStatus(lastActivityAt, now);

    let currentRoutine: AdminStudent["currentRoutine"] = null;
    let lastInteractionAt: string | null = null;
    let planCount = 0;
    for (const plan of raw.plans) {
      if (plan.student_id !== p.id) continue;
      planCount++;
      if (!lastInteractionAt || new Date(plan.created_at) > new Date(lastInteractionAt)) {
        lastInteractionAt = plan.created_at;
      }
      const isNutri = (plan.name ?? "").startsWith(NUTRITION_PREFIX);
      if (!isNutri && (!currentRoutine || new Date(plan.created_at) > new Date(currentRoutine.createdAt))) {
        currentRoutine = {
          id: plan.id,
          name: plan.name,
          createdAt: plan.created_at,
        };
      }
    }

    students.push({
      id: p.id,
      email: p.email,
      name: p.display_name ?? p.email ?? p.id,
      role: "student",
      createdAt: p.created_at,
      coachId,
      coachName,
      linkedAt: linkedAtByStudent[p.id] ?? null,
      lastLoginAt: blob.lastLoginAt ?? null,
      lastActivityAt,
      lastAction: events[0] ?? null,
      activityCount: events.length,
      currentRoutine,
      lastInteractionAt,
      status: studentStatusById[p.id],
    });
  }

  // Fill active/inactive student counts per coach
  for (const coach of coaches) {
    const ids = studentsByCoach[coach.id] ?? [];
    let active = 0;
    for (const sid of ids) {
      if (studentStatusById[sid] === "active") active++;
    }
    coach.activeStudentCount = active;
    coach.inactiveStudentCount = ids.length - active;
  }

  coaches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    now,
    coaches,
    students,
    studentNameById,
    coachNameById,
    eventsByCoach,
    eventsByStudent,
  };
}

export function buildStats(c: Computed, raw: RawSnapshot): AdminStats {
  const now = c.now;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = todayStart.getTime();
  const since7 = now - 7 * DAY_MS;
  const since30 = now - 30 * DAY_MS;

  const isActive = (ts: string | null, since: number) => {
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return !isNaN(t) && t >= since;
  };

  let coachesActiveToday = 0;
  let coachesActive7d = 0;
  let coachesActive30d = 0;
  let premiumActive = 0;
  let premiumNoPremium = 0;
  let premiumExpiringSoon = 0;
  let premiumExpired = 0;
  let premiumTrial = 0;
  let premiumDaysSum = 0;
  let premiumDaysCount = 0;
  let actionsToday = 0;
  let actions7d = 0;
  let lastActivityAt: string | null = null;
  let lastLoginAt: string | null = null;

  for (const coach of c.coaches) {
    const eff = tsMax(coach.lastActivityAt, coach.lastLoginAt);
    if (isActive(eff, today)) coachesActiveToday++;
    if (isActive(eff, since7)) coachesActive7d++;
    if (isActive(eff, since30)) coachesActive30d++;

    if (coach.premium) {
      const exp = new Date(coach.premium.premiumExpiresAt).getTime();
      if (coach.isPremiumActive) {
        premiumActive++;
        const days = coach.premiumDaysLeft ?? 0;
        if (days > 0 && days <= 7) premiumExpiringSoon++;
        if (days > 0) {
          premiumDaysSum += days;
          premiumDaysCount++;
        }
      } else if (exp < now) {
        premiumExpired++;
      }
      if (coach.premiumTrial) premiumTrial++;
    } else if (!coach.isFreeCoach) {
      premiumNoPremium++;
    }

    for (const e of c.eventsByCoach[coach.id] ?? []) {
      if (e.type === "login") continue;
      const t = new Date(e.ts).getTime();
      if (isNaN(t)) continue;
      if (t >= today) actionsToday++;
      if (t >= since7) actions7d++;
    }

    lastActivityAt = tsMax(lastActivityAt, coach.lastActivityAt);
    lastLoginAt = tsMax(lastLoginAt, coach.lastLoginAt);
  }

  let studentsActiveToday = 0;
  let studentsNoRecentActivity = 0;
  for (const s of c.students) {
    const eff = tsMax(s.lastActivityAt, s.lastLoginAt);
    if (isActive(eff, today)) studentsActiveToday++;
    if (!isActive(eff, since30)) studentsNoRecentActivity++;
  }

  const coachesActive = (since: number) =>
    c.coaches.filter((co) => isActive(tsMax(co.lastActivityAt, co.lastLoginAt), since)).length;
  const studentsActive = (since: number) =>
    c.students.filter((s) => isActive(tsMax(s.lastActivityAt, s.lastLoginAt), since)).length;

  const countCreated = (role: string, since: number) =>
    raw.profiles.filter((p) => p.role === role && new Date(p.created_at).getTime() >= since).length;

  return {
    totalCoaches: c.coaches.length,
    coachesActiveToday,
    coachesActive7d,
    coachesActive30d,
    coachesInactive: c.coaches.length - coachesActive30d,
    totalStudents: c.students.length,
    studentsActiveToday,
    studentsNoRecentActivity,
    usersActiveToday: coachesActive(today) + studentsActive(today),
    usersActive7d: coachesActive(since7) + studentsActive(since7),
    usersActive30d: coachesActive(since30) + studentsActive(since30),
    lastActivityAt,
    lastLoginAt,
    actionsToday,
    actions7d,
    premiumActive,
    premiumNoPremium,
    premiumExpiringSoon,
    premiumExpired,
    premiumTrial,
    premiumAvgDaysLeft: premiumDaysCount > 0 ? Math.round(premiumDaysSum / premiumDaysCount) : 0,
    newCoachesToday: countCreated("coach", today),
    newCoaches7d: countCreated("coach", since7),
    newCoaches30d: countCreated("coach", since30),
    newStudentsToday: countCreated("student", today),
    newStudents7d: countCreated("student", since7),
    newStudents30d: countCreated("student", since30),
  };
}

export function buildGrowth(raw: RawSnapshot): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const coaches = raw.profiles.filter(
      (p) => p.role === "coach" && new Date(p.created_at) < next
    ).length;
    const students = raw.profiles.filter(
      (p) => p.role === "student" && new Date(p.created_at) < next
    ).length;
    points.push({ date: d.toISOString().slice(0, 10), coaches, students });
  }
  return points;
}

export function buildAlerts(c: Computed, raw: RawSnapshot): AlertItem[] {
  const alerts: AlertItem[] = [];
  const now = c.now;
  const since7 = now - 7 * DAY_MS;
  const since14 = now - 14 * DAY_MS;

  for (const coach of c.coaches) {
    const coachName = coach.name;
    if (new Date(coach.createdAt).getTime() >= since7) {
      alerts.push({
        id: `new_${coach.id}`,
        severity: "green",
        type: "new_coach",
        message: `Nuevo coach registrado: ${coachName}`,
        coachId: coach.id,
        coachName,
        createdAt: coach.createdAt,
      });
    }

    if (coach.premiumExpiresAt && coach.isPremiumActive && (coach.premiumDaysLeft ?? 99) <= 7) {
      alerts.push({
        id: `expiring_${coach.id}`,
        severity: "yellow",
        type: "premium_expiring",
        message: `Premium de ${coachName} vence en ${coach.premiumDaysLeft} días`,
        coachId: coach.id,
        coachName,
        createdAt: new Date().toISOString(),
      });
    }

    if (coach.premium && !coach.isPremiumActive && !coach.isFreeCoach) {
      const exp = new Date(coach.premium.premiumExpiresAt).getTime();
      if (exp < now) {
        alerts.push({
          id: `expired_${coach.id}`,
          severity: "red",
          type: "premium_expired",
          message: `Coach Premium vencido: ${coachName}`,
          coachId: coach.id,
          coachName,
          createdAt: coach.premium.premiumExpiresAt,
        });
      }
    }

    const eff = tsMax(coach.lastActivityAt, coach.lastLoginAt);
    const registeredFor = now - new Date(coach.createdAt).getTime();
    if (registeredFor > 3 * DAY_MS && !eff) {
      alerts.push({
        id: `noused_${coach.id}`,
        severity: "yellow",
        type: "no_activity",
        message: `Coach registrado sin actividad: ${coachName}`,
        coachId: coach.id,
        coachName,
        createdAt: coach.createdAt,
      });
    }

    if (coach.isPremiumActive && eff && now - new Date(eff).getTime() > since14) {
      alerts.push({
        id: `premium_idle_${coach.id}`,
        severity: "yellow",
        type: "premium_idle",
        message: `Coach con Premium activo pero sin actividad reciente: ${coachName}`,
        coachId: coach.id,
        coachName,
        createdAt: eff,
      });
    }

    const addedRecently = (c.eventsByCoach[coach.id] ?? []).filter(
      (e) => e.type === "student_added" && new Date(e.ts).getTime() >= since7
    );
    if (addedRecently.length > 0) {
      alerts.push({
        id: `added_${coach.id}`,
        severity: "green",
        type: "students_added",
        message: `${coachName} agregó ${addedRecently.length} ${addedRecently.length === 1 ? "alumno nuevo" : "alumnos nuevos"}`,
        coachId: coach.id,
        coachName,
        createdAt: addedRecently[0].ts,
      });
    }
  }

  const severityOrder: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3 };
  alerts.sort((a, b) => {
    const d = severityOrder[a.severity] - severityOrder[b.severity];
    if (d !== 0) return d;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return alerts.slice(0, 30);
}

export function buildFeed(c: Computed): AdminEvent[] {
  const feed: AdminEvent[] = [];
  for (const coach of c.coaches) {
    for (const e of c.eventsByCoach[coach.id] ?? []) {
      if (!e.actorName) e.actorName = coach.name;
      feed.push(e);
    }
  }
  feed.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return feed.slice(0, 100);
}

export async function loadOverview(): Promise<AdminOverview> {
  const raw = await loadRawSnapshot();
  const computed = computeSnapshot(raw);

  const byStudents = [...computed.coaches].sort((a, b) => b.studentCount - a.studentCount);
  const byActivity = [...computed.coaches].sort(
    (a, b) => (b.activity30d ?? 0) - (a.activity30d ?? 0)
  );
  const recent = [...computed.coaches].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const inactive = [...computed.coaches]
    .filter((co) => co.status !== "active")
    .sort(
      (a, b) =>
        (new Date(a.lastActivityAt ?? a.createdAt).getTime() ?? 0) -
        (new Date(b.lastActivityAt ?? b.createdAt).getTime() ?? 0)
    );
  const expiring = computed.coaches.filter(
    (co) => co.premiumExpiresAt && co.isPremiumActive && (co.premiumDaysLeft ?? 99) <= 7
  );
  const expired = computed.coaches.filter((co) => co.premium && !co.isPremiumActive && !co.isFreeCoach);
  const trial = computed.coaches.filter((co) => co.premiumTrial);

  return {
    stats: buildStats(computed, raw),
    growth: buildGrowth(raw),
    feed: buildFeed(computed),
    alerts: buildAlerts(computed, raw),
    topCoaches: byActivity.slice(0, 6),
    topByStudents: byStudents.slice(0, 6),
    recentCoaches: recent.slice(0, 6),
    inactiveCoaches: inactive.slice(0, 6),
    premiumExpiringSoon: expiring,
    premiumExpiredCoaches: expired,
    trialCoaches: trial,
    hasRelationTimestamps: raw.hasRelationTimestamps,
  };
}

export async function loadCoachDetail(id: string): Promise<CoachDetail | null> {
  const raw = await loadRawSnapshot();
  const computed = computeSnapshot(raw);
  const coach = computed.coaches.find((c) => c.id === id);
  if (!coach) return null;

  const students = computed.students.filter((s) => s.coachId === id);
  students.sort((a, b) => new Date(b.linkedAt ?? b.createdAt).getTime() - new Date(a.linkedAt ?? a.createdAt).getTime());

  return {
    coach,
    students,
    events: computed.eventsByCoach[id] ?? [],
    studentCount: coach.studentCount,
    activeStudents: coach.activeStudentCount,
    inactiveStudents: coach.inactiveStudentCount,
  };
}

export async function loadStudentDetail(id: string): Promise<StudentDetail | null> {
  const raw = await loadRawSnapshot();
  const computed = computeSnapshot(raw);
  const student = computed.students.find((s) => s.id === id);
  if (!student) return null;

  const coach = student.coachId
    ? computed.coaches.find((c) => c.id === student.coachId) ?? null
    : null;

  const planCount = raw.plans.filter((p) => p.student_id === id).length;

  return {
    student,
    coach,
    events: computed.eventsByStudent[id] ?? [],
    planCount,
  };
}

export async function loadRelationships(): Promise<RelationshipsView> {
  const raw = await loadRawSnapshot();
  const computed = computeSnapshot(raw);

  const rows = computed.coaches.map((coach) => ({
    coach,
    students: computed.students
      .filter((s) => s.coachId === coach.id)
      .sort((a, b) => new Date(b.linkedAt ?? b.createdAt).getTime() - new Date(a.linkedAt ?? a.createdAt).getTime()),
    unassignedCount: 0,
  }));
  const linkedIds = new Set(computed.students.filter((s) => s.coachId).map((s) => s.id));
  const unassignedStudents = computed.students.filter((s) => !linkedIds.has(s.id));

  return { rows, unassignedStudents };
}

export async function globalSearch(q: string): Promise<SearchResults> {
  const raw = await loadRawSnapshot();
  const computed = computeSnapshot(raw);
  const query = q.trim().toLowerCase();
  if (!query) return { coaches: [], students: [] };

  const match = (v?: string | null) => (v ?? "").toLowerCase().includes(query);

  return {
    coaches: computed.coaches
      .filter((c) => match(c.name) || match(c.email))
      .slice(0, 20),
    students: computed.students
      .filter((s) => match(s.name) || match(s.email))
      .slice(0, 20),
  };
}

export function isNutritionPlanName(name?: string): boolean {
  return !!name && name.startsWith(NUTRITION_PREFIX);
}
