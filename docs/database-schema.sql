-- ============================================================
-- VIKING — Complete Database Schema (Supabase/PostgreSQL)
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users & Auth ──────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  role        TEXT NOT NULL CHECK (role IN ('independent', 'student', 'coach', 'admin')),
  onboarded   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ─── Coach Profiles ────────────────────────────────────────
CREATE TABLE public.coach_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  bio             TEXT,
  specialties     TEXT[] DEFAULT '{}',
  certifications  TEXT[] DEFAULT '{}',
  years_experience INTEGER DEFAULT 0,
  availability    TEXT DEFAULT 'online' CHECK (availability IN ('online', 'presential', 'both')),
  pricing         TEXT,
  rating          DECIMAL(2,1) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Coach-Student Relationship ────────────────────────────
CREATE TABLE public.coach_students (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  UNIQUE(coach_id, student_id)
);

CREATE INDEX idx_coach_students_coach ON public.coach_students(coach_id);
CREATE INDEX idx_coach_students_student ON public.coach_students(student_id);

-- ─── Gyms ──────────────────────────────────────────────────
CREATE TABLE public.gyms (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name    TEXT NOT NULL,
  address TEXT,
  city    TEXT,
  country TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.coach_gyms (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id   UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  UNIQUE(coach_id, gym_id)
);

-- ─── Exercises ─────────────────────────────────────────────
CREATE TABLE public.exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  muscle_groups   TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment       TEXT[] NOT NULL DEFAULT '{}',
  difficulty      TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
  exercise_type   TEXT DEFAULT 'strength' CHECK (exercise_type IN ('strength', 'hypertrophy', 'endurance', 'cardio', 'flexibility', 'warmup')),
  tags            TEXT[] DEFAULT '{}',
  thumbnail_url   TEXT,
  video_url       TEXT,
  instructions    TEXT[] DEFAULT '{}',
  is_global       BOOLEAN DEFAULT FALSE,
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_muscle ON public.exercises USING GIN(muscle_groups);
CREATE INDEX idx_exercises_equipment ON public.exercises USING GIN(equipment);
CREATE INDEX idx_exercises_global ON public.exercises(is_global);
CREATE INDEX idx_exercises_name_search ON public.exercises USING GIN(to_tsvector('english', name));

-- ─── Coach Custom Exercise Content ─────────────────────────
CREATE TABLE public.coach_exercise_content (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url   TEXT,
  tips        TEXT,
  notes       TEXT,
  alternative_name TEXT,
  UNIQUE(coach_id, exercise_id)
);

-- ─── Workout Plans ─────────────────────────────────────────
CREATE TABLE public.workout_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  coach_id    UUID REFERENCES public.profiles(id),
  student_id  UUID REFERENCES public.profiles(id),
  is_template BOOLEAN DEFAULT FALSE,
  weeks       INTEGER DEFAULT 4,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_plans_coach ON public.workout_plans(coach_id);
CREATE INDEX idx_workout_plans_student ON public.workout_plans(student_id);
CREATE INDEX idx_workout_plans_template ON public.workout_plans(is_template);

-- ─── Workout Days ──────────────────────────────────────────
CREATE TABLE public.workout_days (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_name    TEXT NOT NULL,
  week_day    TEXT CHECK (week_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  week_number INTEGER DEFAULT 1,
  notes       TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE INDEX idx_workout_days_plan ON public.workout_days(plan_id);

-- ─── Workout Exercises ─────────────────────────────────────
CREATE TABLE public.workout_exercises (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_day_id    UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  exercise_id       UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  coach_content_id  UUID REFERENCES public.coach_exercise_content(id),
  sort_order        INTEGER DEFAULT 0,
  notes             TEXT
);

CREATE INDEX idx_workout_exercises_day ON public.workout_exercises(workout_day_id);

-- ─── Exercise Sets (template within a routine) ─────────────
CREATE TABLE public.exercise_sets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL,
  reps                INTEGER,
  weight_kg           DECIMAL(6,2),
  duration_seconds    INTEGER,
  rest_seconds        INTEGER DEFAULT 90,
  set_type            TEXT DEFAULT 'normal' CHECK (set_type IN ('normal', 'warmup', 'dropset', 'superset', 'failure'))
);

CREATE INDEX idx_exercise_sets_exercise ON public.exercise_sets(workout_exercise_id);

-- ─── Workout Sessions (actual workout tracking) ────────────
CREATE TABLE public.workout_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workout_day_id   UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  status           TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_duration_seconds INTEGER,
  notes            TEXT
);

CREATE INDEX idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_status ON public.workout_sessions(status);

-- ─── Set Logs ──────────────────────────────────────────────
CREATE TABLE public.set_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_set_id UUID NOT NULL REFERENCES public.exercise_sets(id),
  reps_completed  INTEGER,
  weight_used_kg  DECIMAL(6,2),
  duration_seconds INTEGER,
  completed       BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  rpe             DECIMAL(2,1)
);

