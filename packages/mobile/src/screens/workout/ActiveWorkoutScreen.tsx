import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, FONT_SIZES, RADIUS } from "@viking/shared";
import { ExerciseItem } from "../../components/workout/ExerciseItem";
import { RestTimer } from "../../components/workout/RestTimer";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { CtaButton } from "../../components/ui/CtaButton";

const MOCK_EXERCISES = [
  {
    name: "Bench Press",
    muscleGroup: "Chest",
    sets: [
      { setNumber: 1, reps: 10, weightKg: 60, completed: true },
      { setNumber: 2, reps: 10, weightKg: 60, completed: true },
      { setNumber: 3, reps: 8, weightKg: 65, completed: false },
    ],
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroup: "Chest",
    sets: [
      { setNumber: 1, reps: 12, weightKg: 24, completed: false },
      { setNumber: 2, reps: 12, weightKg: 24, completed: false },
      { setNumber: 3, reps: 10, weightKg: 26, completed: false },
    ],
  },
];

export default function ActiveWorkoutScreen() {
  const [resting, setResting] = useState(false);

  const totalSets = MOCK_EXERCISES.reduce(
    (sum, ex) => sum + ex.sets.length,
    0
  );
  const completedSets = MOCK_EXERCISES.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = (completedSets / totalSets) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Push Day</Text>
          <Text style={styles.headerSub}>
            {completedSets}/{totalSets} sets
          </Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      </View>

      <ProgressBar progress={progress} height={2} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {resting && (
          <RestTimer
            initialSeconds={90}
            onSkip={() => setResting(false)}
            onComplete={() => setResting(false)}
          />
        )}

        {MOCK_EXERCISES.map((exercise) => (
          <ExerciseItem
            key={exercise.name}
            {...exercise}
            onPress={() => setResting(true)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <CtaButton
          title="Complete Workout"
          onPress={() => {}}
          variant={progress >= 100 ? "primary" : "secondary"}
          disabled={progress < 100}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  closeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.tertiary,
    fontWeight: "500",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text.primary,
  },
  headerSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.accent.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: 4,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: SPACING["2xl"],
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
});
