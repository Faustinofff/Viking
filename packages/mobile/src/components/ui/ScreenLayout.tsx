import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "@viking/shared";

interface ScreenLayoutProps extends ViewProps {
  safe?: boolean;
  padded?: boolean;
}

export function ScreenLayout({
  safe = true,
  padded = true,
  style,
  children,
  ...props
}: ScreenLayoutProps) {
  const Container = safe ? SafeAreaView : View;

  return (
    <Container style={[styles.container, padded && styles.padded, style]} {...props}>
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  padded: {
    paddingHorizontal: SPACING.lg,
  },
});
