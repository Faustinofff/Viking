import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, RADIUS, FONT_SIZES, SPACING } from "@viking/shared";
import { GlassCard } from "../ui/GlassCard";

interface RestTimerProps {
  initialSeconds: number;
  onSkip: () => void;
  onComplete: () => void;
}

export function RestTimer({
  initialSeconds,
  onSkip,
  onComplete,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = (remaining / initialSeconds) * 100;
  const isLow = remaining <= 5;

  return (
    <GlassCard variant="glow" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>REST</Text>
        <TouchableOpacity onPress={onSkip}>
          <Text style={styles.skipText}>Skip →</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.timer, isLow && styles.timerLow]}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </Text>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${progress}%` },
            isLow && styles.barFillLow,
          ]}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.accent.primary,
    letterSpacing: 2,
  },
  skipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
    fontWeight: "500",
  },
  timer: {
    fontSize: 56,
    fontWeight: "200",
    color: COLORS.text.primary,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
    marginBottom: SPACING.lg,
  },
  timerLow: {
    color: COLORS.accent.primary,
  },
  barTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.full,
  },
  barFillLow: {
    backgroundColor: COLORS.accent.primary,
    opacity: 0.8,
  },
});
