export interface AdminEventMeta {
  studentId?: string;
  studentName?: string;
  planName?: string;
  routineName?: string;
  exerciseName?: string;
  sessionTitle?: string;
  redName?: string;
  detail?: string;
}

export type ActivityType =
  | "login"
  | "register"
  | "student_added"
  | "student_removed"
  | "student_updated"
  | "routine_created"
  | "routine_assigned"
  | "routine_deleted"
  | "nutrition_created"
  | "nutrition_assigned"
  | "nutrition_deleted"
  | "session_created"
  | "exercise_created"
  | "red_created"
  | "weight_updated"
  | "ai_used"
  | "export"
  | "settings"
  | "other";

export interface AdminEvent {
  id: string;
  ts: string;
  type: ActivityType;
  message: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  derived?: boolean;
  meta?: AdminEventMeta;
}

export interface PremiumInfo {
  planId: string;
  planName: string;
  planDurationDays: number;
  planPrice: number;
  premiumExpiresAt: string;
  paymentStatus: string;
  paymentDate: string;
}

export interface AdminCoach {
  id: string;
  email: string;
  name: string;
  role: "coach";
  createdAt: string;
  premium: PremiumInfo | null;
  isPremiumActive: boolean;
  isFreeCoach: boolean;
  premiumExpiresAt: string | null;
  premiumDaysLeft: number | null;
  premiumTrial: boolean;
  studentCount: number;
  activeStudentCount: number;
  inactiveStudentCount: number;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  lastAction: AdminEvent | null;
  activityCount: number;
  activityToday: number;
  activity7d: number;
  activity30d: number;
  status: "active" | "inactive" | "no_recent";
}

export interface AdminStudent {
  id: string;
  email: string;
  name: string;
  role: "student";
  createdAt: string;
  coachId: string | null;
  coachName: string | null;
  linkedAt: string | null;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  lastAction: AdminEvent | null;
  activityCount: number;
  currentRoutine: { id: string; name: string; createdAt: string } | null;
  lastInteractionAt: string | null;
  status: "active" | "inactive" | "no_recent";
}

export interface RelationLink {
  coachId: string;
  studentId: string;
  linkedAt: string | null;
  status: string;
}

export interface AlertItem {
  id: string;
  severity: "green" | "yellow" | "red" | "blue";
  type: string;
  message: string;
  coachId?: string;
  coachName?: string;
  studentId?: string;
  createdAt: string;
}

export interface AdminStats {
  totalCoaches: number;
  coachesActiveToday: number;
  coachesActive7d: number;
  coachesActive30d: number;
  coachesInactive: number;
  totalStudents: number;
  studentsActiveToday: number;
  studentsNoRecentActivity: number;
  usersActiveToday: number;
  usersActive7d: number;
  usersActive30d: number;
  lastActivityAt: string | null;
  lastLoginAt: string | null;
  actionsToday: number;
  actions7d: number;
  premiumActive: number;
  premiumNoPremium: number;
  premiumExpiringSoon: number;
  premiumExpired: number;
  premiumTrial: number;
  premiumAvgDaysLeft: number;
  newCoachesToday: number;
  newCoaches7d: number;
  newCoaches30d: number;
  newStudentsToday: number;
  newStudents7d: number;
  newStudents30d: number;
}

export interface GrowthPoint {
  date: string;
  coaches: number;
  students: number;
}

export interface AdminOverview {
  stats: AdminStats;
  growth: GrowthPoint[];
  feed: AdminEvent[];
  alerts: AlertItem[];
  topCoaches: AdminCoach[];
  topByStudents: AdminCoach[];
  recentCoaches: AdminCoach[];
  inactiveCoaches: AdminCoach[];
  premiumExpiringSoon: AdminCoach[];
  premiumExpiredCoaches: AdminCoach[];
  trialCoaches: AdminCoach[];
  hasRelationTimestamps: boolean;
}

export interface CoachDetail {
  coach: AdminCoach;
  students: AdminStudent[];
  events: AdminEvent[];
  studentCount: number;
  activeStudents: number;
  inactiveStudents: number;
}

export interface StudentDetail {
  student: AdminStudent;
  coach: AdminCoach | null;
  events: AdminEvent[];
  planCount: number;
}

export interface SearchResults {
  coaches: AdminCoach[];
  students: AdminStudent[];
}

export interface RelationshipsView {
  rows: {
    coach: AdminCoach;
    students: AdminStudent[];
    unassignedCount: number;
  }[];
  unassignedStudents: AdminStudent[];
}

export const ACTIVITY_CATEGORY_MAP: Record<ActivityType, { label: string; group: string }> = {
  login: { label: "Login", group: "login" },
  register: { label: "Registro", group: "login" },
  student_added: { label: "Alumno agregado", group: "alumnos" },
  student_removed: { label: "Alumno eliminado", group: "alumnos" },
  student_updated: { label: "Alumno modificado", group: "alumnos" },
  weight_updated: { label: "Peso actualizado", group: "alumnos" },
  routine_created: { label: "Rutina creada", group: "rutinas" },
  routine_assigned: { label: "Rutina asignada", group: "rutinas" },
  routine_deleted: { label: "Rutina eliminada", group: "rutinas" },
  nutrition_created: { label: "Plan nutricional creado", group: "nutricion" },
  nutrition_assigned: { label: "Plan nutricional asignado", group: "nutricion" },
  nutrition_deleted: { label: "Plan nutricional eliminado", group: "nutricion" },
  session_created: { label: "Sesión agendada", group: "configuracion" },
  exercise_created: { label: "Ejercicio creado", group: "configuracion" },
  red_created: { label: "Red creada", group: "configuracion" },
  ai_used: { label: "IA utilizada", group: "ia" },
  export: { label: "Exportación", group: "exportaciones" },
  settings: { label: "Configuración", group: "configuracion" },
  other: { label: "Otras acciones", group: "otras" },
};

export const ACTIVITY_GROUPS = [
  { id: "all", label: "Todas" },
  { id: "login", label: "Login" },
  { id: "alumnos", label: "Alumnos" },
  { id: "rutinas", label: "Rutinas" },
  { id: "nutricion", label: "Nutrición" },
  { id: "ia", label: "IA" },
  { id: "exportaciones", label: "Exportaciones" },
  { id: "configuracion", label: "Configuración" },
  { id: "otras", label: "Otras acciones" },
] as const;

export function activityGroup(type: ActivityType): string {
  return ACTIVITY_CATEGORY_MAP[type]?.group ?? "otras";
}
