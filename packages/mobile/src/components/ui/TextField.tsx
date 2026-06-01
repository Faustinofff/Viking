import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { COLORS, RADIUS, FONT_SIZES, SPACING } from "@viking/shared";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

export function TextField({
  label,
  error,
  helper,
  style,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.text.tertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {helper && !error && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text.secondary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: SPACING.lg,
    height: 48,
    justifyContent: "center",
  },
  inputFocused: {
    borderColor: COLORS.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.05)",
  },
  inputError: {
    borderColor: COLORS.status.error,
  },
  input: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.primary,
  },
  error: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.status.error,
  },
  helper: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
});
