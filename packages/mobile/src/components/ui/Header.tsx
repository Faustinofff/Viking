import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "@viking/shared";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "700",
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    lineHeight: 22,
  },
});
