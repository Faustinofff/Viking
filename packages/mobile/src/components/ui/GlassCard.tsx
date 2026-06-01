import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { COLORS, RADIUS } from "@viking/shared";

interface GlassCardProps extends ViewProps {
  variant?: "default" | "elevated" | "glow";
  padding?: number;
}

export function GlassCard({
  variant = "default",
  padding = 16,
  style,
  children,
  ...props
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === "elevated" && styles.elevated,
        variant === "glow" && styles.glow,
        { padding },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(20px)",
  },
  elevated: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    borderColor: "rgba(0, 212, 170, 0.2)",
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
});
