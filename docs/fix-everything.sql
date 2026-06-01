-- ============================================================
-- VIKING — Complete Fix: seed exercises, fix FK, disable RLS
-- Run ALL of this in Supabase SQL Editor
-- ============================================================

-- 1. Disable RLS on tables that lack policies (dev only)
ALTER TABLE public.workout_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans DISABLE ROW LEVEL SECURITY;

-- 2. Drop problematic FK: exercise_id points to exercises table which may be empty
ALTER TABLE public.workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_exercise_id_fkey;
ALTER TABLE public.coach_exercise_content DROP CONSTRAINT IF EXISTS coach_exercise_content_exercise_id_fkey;

-- 3. Seed the exercises table with the global exercises
INSERT INTO public.exercises (id, name, muscle_groups, equipment, difficulty, exercise_type, is_global, created_at)
VALUES
  ('e1', 'Press Banca', ARRAY['Pecho'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e2', 'Press Banca Inclinado', ARRAY['Pecho'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e3', 'Press Banca Declinado', ARRAY['Pecho'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e4', 'Aperturas con Mancuernas', ARRAY['Pecho'], ARRAY['Mancuerna'], 'intermediate', 'strength', true, NOW()),
  ('e5', 'Pull Up', ARRAY['Espalda'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e6', 'Remo con Barra', ARRAY['Espalda'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e7', 'Remo en Máquina', ARRAY['Espalda'], ARRAY['Máquina'], 'intermediate', 'strength', true, NOW()),
  ('e8', 'Jalón al Pecho', ARRAY['Espalda'], ARRAY['Cable'], 'intermediate', 'strength', true, NOW()),
  ('e9', 'Press Militar', ARRAY['Hombros'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e10', 'Elevaciones Laterales', ARRAY['Hombros'], ARRAY['Mancuerna'], 'intermediate', 'strength', true, NOW()),
  ('e11', 'Elevaciones Frontales', ARRAY['Hombros'], ARRAY['Mancuerna'], 'intermediate', 'strength', true, NOW()),
  ('e12', 'Curl con Barra', ARRAY['Bíceps'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e13', 'Curl con Mancuernas', ARRAY['Bíceps'], ARRAY['Mancuerna'], 'intermediate', 'strength', true, NOW()),
  ('e14', 'Curl Martillo', ARRAY['Bíceps'], ARRAY['Mancuerna'], 'intermediate', 'strength', true, NOW()),
  ('e15', 'Press Francés', ARRAY['Tríceps'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e16', 'Jalón de Tríceps', ARRAY['Tríceps'], ARRAY['Cable'], 'intermediate', 'strength', true, NOW()),
  ('e17', 'Sentadilla', ARRAY['Cuádriceps'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e18', 'Prensa', ARRAY['Cuádriceps'], ARRAY['Máquina'], 'intermediate', 'strength', true, NOW()),
  ('e19', 'Peso Muerto', ARRAY['Espalda'], ARRAY['Barra'], 'intermediate', 'strength', true, NOW()),
  ('e20', 'Curl Femoral', ARRAY['Isquiotibiales'], ARRAY['Máquina'], 'intermediate', 'strength', true, NOW()),
  ('e21', 'Elevación de Talones', ARRAY['Gemelos'], ARRAY['Máquina'], 'intermediate', 'strength', true, NOW()),
  ('e22', 'Plancha', ARRAY['Abdomen'], ARRAY['Bodyweight'], 'intermediate', 'strength', true, NOW()),
  ('e23', 'Crunches', ARRAY['Abdomen'], ARRAY['Bodyweight'], 'intermediate', 'strength', true, NOW()),
  ('e24', 'Elevación de Piernas', ARRAY['Abdomen'], ARRAY['Bodyweight'], 'intermediate', 'strength', true, NOW()),
  ('e25', 'Zancadas', ARRAY['Cuádriceps'], ARRAY['Mancuerna'], 'intermediate', 'strength', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Do NOT re-add FK — custom exercises use dynamic IDs not in the exercises table.
--    The FK was useful for production but blocks dev with mock data.
