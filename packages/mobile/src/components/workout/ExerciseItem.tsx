import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, RADIUS, FONT_SIZES, SPACING } from "@viking/shared";

interface SetDisplay {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  completed: boolean;
}

interface ExerciseItemProps {
  name: string;
  muscleGroup?: string;
  sets: SetDisplay[];
  onPress: () => void;
}

export function ExerciseItem({
  name,
  muscleGroup,
  sets,
  onPress,
}: ExerciseItemProps) {
  const completedSets = sets.filter((s) => s.completed).length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.container}>
        <View style={styles.main}>
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            {muscleGroup && (
              <Text style={styles.muscle}>{muscleGroup}</Text>
            )}
          </View>
          <View style={styles.setsPreview}>
            <Text style={styles.setsCount}>
              {completedSets}/{sets.length}
            </Text>
            <Text style={styles.setsLabel}>sets</Text>
          </View>
        </View>

        <View style={styles.setRow}>
          {sets.map((set) => (
            <View
              key={set.setNumber}
              style={[
                styles.setPill,
                set.completed && styles.setPillCompleted,
              ]}
            >
              <Text
                style={[
                  styles.setPillText,
                  set.completed && styles.setPillTextCompleted,
                ]}
              >
                {set.weightKg ? `${set.weightKg}kg` : `${set.reps ?? 0}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  main: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text.primary,
  },
  muscle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  setsPreview: {
    alignItems: "flex-end",
  },
  setsCount: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.accent.primary,
  },
  setsLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
  setRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  setPill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  setPillCompleted: {
    backgroundColor: "rgba(0, 212, 170, 0.12)",
    borderColor: "rgba(0, 212, 170, 0.2)",
  },
  setPillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  setPillTextCompleted: {
    color: COLORS.accent.primary,
  },
});
