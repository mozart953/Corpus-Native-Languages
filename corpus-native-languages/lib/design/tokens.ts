/**
 * Design token contract (frontend).
 *
 * SRP: this module only describes the design system contract and helpers.
 * Token values live in `app/design-tokens.css` (single runtime source of truth).
 *
 * DIP/input-output: UI code depends on these semantic names/helpers instead of
 * hardcoding CSS variable strings or color values. To change the theme, update
 * the CSS token file; consumers keep using the same contract.
 */

export const cssVar = (name: string) => `var(${name})`;

export const designTokens = {
  color: {
    bg: "--nl-bg",
    bgElevated: "--nl-bg-elevated",
    surface: "--nl-surface",
    surface2: "--nl-surface-2",
    surface3: "--nl-surface-3",
    surfaceHover: "--nl-surface-hover",
    surfaceActive: "--nl-surface-active",
    border: "--nl-border",
    borderHover: "--nl-border-hover",
    borderFocus: "--nl-border-focus",
    text: "--nl-text",
    textStrong: "--nl-white",
    textMuted: "--nl-muted",
    textFaint: "--nl-faint",
  },
  button: {
    bg: "--nl-btn-bg",
    bgHover: "--nl-btn-bg-hover",
    bgActive: "--nl-btn-bg-active",
    border: "--nl-btn-border",
    borderHover: "--nl-btn-border-hover",
    text: "--nl-btn-text",
    primaryBg: "--nl-btn-primary-bg",
    primaryBgHover: "--nl-btn-primary-bg-hover",
    primaryBgActive: "--nl-btn-primary-bg-active",
    primaryText: "--nl-btn-primary-text",
    primaryBorder: "--nl-btn-primary-border",
  },
  glass: {
    bg: "--nl-glass-bg",
    bgStrong: "--nl-glass-bg-strong",
    blur: "--nl-glass-blur",
    border: "--nl-glass-border",
  },
  status: {
    danger: "--nl-danger",
    dangerSoft: "--nl-danger-soft",
    success: "--nl-success",
    successSoft: "--nl-success-soft",
    warning: "--nl-warning",
    warningSoft: "--nl-warning-soft",
    info: "--nl-info",
    infoSoft: "--nl-info-soft",
  },
  focusRing: "--nl-ring",
} as const;

export type DesignTokens = typeof designTokens;
