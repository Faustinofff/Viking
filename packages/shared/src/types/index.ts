// ============================================================
// VIKING — Core Type Definitions
// ============================================================

export type UserRole = "independent" | "student" | "coach" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  onboarded: boolean;
}

export interface CoachProfile {
  id: string;
  userId: string;
  bio?: string;
  specialties: string[];
  certifications: string[];
  yearsOfExperience: number;
  availability: "online" | "presential" | "both";
  pricing?: string;
  gyms: GymAffiliation[];
  socialLinks: SocialLink[];
  rating: number;
  reviewCount: number;
  transformationPhotos: string[];
}

export interface GymAffiliation {
  gymId: string;
  gymName: string;
  address?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface CoachStudent {
  id: string;
  coachId: string;
  studentId: string;
  status: "active" | "paused" | "ended";
  startedAt: string;
  endedAt?: string;
}

export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "forearms" | "quadriceps" | "hamstrings" | "glutes"
  | "calves" | "abs" | "core" | "full_body" | "cardio";

export type Equipment =
  | "barbell" | "dumbbell" | "kettlebell" | "cable" | "machine"
  | "bodyweight" | "band" | "ez_bar" | "smith_machine"
  | "medicine_ball" | "foam_roller" | "other";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "elite";
export type ExerciseType = "strength" | "hypertrophy" | "endurance" | "cardio" | "flexibility" | "warmup";

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscleGroup: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  exerciseType: ExerciseType;
  tags: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  instructions: string[];
  isGlobal: boolean;
  createdByUserId?: string;
}

export interface CoachExerciseContent {
  id: string;
  exerciseId: string;
  coachId: string;
  videoUrl?: string;
  tips?: string;
  notes?: string;
  alternativeName?: string;
}

export type WeekDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  coachId?: string;
  studentId?: string;
  isTemplate: boolean;
  weeks: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutDay {
  id: string;
  planId: string;
  dayName: string;
  weekDay: WeekDay;
  weekNumber: number;
  notes?: string;
  sortOrder: number;
}

export interface WorkoutExercise {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  coachContentId?: string;
  sortOrder: number;
  notes?: string;
}

export interface ExerciseSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  restSeconds: number;
  type: "normal" | "warmup" | "dropset" | "superset" | "failure";
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutDayId: string;
  startedAt: string;
  completedAt?: string;
  status: "in_progress" | "completed" | "cancelled";
  totalDurationSeconds?: number;
  notes?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseSetId: string;
  repsCompleted?: number;
  weightUsedKg?: number;
  durationSeconds?: number;
  completed: boolean;
  completedAt?: string;
  rpe?: number;
}

export interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  coachId: string;
  studentId?: string;
  days: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
}

export interface Meal {
  id: string;
  mealPlanDayId: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout";
  instructions?: string;
  sortOrder: number;
}

export interface MealFood {
  id: string;
  mealId: string;
  foodName: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}

export interface MealLog {
  id: string;
  userId: string;
  mealId: string;
  completed: boolean;
  date: string;
  completedAt?: string;
}

export interface WaterLog {
  id: string;
  userId: string;
  amountMl: number;
  loggedAt: string;
  date: string;
}

export interface WeightLog {
  id: string;
  userId: string;
  weightKg: number;
  date: string;
  notes?: string;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bicepsCm?: number;
  thighsCm?: number;
  bodyFatPercentage?: number;
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  photoUrl: string;
  date: string;
  notes?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: "weight" | "strength" | "endurance" | "aesthetic" | "habit" | "other";
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  deadline?: string;
  status: "active" | "achieved" | "abandoned";
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  coachId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  weekDay: WeekDay;
  type: "presential" | "online";
  maxStudents: number;
  gymId?: string;
}

export interface SessionAttendance {
  id: string;
  sessionId: string;
  studentId: string;
  status: "confirmed" | "attended" | "missed" | "cancelled";
}

export interface Review {
  id: string;
  coachId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
  createdAt: string;
}

export interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  website?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "workout_reminder" | "session_reminder" | "message" | "achievement" | "coach_update";
  read: boolean;
  createdAt: string;
}
