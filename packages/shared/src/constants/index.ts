// ─── Design Tokens ──────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  bg: {
    primary: "#0A0A0B",
    secondary: "#121214",
    tertiary: "#1A1A1E",
    card: "rgba(255, 255, 255, 0.04)",
    cardHover: "rgba(255, 255, 255, 0.08)",
    glass: "rgba(255, 255, 255, 0.06)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
  },
  // Accent
  accent: {
    primary: "#00D4AA",
    primaryDark: "#00A88A",
    primaryLight: "#33DDBB",
    glow: "rgba(0, 212, 170, 0.25)",
    glowStrong: "rgba(0, 212, 170, 0.4)",
  },
  // Text
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.7)",
    tertiary: "rgba(255, 255, 255, 0.4)",
    inverse: "#0A0A0B",
  },
  // Status
  status: {
    success: "#00D4AA",
    warning: "#FFB800",
    error: "#FF4757",
    info: "#4A9EFF",
  },
  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    default: "rgba(255, 255, 255, 0.1)",
    strong: "rgba(255, 255, 255, 0.16)",
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  "2xl": 28,
  full: 9999,
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
} as const;

export const FONT_WEIGHTS = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const FONT_FAMILY = {
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
};

export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { damping: 20, stiffness: 300 },
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

// ─── Muscle Groups ──────────────────────────────────────────
export const MUSCLE_GROUP_OPTIONS = [
  { value: "chest", label: "Chest", icon: "💪" },
  { value: "back", label: "Back", icon: "🔙" },
  { value: "shoulders", label: "Shoulders", icon: "🏋️" },
  { value: "biceps", label: "Biceps", icon: "💪" },
  { value: "triceps", label: "Triceps", icon: "💪" },
  { value: "forearms", label: "Forearms", icon: "🤌" },
  { value: "quadriceps", label: "Quadriceps", icon: "🦵" },
  { value: "hamstrings", label: "Hamstrings", icon: "🦵" },
  { value: "glutes", label: "Glutes", icon: "🍑" },
  { value: "calves", label: "Calves", icon: "🦵" },
  { value: "abs", label: "Abs", icon: "🔥" },
  { value: "core", label: "Core", icon: "🔥" },
  { value: "full_body", label: "Full Body", icon: "💪" },
  { value: "cardio", label: "Cardio", icon: "🏃" },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "cable", label: "Cable" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "band", label: "Resistance Band" },
  { value: "ez_bar", label: "EZ Bar" },
  { value: "smith_machine", label: "Smith Machine" },
  { value: "medicine_ball", label: "Medicine Ball" },
  { value: "foam_roller", label: "Foam Roller" },
  { value: "other", label: "Other" },
] as const;

// ─── Week Days ──────────────────────────────────────────────
export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// ─── Meal Types ─────────────────────────────────────────────
export const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "pre_workout", label: "Pre-Workout" },
  { value: "post_workout", label: "Post-Workout" },
] as const;

// ─── Goals ──────────────────────────────────────────────────
export const GOAL_TYPES = [
  { value: "weight", label: "Weight" },
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "aesthetic", label: "Aesthetic" },
  { value: "habit", label: "Habit" },
  { value: "other", label: "Other" },
] as const;
