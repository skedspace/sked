"use client";

import { Check, Edit3, LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/* ── Props ── */

interface BoardHeaderEditorProps {
  orgId: string;
}

/* ── Component ── */

export function BoardHeaderEditor({ orgId }: BoardHeaderEditorProps) {
  const db = createClient();

  const [title, setTitle] = useState("Gameboard");
  const [tagline, setTagline] = useState("Live court status & player rotation");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Load current values from org_settings
  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("org_settings")
        .select("board_title, board_tagline")
        .eq("org_id", orgId)
        .maybeSingle();

      if (data) {
        setTitle(data.board_title ?? "Gameboard");
        setTagline(data.board_tagline ?? "Live court status & player rotation");
      }
      setLoading(false);
    })();
  }, [orgId, db]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const { error } = await db
      .from("org_settings")
      .upsert(
        {
          org_id: orgId,
          board_title: title.trim() || "Gameboard",
          board_tagline: tagline.trim() || "Live court status & player rotation",
        },
        { onConflict: "org_id" },
      );

    setSaving(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Board header saved.");
      setDirty(false);
    }
  };

  return (
    <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#151713]">
            <Edit3 className="h-4 w-4 text-[#5d615b]" />
            Board Header
          </h3>
          <p className="mt-0.5 text-sm text-[#5d615b]">
            Customize the title and tagline shown at the top of your live board
            view.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#5d615b]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading settings…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Title field */}
          <div>
            <label
              htmlFor="board-title"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8a8f89]"
            >
              Title
            </label>
            <Input
              id="board-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
                setMessage(null);
              }}
              placeholder="Gameboard"
              className="border-black/[0.07] bg-[#f7f7f4] text-sm text-[#151713]"
            />
          </div>

          {/* Tagline field */}
          <div>
            <label
              htmlFor="board-tagline"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8a8f89]"
            >
              Tagline / Subtext
            </label>
            <Input
              id="board-tagline"
              value={tagline}
              onChange={(e) => {
                setTagline(e.target.value);
                setDirty(true);
                setMessage(null);
              }}
              placeholder="Live court status & player rotation"
              className="border-black/[0.07] bg-[#f7f7f4] text-sm text-[#151713]"
            />
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-black/[0.06] bg-[#0a0c08] px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Preview
            </p>
            <h4 className="truncate text-lg font-black leading-none tracking-tight text-white">
              {title.trim() || "Gameboard"}
            </h4>
            <p className="mt-0.5 truncate text-[11px] text-white/40">
              {tagline.trim() || "Live court status & player rotation"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 text-xs"
            >
              {saving ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving…" : "Save"}
            </Button>

            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitle("Gameboard");
                  setTagline("Live court status & player rotation");
                  setDirty(false);
                  setMessage(null);
                }}
                className="flex items-center gap-1.5 text-xs text-[#5d615b]"
              >
                <X className="h-3.5 w-3.5" />
                Reset to defaults
              </Button>
            )}

            {message && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  message === "Board header saved."
                    ? "text-[#367b20]"
                    : "text-red-600"
                }`}
              >
                {message === "Board header saved." ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
