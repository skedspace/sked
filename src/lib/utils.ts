import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeStyle: "short",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type RgbTuple = [number, number, number];

function hexToRgb(hex: string): RgbTuple {
  const clean = hex.replace("#", "");
  const num = Number.parseInt(clean, 16);
  if (clean.length === 3) {
    const r = ((num >> 8) & 0xf) * 17;
    const g = ((num >> 4) & 0xf) * 17;
    const b = (num & 0xf) * 17;
    return [r, g, b];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Calculate WCAG relative luminance from an sRGB channel value (0-255).
 */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Given a hex color, return either "#171a16" (ink) or "#ffffff" (white)
 * depending on the color's luminance, ensuring readable contrast.
 */
export function getContrastText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  return luminance > 0.179 ? "#171a16" : "#ffffff";
}
