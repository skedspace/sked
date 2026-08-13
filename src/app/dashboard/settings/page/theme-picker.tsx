"use client";

import { Check } from "lucide-react";
import {
  PUBLIC_PAGE_THEMES,
  getPublicPageTheme,
  type ResolvedPublicPageTheme,
} from "@/lib/public-page";

/**
 * Visual theme picker for the Page Design tab.
 *
 * A dropdown of theme names could not communicate what the themes now differ
 * by — type, corner radius, surface treatment and hero composition — so each
 * option renders a miniature of its own storefront using its own tokens.
 */

function ThemeTile({
  theme,
  selected,
  onSelect,
}: {
  theme: ResolvedPublicPageTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const centered = theme.hero === "centered";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${theme.label} theme — ${theme.description}`}
      className="group relative block w-full overflow-hidden text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        borderRadius: theme.cardRadius === "9999px" ? "1rem" : theme.cardRadius,
        border: selected
          ? `2px solid ${theme.primary}`
          : "1px solid rgba(0,0,0,0.12)",
        boxShadow: selected ? `0 0 0 3px ${theme.primary}33` : undefined,
      }}
    >
      {/* Miniature storefront rendered in the theme's own tokens. */}
      <div style={{ backgroundColor: theme.paper }}>
        {/* Hero band */}
        <div
          className="px-3 py-3"
          style={{ backgroundColor: theme.ink }}
        >
          <div
            className={`flex items-center gap-1.5 ${centered ? "justify-center" : ""}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: theme.primary }}
            />
            <span
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color: theme.paper, fontFamily: theme.headingFont }}
            >
              {theme.label}
            </span>
          </div>
          <div
            className={`mt-1.5 h-1 rounded-full ${centered ? "mx-auto w-1/2" : "w-3/4"}`}
            style={{ backgroundColor: theme.primary, opacity: 0.85 }}
          />
        </div>

        {/* Body: two cards showing radius + surface treatment */}
        <div className="flex gap-1.5 px-2.5 py-2.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-8 flex-1"
              style={{
                backgroundColor:
                  theme.surface === "flat" ? "transparent" : theme.card,
                border:
                  theme.surface === "flat"
                    ? "1px solid transparent"
                    : `1px solid ${theme.border}`,
                borderRadius:
                  theme.cardRadius === "9999px" ? "0.75rem" : theme.cardRadius,
                boxShadow:
                  theme.surface === "elevated"
                    ? "0 4px 10px rgba(0,0,0,0.10)"
                    : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {selected && (
        <span
          className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full"
          style={{ backgroundColor: theme.primary }}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3.5} color="#fff" />
        </span>
      )}
    </button>
  );
}

export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  /** Receives the theme id and that theme's default accent colour. */
  onChange: (themeId: string, primaryColor: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-black text-[#171a16]">Theme</span>
      <div className="grid grid-cols-2 gap-2.5">
        {PUBLIC_PAGE_THEMES.map((option) => {
          const resolved = getPublicPageTheme(option.id);
          return (
            <ThemeTile
              key={option.id}
              theme={resolved}
              selected={option.id === value}
              onSelect={() => onChange(option.id, option.colors[0]!)}
            />
          );
        })}
      </div>
    </div>
  );
}
