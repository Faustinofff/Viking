import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, RADIUS, FONT_SIZES, SPACING, ANIMATION } from "@viking/shared";

interface SetRowProps {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  previousWeightKg?: number;
  previousReps?: number;
  completed: boolean;
  onComplete: () => void;
}

export function SetRow({
  setNumber,
  reps,
  weightKg,
  previousWeightKg,
  previousReps,
  completed,
  onComplete,
}: SetRowProps) {
  const hasProgress =
    previousWeightKg !== undefined &&
    previousReps !== undefined &&
    (weightKg ?? 0) > previousWeightKg;

  return (
    <TouchableOpacity
      onPress={onComplete}
      activeOpacity={0.7}
      style={[styles.container, completed && styles.completed]}
    >
      <View
        style={[
          styles.checkbox,
          completed && styles.checkboxCompleted,
        ]}
      >
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>

      <Text style={[styles.setNumber, completed && styles.setNumberCompleted]}>
        Set {setNumber}
      </Text>

      <View style={styles.values}>
        {weightKg && (
          <Text style={[styles.value, completed && styles.valueCompleted]}>
            {weightKg} kg
          </Text>
        )}
        {reps && (
          <Text style={[styles.value, completed && styles.valueCompleted]}>
            × {reps}
          </Text>
        )}
      </View>

      {hasProgress && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: SPACING.md,
  },
  completed: {
    backgroundColor: "rgba(0, 212, 170, 0.06)",
    borderColor: "rgba(0, 212, 170, 0.15)",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCompleted: {
    backgroundColor: COLORS.accent.primary,
    borderColor: COLORS.accent.primary,
  },
  checkmark: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  setNumber: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text.tertiary,
    width: 50,
  },
  setNumberCompleted: {
    color: COLORS.accent.primary,
  },
  values: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  value: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text.primary,
  },
  valueCompleted: {
    color: COLORS.accent.primary,
  },
  prBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  prText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.status.warning,
    letterSpacing: 0.5,
  },
});
