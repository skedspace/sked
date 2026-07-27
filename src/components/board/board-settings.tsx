"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAllLayouts,
  type MosaicLayoutDef,
  PANEL_LABELS,
  PANEL_ICONS,
} from "@/components/board/board-layouts";

/* ── Props ── */

interface BoardSettingsProps {
  orgId: string;
}

/* ── Preset card ── */

function PresetCard({
  layout,
  orgId,
}: {
  layout: MosaicLayoutDef;
  orgId: string;
}) {
  const [copied, setCopied] = useState(false);

  // Relative at render time — window is not available during SSR
  const boardPath = `/board/${orgId}/multi/${layout.id}`;

  const handleCopy = async () => {
    const boardUrl = `${window.location.origin}${boardPath}`;
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("input");
      el.value = boardUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-bold text-[#151713]">{layout.name}</h3>
          <p className="mt-0.5 text-sm text-[#5d615b]">{layout.description}</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8a8f89]">
          {layout.columns}C · {layout.panels.length}P
        </span>
      </div>

      {/* Panel preview chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {layout.panels.map((panel, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-[#f3f3ef] px-2.5 py-1 text-[11px] font-medium text-[#5d615b]"
          >
            <span className="text-xs">{PANEL_ICONS[panel.type]}</span>
            {PANEL_LABELS[panel.type]}
            {panel.colSpan && panel.colSpan > 1 && (
              <span className="text-[10px] text-[#8a8f89]">x{panel.colSpan}</span>
            )}
            {panel.rowSpan && panel.rowSpan > 1 && (
              <span className="text-[10px] text-[#8a8f89]">↓{panel.rowSpan}</span>
            )}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(boardPath, "_blank")}
          className="flex items-center gap-1.5 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-[#5d615b]"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[#367b20]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied!" : "Copy URL"}
        </Button>
      </div>
    </div>
  );
}

/* ── Component ── */

export function BoardSettings({ orgId }: BoardSettingsProps) {
  const layouts = getAllLayouts();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#151713]">
          Board Settings
        </h1>
        <p className="mt-1 text-sm text-[#5d615b]">
          Configure multi-board layouts for your TVs and displays. Each layout
          creates a separate URL you can open on any screen.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-1">
        <a
          href={`/board/${orgId}`}
          target="_blank"
          className="flex items-center gap-4 rounded-xl border border-black/[0.07] bg-[#f5fadf] p-5 transition-colors hover:bg-[#eff8cf]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#151713] text-[#b9f34b]">
            <Monitor className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#151713]">
              Main Board View
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#5d615b]">
              /board/{orgId}
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#65ad00]" />
        </a>
      </div>

      {/* Layout Presets */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#151713]">
              Layout Presets
            </h2>
            <p className="mt-0.5 text-sm text-[#5d615b]">
              Open any of these on a TV or second monitor. Each shows different
              information based on the panel arrangement.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {layouts.map((layout) => (
            <PresetCard
              key={layout.id}
              layout={layout}
              orgId={orgId}
            />
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="rounded-xl border border-[#dfeabf] bg-[#f5fadf] p-5">
        <h3 className="mb-3 text-sm font-bold text-[#245d19]">
          How to set up a TV display
        </h3>
        <ol className="ml-4 space-y-2 text-sm text-[#367b20]">
          <li className="list-decimal">
            Connect a computer, Chromecast, or smart TV to your display.
          </li>
          <li className="list-decimal">
            Open any layout URL above in the browser on that screen.
          </li>
          <li className="list-decimal">
            Press <kbd className="rounded bg-[#d4e8b4] px-1.5 py-0.5 font-mono text-xs">F11</kbd> /
            <kbd className="rounded bg-[#d4e8b4] px-1.5 py-0.5 font-mono text-xs">⌘⇧F</kbd> for
            fullscreen.
          </li>
          <li className="list-decimal">
            Use the <strong>Share Board</strong> button on the main board to
            generate QR codes for mobile viewing.
          </li>
        </ol>
      </div>
    </div>
  );
}
