-- ============================================================
-- VIKING — RLS Fix for Development
-- Run this in Supabase SQL Editor if students can't see exercises
-- ============================================================

-- Option A: Disable RLS on tables that lack policies (dev only)
ALTER TABLE public.workout_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans DISABLE ROW LEVEL SECURITY;

-- Add missing INSERT policies for tables that still need RLS
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());

-- Coach-students: allow all authenticated users to read/write
ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach students are fully accessible"
  ON public.coach_students FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify: list all tables with RLS still enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
