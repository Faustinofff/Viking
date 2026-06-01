import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "@viking/shared";

interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
}

export function ProgressBar({
  progress,
  height = 4,
  color = COLORS.accent.primary,
  trackColor = "rgba(255, 255, 255, 0.06)",
}: ProgressBarProps) {
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(progress, 100)}%`,
            height,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: RADIUS.full,
  },
});
