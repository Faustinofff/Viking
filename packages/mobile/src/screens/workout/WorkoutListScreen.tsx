import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "@viking/shared";
import { ScreenLayout } from "../../components/ui/ScreenLayout";
import { Header } from "../../components/ui/Header";
import { WorkoutCard } from "../../components/workout/WorkoutCard";
import { GlassCard } from "../../components/ui/GlassCard";

const MOCK_WORKOUTS = [
  {
    id: "1",
    name: "Push Day",
    dayName: "Monday",
    exercises: 6,
    completedSets: 15,
    totalSets: 18,
    duration: "~50 min",
  },
  {
    id: "2",
    name: "Pull Day",
    dayName: "Wednesday",
    exercises: 7,
    completedSets: 0,
    totalSets: 21,
    duration: "~55 min",
  },
  {
    id: "3",
    name: "Leg Day",
    dayName: "Friday",
    exercises: 5,
    completedSets: 0,
    totalSets: 15,
    duration: "~45 min",
  },
];

export default function WorkoutListScreen() {
  return (
    <ScreenLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header
          title="Workouts"
          subtitle="Today is Push Day — ready to train?"
        />

        <View style={styles.statsRow}>
          <GlassCard padding={12} style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </GlassCard>
          <GlassCard padding={12} style={styles.statCard}>
            <Text style={styles.statValue}>5/6</Text>
            <Text style={styles.statLabel}>Last Week</Text>
          </GlassCard>
          <GlassCard padding={12} style={styles.statCard}>
            <Text style={styles.statValue}>92%</Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>This Week</Text>

        {MOCK_WORKOUTS.map((w) => (
          <WorkoutCard
            key={w.id}
            {...w}
            onPress={() => {}}
          />
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
    marginBottom: SPACING["2xl"],
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: FONT_SIZES["2xl"],
    fontWeight: "700",
    color: COLORS.accent.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