CREATE INDEX idx_set_logs_session ON public.set_logs(session_id);

-- ─── Nutrition Plans ───────────────────────────────────────
CREATE TABLE public.nutrition_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  coach_id    UUID NOT NULL REFERENCES public.profiles(id),
  student_id  UUID REFERENCES public.profiles(id),
  days        INTEGER DEFAULT 7,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Meal Plan Days ────────────────────────────────────────
CREATE TABLE public.meal_plan_days (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id      UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  day_number   INTEGER NOT NULL,
  total_calories INTEGER,
  total_protein  DECIMAL(6,2),
  total_carbs    DECIMAL(6,2),
  total_fat      DECIMAL(6,2)
);

-- ─── Meals ─────────────────────────────────────────────────
CREATE TABLE public.meals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_day_id UUID NOT NULL REFERENCES public.meal_plan_days(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  meal_type       TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  instructions    TEXT,
  sort_order      INTEGER DEFAULT 0
);

-- ─── Meal Foods ────────────────────────────────────────────
CREATE TABLE public.meal_foods (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id     UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  food_name   TEXT NOT NULL,
  quantity    TEXT,
  calories    INTEGER DEFAULT 0,
  protein     DECIMAL(6,2) DEFAULT 0,
  carbs       DECIMAL(6,2) DEFAULT 0,
  fat         DECIMAL(6,2) DEFAULT 0,
  serving_size TEXT
);

-- ─── Meal Logs ─────────────────────────────────────────────
CREATE TABLE public.meal_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id),
  meal_id      UUID NOT NULL REFERENCES public.meals(id),
  completed    BOOLEAN DEFAULT FALSE,
  date         DATE NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_meal_logs_user_date ON public.meal_logs(user_id, date);

-- ─── Water Tracking ────────────────────────────────────────
CREATE TABLE public.water_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  amount_ml  INTEGER NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW(),
  date       DATE NOT NULL
);

CREATE INDEX idx_water_logs_user_date ON public.water_logs(user_id, date);

-- ─── Progress Tracking ─────────────────────────────────────
CREATE TABLE public.weight_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES public.profiles(id),
  weight_kg DECIMAL(5,2) NOT NULL,
  date      DATE NOT NULL,
  notes     TEXT
);

CREATE INDEX idx_weight_logs_user ON public.weight_logs(user_id);

CREATE TABLE public.body_measurements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id),
  date         DATE NOT NULL,
  chest_cm     DECIMAL(5,2),
  waist_cm     DECIMAL(5,2),
  hips_cm      DECIMAL(5,2),
  biceps_cm    DECIMAL(5,2),
  thighs_cm    DECIMAL(5,2),
  body_fat_pct DECIMAL(4,1)
);

CREATE TABLE public.progress_photos (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES public.profiles(id),
  photo_url TEXT NOT NULL,
  date      DATE NOT NULL,
  notes     TEXT
);

CREATE TABLE public.goals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  title         TEXT NOT NULL,
  description   TEXT,
  goal_type     TEXT CHECK (goal_type IN ('weight', 'strength', 'endurance', 'aesthetic', 'habit', 'other')),
  target_value  DECIMAL(10,2),
  current_value DECIMAL(10,2),
  unit          TEXT,
  deadline      DATE,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Schedule ──────────────────────────────────────────────
CREATE TABLE public.training_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id     UUID NOT NULL REFERENCES public.profiles(id),
  title        TEXT NOT NULL,
  description  TEXT,
  date         DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  week_day     TEXT CHECK (week_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  session_type TEXT CHECK (session_type IN ('presential', 'online')),
  max_students INTEGER DEFAULT 1,
  gym_id       UUID REFERENCES public.gyms(id)
);

CREATE INDEX idx_training_sessions_coach_date ON public.training_sessions(coach_id, date);

CREATE TABLE public.session_attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  status     TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'attended', 'missed', 'cancelled')),
  UNIQUE(session_id, student_id)
);

-- ─── Reviews ───────────────────────────────────────────────
CREATE TABLE public.reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id   UUID NOT NULL REFERENCES public.profiles(id),
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title      TEXT,
  body       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, user_id)
);

-- ─── Notifications ─────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  title      TEXT NOT NULL,
  body       TEXT,
  notif_type TEXT CHECK (notif_type IN ('workout_reminder', 'session_reminder', 'message', 'achievement', 'coach_update')),
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- ─── Row Level Security ────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

-- ─── Basic RLS Policies ────────────────────────────────────
-- Profiles: users can read any profile, update only their own
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Exercises: global exercises are readable by all, custom only by creator
CREATE POLICY "Anyone can read global exercises"
  ON public.exercises FOR SELECT USING (is_global = true OR created_by_user_id = auth.uid());

-- ─── Auto-update updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
