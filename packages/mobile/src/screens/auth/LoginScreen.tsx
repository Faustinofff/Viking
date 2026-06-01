import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, FONT_SIZES, RADIUS } from "@viking/shared";
import { TextField } from "../../components/ui/TextField";
import { CtaButton } from "../../components/ui/CtaButton";
import { GlassCard } from "../../components/ui/GlassCard";

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandSection}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.title}>Viking</Text>
          <Text style={styles.subtitle}>
            Your premium fitness ecosystem
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <CtaButton
            title="Sign In"
            onPress={() => {}}
            style={{ marginTop: SPACING.md }}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity>
            <Text style={styles.signUpText}> Sign Up</Text>
          </TouchableOpacity>
        </View>
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
  },
  brandSection: {
    alignItems: "center",
    marginBottom: SPACING["5xl"],
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.accent.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text.inverse,
  },
  title: {
    fontSize: FONT_SIZES["4xl"],
    fontWeight: "800",
    color: COLORS.text.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  form: {
    gap: SPACING.lg,
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent.primary,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  dividerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  socialText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text.primary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING["4xl"],
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
  },
  signUpText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent.primary,
    fontWeight: "600",
  },
});
