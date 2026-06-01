import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, RADIUS, FONT_SIZES, SPACING, SHADOWS } from "@viking/shared";
import { GlassCard } from "../ui/GlassCard";
import { ProgressBar } from "../ui/ProgressBar";

interface WorkoutCardProps {
  name: string;
  dayName: string;
  exercises: number;
  completedSets?: number;
  totalSets?: number;
  duration?: string;
  onPress: () => void;
}

export function WorkoutCard({
  name,
  dayName,
  exercises,
  completedSets = 0,
  totalSets = 0,
  duration,
  onPress,
}: WorkoutCardProps) {
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const isComplete = progress >= 100;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard variant={isComplete ? "glow" : "elevated"} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{dayName}</Text>
          </View>
          {duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{name}</Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {exercises} exercises
          </Text>
          {totalSets > 0 && (
            <Text style={styles.metaText}>
              {completedSets}/{totalSets} sets
            </Text>
          )}
        </View>

        {totalSets > 0 && (
          <View style={styles.progressSection}>
            <ProgressBar progress={progress} height={3} />
            <Text style={styles.progressText}>
              {isComplete ? "Complete" : `${Math.round(progress)}%`}
            </Text>
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  badge: {
    backgroundColor: "rgba(0, 212, 170, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    color: COLORS.accent.primary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  durationBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  durationText: {
    color: COLORS.text.tertiary,
    fontSize: 11,
    fontWeight: "500",
  },
  name: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  meta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: SPACING.md,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent.primary,
    fontWeight: "600",
    width: 50,
    textAlign: "right",
  },
});
