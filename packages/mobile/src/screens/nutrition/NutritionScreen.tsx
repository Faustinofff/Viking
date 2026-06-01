import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "@viking/shared";
import { ScreenLayout } from "../../components/ui/ScreenLayout";
import { Header } from "../../components/ui/Header";
import { GlassCard } from "../../components/ui/GlassCard";

export default function NutritionScreen() {
  return (
    <ScreenLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header title="Nutrition" subtitle="Track your meals and stay on target" />

        <View style={styles.statsRow}>
          <GlassCard padding={16} style={styles.macroCard}>
            <Text style={styles.macroValue}>1,842</Text>
            <Text style={styles.macroLabel}>Calories</Text>
            <Text style={styles.macroGoal}>/ 2,200</Text>
          </GlassCard>
          <GlassCard padding={16} style={styles.macroCard}>
            <Text style={styles.macroValue}>142g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroGoal}>/ 180g</Text>
          </GlassCard>
        </View>

        <View style={styles.statsRow}>
          <GlassCard padding={16} style={styles.macroCard}>
            <Text style={styles.macroValue}>198g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroGoal}>/ 250g</Text>
          </GlassCard>
          <GlassCard padding={16} style={styles.macroCard}>
            <Text style={styles.macroValue}>42g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroGoal}>/ 60g</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>Today's Meals</Text>

        {["Breakfast", "Lunch", "Dinner", "Snacks"].map((meal) => (
          <GlassCard key={meal} variant="default" style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealName}>{meal}</Text>
              <View style={styles.mealStatus}>
                <Text style={styles.mealStatusText}>Pending</Text>
              </View>
            </View>
            <Text style={styles.mealMacros}>0g P · 0g C · 0g F · 0 cal</Text>
          </GlassCard>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  macroCard: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
    color: COLORS.text.primary,
  },
  macroLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  macroGoal: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mealCard: {
    marginBottom: SPACING.sm,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text.primary,
  },
  mealStatus: {
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mealStatusText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.status.warning,
  },
  mealMacros: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
});
