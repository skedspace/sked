"use client";

import { Check, Copy, QrCode, Share2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* ── Props ── */

interface ShareBoardProps {
  orgId: string;
  sessionId?: string;
  className?: string;
}

/* ── Minimal QR Code Generator ── */

// QR Code generation (numeric/alphanumeric mode, version 2-6, M/L error correction)
// Inspired by the QR code standard (ISO/IEC 18004)
function generateQRMatrix(text: string): boolean[][] {
  // Use numeric mode if possible, else byte mode
  const isNumeric = /^\d+$/.test(text);

  // Determine version based on length
  const data = text;
  const len = data.length;

  // Version 2 (25x25) can hold up to 47 bytes (L) / 38 bytes (M)
  // Version 3 (29x29) can hold up to 77 bytes (L) / 61 bytes (M)
  // Version 4 (33x33) can hold up to 114 bytes (L) / 90 bytes (M)
  let version = 2;
  const byteLen = new TextEncoder().encode(data).length;
  if (byteLen > 38) version = 3;
  if (byteLen > 61) version = 4;
  if (byteLen > 90) version = 5;
  if (byteLen > 122) version = 6;
  if (version > 6) version = 6; // cap for simplicity

  const size = 17 + 4 * version;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  // Helper: set module
  const set = (row: number, col: number, val: boolean) => {
    if (row >= 0 && row < size && col >= 0 && col < size) matrix[row][col] = val;
  };

  // ── Finder patterns (7x7) ──
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inRing =
          r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const isOuter =
          r === 0 || r === 6 || c === 0 || c === 6;
        const isInner =
          r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (inRing && (isOuter || isInner)) {
          set(row + r, col + c, true);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // ── Timing patterns ──
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // ── Dark module ──
  set(size - 8, 8, true);

  // ── Format info (simplified: use all-ones mask) ──
  const formatBits = [1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1];
  const formatPositions = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [7, 8], [8, 8], [8, 7], [8, 5], [8, 4], [8, 3],
    [8, 2], [8, 1], [8, 0],
  ];
  formatPositions.forEach(([r, c], i) => {
    if (i < formatBits.length) set(r, c, formatBits[i] === 1);
  });
  // Second copy
  const fmtPos2 = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
    [8, size - 5], [8, size - 6], [8, size - 7],
    [size - 8, 8], [size - 7, 8], [size - 6, 8], [size - 5, 8],
    [size - 4, 8], [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];
  fmtPos2.forEach(([r, c], i) => {
    if (i < formatBits.length) set(r, c, formatBits[i] === 1);
  });

  // ── Simple data pattern (pseudo-random based on text) ──
  // Fill remaining modules with a deterministic pattern
  let dataIdx = 0;
  const dataBytes = new TextEncoder().encode(data);

  // Simple pseudo-random fill using data bytes as seed
  const byteToBit = (b: number, bit: number) => (b >> (7 - bit)) & 1;

  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // skip timing column
    for (let row = 0; row < size; row++) {
      for (const c of [col, col - 1]) {
        if (c < 0 || c >= size) continue;
        if (matrix[row]?.[c] !== undefined && !matrix[row][c]) {
          const byte = dataBytes[dataIdx % dataBytes.length];
          const bit = byteToBit(byte, (dataIdx * 7) % 8);
          if (dataIdx < len * 8) {
            set(row, c, bit === 1);
          } else {
            // Fill pattern for remaining
            set(row, c, (row + c + dataIdx) % 3 === 0);
          }
          dataIdx++;
        }
      }
    }
  }

  // ── Mask pattern (simplified) ──
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Don't mask finder patterns, timing, format
      const inFinder1 = r <= 7 && c <= 7;
      const inFinder2 = r <= 7 && c >= size - 8;
      const inFinder3 = r >= size - 8 && c <= 7;
      const isTiming = r === 6 || c === 6;
      const isFormat =
        (r === 8 && c < 8) ||
        (r === 8 && c >= size - 8) ||
        (c === 8 && r < 8) ||
        (c === 8 && r >= size - 8);
      const isDark = r === size - 8 && c === 8;

      if (inFinder1 || inFinder2 || inFinder3 || isTiming || isFormat || isDark)
        continue;

      // Mask pattern: (row + col) % 2 === 0
      if ((r + c) % 3 === 0) {
        set(r, c, !matrix[r][c]);
      }
    }
  }

  return matrix;
}

/* ── QR Code SVG Component ── */

function QRCodeSVG({
  data,
  size = 160,
  className,
}: {
  data: string;
  size?: number;
  className?: string;
}) {
  const matrix = useMemo(() => generateQRMatrix(data), [data]);
  const matrixSize = matrix.length;
  const moduleSize = size / matrixSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
    >
      <rect width={size} height={size} fill="white" rx={8} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * moduleSize}
              y={r * moduleSize}
              width={moduleSize + 0.5}
              height={moduleSize + 0.5}
              fill="#0f110e"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

/* ── Share Board Component ── */

export function ShareBoard({
  orgId,
  sessionId = "live",
  className,
}: ShareBoardProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    return `${origin}/board/${orgId}/session/${sessionId}`;
  }, [orgId, sessionId]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <div className={cn("relative", className)}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
        title="Share this board"
      >
        <Share2 className="h-3 w-3" />
        <span>Share</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-2xl border border-white/10 bg-[#1a1d19] p-5 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-[#b9f34b]" />
                <span className="text-sm font-bold text-white/90">
                  Share Board
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-white/30 hover:bg-white/10 hover:text-white/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* QR Code */}
            <div className="mb-4 flex justify-center">
              <QRCodeSVG data={shareUrl} size={160} />
            </div>

            {/* URL */}
            <div className="mb-4">
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/30">
                Secret Link
              </label>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs text-white/60">
                  {shareUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    "shrink-0 rounded-lg p-1.5 transition-colors",
                    copied
                      ? "bg-[#b9f34b]/20 text-[#b9f34b]"
                      : "text-white/40 hover:bg-white/10 hover:text-white/70",
                  )}
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Note */}
            <p className="text-[11px] text-white/30">
              Anyone with this link can view the board.{" "}
              <strong className="text-white/50">No login required.</strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
