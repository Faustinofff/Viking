import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { COLORS, RADIUS, FONT_SIZES, SPACING } from "@viking/shared";

interface CtaButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function CtaButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
}: CtaButtonProps) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  const height = size === "sm" ? 36 : size === "lg" ? 52 : 44;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          height,
          borderRadius: RADIUS.md,
          paddingHorizontal: size === "sm" ? 12 : SPACING.xl,
          width: fullWidth ? "100%" : undefined,
        },
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isGhost ? COLORS.accent.primary : "#FFFFFF"}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize },
            isPrimary && styles.textPrimary,
            isSecondary && styles.textSecondary,
            isGhost && styles.textGhost,
            isDanger && styles.textDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: COLORS.accent.primary,
  },
  secondary: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  textPrimary: {
    color: COLORS.text.inverse,
  },
  textSecondary: {
    color: COLORS.text.primary,
  },
  textGhost: {
    color: COLORS.accent.primary,
  },
  textDanger: {
    color: COLORS.status.error,
  },
});
