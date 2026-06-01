import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "@viking/shared";
import { ScreenLayout } from "../../components/ui/ScreenLayout";
import { Header } from "../../components/ui/Header";
import { GlassCard } from "../../components/ui/GlassCard";
import { ProgressBar } from "../../components/ui/ProgressBar";

export default function ProgressScreen() {
  return (
    <ScreenLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header title="Progress" subtitle="Track your transformation" />

        <GlassCard variant="elevated" style={styles.weightCard}>
          <Text style={styles.weightValue}>78.5</Text>
          <Text style={styles.weightUnit}>kg</Text>
          <Text style={styles.weightChange}>−2.3 kg this month</Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>Adherence</Text>
        <GlassCard style={styles.adherenceCard}>
          {[
            { label: "Workouts", value: 92 },
            { label: "Nutrition", value: 78 },
            { label: "Water", value: 85 },
          ].map((item) => (
            <View key={item.label} style={styles.adherenceRow}>
              <Text style={styles.adherenceLabel}>{item.label}</Text>
              <Text style={styles.adherenceValue}>{item.value}%</Text>
              <View style={styles.adherenceBarContainer}>
                <ProgressBar
                  progress={item.value}
                  height={4}
                  color={
                    item.value >= 85
                      ? COLORS.accent.primary
                      : item.value >= 70
                        ? COLORS.status.warning
                        : COLORS.status.error
                  }
                />
              </View>
            </View>
          ))}
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  weightCard: {
    alignItems: "center",
    paddingVertical: SPACING["2xl"],
    marginBottom: SPACING.xl,
  },
  weightValue: {
    fontSize: 56,
    fontWeight: "200",
    color: COLORS.text.primary,
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.tertiary,
    marginTop: -8,
  },
  weightChange: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent.primary,
    fontWeight: "500",
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  adherenceCard: {
    gap: SPACING.lg,
  },
  adherenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adherenceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    width: 80,
  },
  adherenceValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text.primary,
    width: 40,
    textAlign: "right",
  },
  adherenceBarContainer: {
    flex: 1,
  },
});
