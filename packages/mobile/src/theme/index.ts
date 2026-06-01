import { COLORS, SPACING, RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from "@viking/shared";

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  fontSize: FONT_SIZES,
  fontWeight: FONT_WEIGHTS,
  shadows: SHADOWS,
} as const;

export type Theme = typeof theme;
