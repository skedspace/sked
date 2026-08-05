import { describe, it, expect } from "vitest";
import {
  PUBLIC_PAGE_THEMES,
  getPublicPageTheme,
  type ResolvedPublicPageTheme,
} from "./public-page";

/** WCAG relative luminance for an `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = Number.parseInt(c.substr(i, 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colours. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * These tokens are consumed as CSS custom property values. A custom property
 * containing an undefined var() computes to the empty string, which silently
 * drops the value rather than falling back — so the font stacks in particular
 * must stay concrete.
 */
describe("public page themes", () => {
  it("exposes every theme with a stable id", () => {
    const ids = PUBLIC_PAGE_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("default");
  });

  it("falls back to the first theme for an unknown id", () => {
    expect(getPublicPageTheme("no-such-theme").id).toBe("default");
    expect(getPublicPageTheme(null).id).toBe("default");
  });

  it("never emits a font stack containing an undefined custom property", () => {
    for (const theme of PUBLIC_PAGE_THEMES) {
      const resolved = getPublicPageTheme(theme.id);
      expect(resolved.headingFont).not.toContain("var(");
      expect(resolved.bodyFont).not.toContain("var(");
      expect(resolved.headingFont.length).toBeGreaterThan(0);
    }
  });

  it("resolves the four palette slots for every theme", () => {
    for (const theme of PUBLIC_PAGE_THEMES) {
      const t = getPublicPageTheme(theme.id);
      for (const key of ["primary", "ink", "paper", "muted"] as const) {
        expect(t[key], `${theme.id}.${key}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("lets an explicit primary colour override the palette", () => {
    const t = getPublicPageTheme("default", "#ff0000");
    expect(t.primary).toBe("#ff0000");
    // Overriding the accent must not disturb the surrounding surfaces.
    expect(t.paper).toBe(PUBLIC_PAGE_THEMES[0]!.colors[2]);
  });

  it("ignores an empty primary colour and keeps the theme default", () => {
    expect(getPublicPageTheme("default", "").primary).toBe(
      PUBLIC_PAGE_THEMES[0]!.colors[0],
    );
  });

  it("derives translucent border and subtle-ink tokens from ink", () => {
    const t = getPublicPageTheme("default");
    expect(t.border).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/);
    expect(t.subtleInk).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/);
  });

  it("gives dark themes a translucent card instead of white", () => {
    const dark = PUBLIC_PAGE_THEMES.filter((t) => t.dark);
    expect(dark.length).toBeGreaterThan(0);
    for (const theme of dark) {
      expect(getPublicPageTheme(theme.id).card).toMatch(/^rgba\(/);
    }
    expect(getPublicPageTheme("default").card).toBe("#ffffff");
  });

  it("maps each radius step to distinct card and control values", () => {
    const byRadius = new Map<string, ResolvedPublicPageTheme>();
    for (const theme of PUBLIC_PAGE_THEMES) {
      byRadius.set(theme.radius, getPublicPageTheme(theme.id));
    }
    expect(byRadius.get("sharp")?.cardRadius).toBe("0px");
    expect(byRadius.get("round")?.controlRadius).toBe("9999px");
    expect(byRadius.get("soft")?.cardRadius).not.toBe("0px");
  });

  it("keeps body text readable on every theme's own background", () => {
    // Phase 6 (T-6.4.3) committed the storefront to WCAG AA. The original
    // "Night Match" palette shipped ink #1c1917 on paper #34302c — 1.34:1,
    // near-black on dark grey — because a dark theme needs the LIGHT value as
    // ink. This locks that class of inversion out of every theme.
    for (const theme of PUBLIC_PAGE_THEMES) {
      const t = getPublicPageTheme(theme.id);
      const ratio = contrastRatio(t.ink, t.paper);
      expect(ratio, `${theme.id}: ink on paper is ${ratio.toFixed(2)}:1`).
        toBeGreaterThanOrEqual(4.5);
    }
  });

  it("marks a theme dark only when its paper really is dark", () => {
    for (const theme of PUBLIC_PAGE_THEMES) {
      const t = getPublicPageTheme(theme.id);
      expect(relativeLuminance(t.paper) < 0.2, `${theme.id}.dark`).toBe(t.dark);
    }
  });

  it("offers genuinely different looks, not just recoloured ones", () => {
    const shapes = PUBLIC_PAGE_THEMES.map(
      (t) => `${t.headingFont}|${t.radius}|${t.surface}|${t.hero}`,
    );
    // If every theme collapsed to one shape, the picker would only swap colour.
    expect(new Set(shapes).size).toBeGreaterThan(1);
    expect(PUBLIC_PAGE_THEMES.some((t) => t.hero === "centered")).toBe(true);
    expect(PUBLIC_PAGE_THEMES.some((t) => t.headingFont.includes("serif"))).toBe(
      true,
    );
  });
});
