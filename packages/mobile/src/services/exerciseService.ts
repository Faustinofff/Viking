import { supabase } from "./supabase";
import type { Exercise, CoachExerciseContent } from "@viking/shared";

export const exerciseService = {
  async getGlobalExercises(search?: string): Promise<Exercise[]> {
    let query = supabase
      .from("exercises")
      .select("*")
      .eq("is_global", true);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getCoachExercises(coachId: string): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("created_by_user_id", coachId);

    if (error) throw error;
    return data ?? [];
  },

  async getCoachExerciseContent(
    coachId: string,
    exerciseId: string
  ): Promise<CoachExerciseContent | null> {
    const { data, error } = await supabase
      .from("coach_exercise_content")
      .select("*")
      .eq("coach_id", coachId)
      .eq("exercise_id", exerciseId)
      .single();

    if (error) return null;
    return data;
  },

  async createCustomExercise(
    exercise: Omit<Exercise, "id">
  ): Promise<Exercise> {
    const { data, error } = await supabase
      .from("exercises")
      .insert(exercise)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveCoachContent(
    content: Omit<CoachExerciseContent, "id">
  ): Promise<CoachExerciseContent> {
    const { data, error } = await supabase
      .from("coach_exercise_content")
      .upsert(content, {
        onConflict: "coach_id,exercise_id",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
