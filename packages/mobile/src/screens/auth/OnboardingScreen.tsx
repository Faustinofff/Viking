import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, FONT_SIZES, RADIUS } from "@viking/shared";
import { GlassCard } from "../../components/ui/GlassCard";
import { CtaButton } from "../../components/ui/CtaButton";
import type { UserRole } from "@viking/shared";

const ROLES: { value: UserRole; title: string; description: string; icon: string }[] = [
  {
    value: "independent",
    title: "Independent",
    description: "Train on your own — create routines, track progress, and stay motivated.",
    icon: "💪",
  },
  {
    value: "student",
    title: "Student",
    description: "Follow a coach's program — get assigned workouts, meal plans, and guidance.",
    icon: "🎯",
  },
  {
    value: "coach",
    title: "Coach / PT",
    description: "Manage students, create plans, and grow your training business.",
    icon: "🏆",
  },
];

export default function OnboardingScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Viking</Text>
          <Text style={styles.subtitle}>
            Choose how you want to use the app
          </Text>
        </View>

        <View style={styles.roles}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.value}
              onPress={() => setSelectedRole(role.value)}
              activeOpacity={0.7}
            >
              <GlassCard
                variant={selectedRole === role.value ? "glow" : "default"}
                style={[
                  styles.roleCard,
                  selectedRole === role.value && styles.roleCardSelected,
                ]}
              >
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>
                    {role.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedRole === role.value && styles.radioSelected,
                  ]}
                >
                  {selectedRole === role.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        <CtaButton
          title="Continue"
          onPress={() => {}}
          disabled={!selectedRole}
        />

        <TouchableOpacity style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING["2xl"],
    justifyContent: "center",
    gap: SPACING["3xl"],
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "800",
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  roles: {
    gap: SPACING.md,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
  },
  roleCardSelected: {},
  roleIcon: {
    fontSize: 32,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text.primary,
  },
  roleDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
    marginTop: 2,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: COLORS.accent.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent.primary,
  },
  skipButton: {
    alignItems: "center",
  },
  skipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
  },
});
