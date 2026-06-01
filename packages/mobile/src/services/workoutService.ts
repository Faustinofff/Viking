import { supabase } from "./supabase";
import type {
  WorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  ExerciseSet,
  WorkoutSession,
  SetLog,
} from "@viking/shared";

export const workoutService = {
  async getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
    const { data, error } = await supabase
      .from("workout_plans")
      .select("*")
      .or(`student_id.eq.${userId},coach_id.eq.${userId},is_template.eq.true`);

    if (error) throw error;
    return data ?? [];
  },

  async getWorkoutDays(planId: string): Promise<WorkoutDay[]> {
    const { data, error } = await supabase
      .from("workout_days")
      .select("*")
      .eq("plan_id", planId)
      .order("week_number")
      .order("sort_order");

    if (error) throw error;
    return data ?? [];
  },

  async getWorkoutExercises(dayId: string): Promise<WorkoutExercise[]> {
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("*, exercise:exercises(*)")
      .eq("workout_day_id", dayId)
      .order("sort_order");

    if (error) throw error;
    return data ?? [];
  },

  async getExerciseSets(exerciseId: string): Promise<ExerciseSet[]> {
    const { data, error } = await supabase
      .from("exercise_sets")
      .select("*")
      .eq("workout_exercise_id", exerciseId)
      .order("set_number");

    if (error) throw error;
    return data ?? [];
  },

  async startSession(session: Omit<WorkoutSession, "id">): Promise<WorkoutSession> {
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeSet(log: Omit<SetLog, "id">): Promise<SetLog> {
    const { data, error } = await supabase
      .from("set_logs")
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeSession(
    sessionId: string,
    durationSeconds: number
  ): Promise<void> {
    await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_duration_seconds: durationSeconds,
      })
      .eq("id", sessionId);
  },
};
