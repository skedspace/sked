"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SessionPlayer = {
  id: string;
  name: string;
  rating?: string;
};

export type SessionGroup = {
  id: string;
  label: string;
  players: SessionPlayer[];
  status: "waiting" | "on-deck" | "playing";
};

export type SessionCourt = {
  courtId: string;
  courtName: string;
  status: "empty" | "ready" | "active";
  group: SessionGroup | null;
  startedAt: string | null;
  durationMinutes: number;
  elapsedSeconds: number;
  isPaused: boolean;
};

export type LiveSessionState = {
  queue: SessionPlayer[];
  groups: SessionGroup[];
  courts: SessionCourt[];
  returned: SessionPlayer[];
  checkedIn: SessionPlayer[];
  checkedInLog: Array<{ playerId: string; playerName: string; checkedInAt: string }>;
};

export type LiveSession = {
  id: string;
  org_id: string;
  name: string;
  status: "active" | "paused" | "ended";
  state: LiveSessionState;
  created_at: string;
  updated_at: string;
};

/**
 * Get the active session for an org. Creates one if none exists.
 */
export async function getOrCreateSession(orgId: string): Promise<LiveSession | null> {
  const supabase = createClient();

  // Look for an active session
  const { data: existing } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing as LiveSession;

  // Create a new one with the default 4-court layout
  const defaultState: LiveSessionState = {
    queue: [],
    groups: [],
    courts: [
      { courtId: "c1", courtName: "Court 1", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c2", courtName: "Court 2", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c3", courtName: "Court 3", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
      { courtId: "c4", courtName: "Court 4", status: "empty", group: null, startedAt: null, durationMinutes: 15, elapsedSeconds: 0, isPaused: false },
    ],
    returned: [],
    checkedIn: [],
    checkedInLog: [],
  };

  const { data: created } = await supabase
    .from("live_sessions")
    .insert({
      org_id: orgId,
      name: "Open Play",
      status: "active",
      state: defaultState as unknown as Record<string, unknown>,
    })
    .select("*")
    .single();

  if (!created) return null;
  revalidatePath("/dashboard/session");
  return created as LiveSession;
}

/**
 * Update the session state (full replace).
 */
export async function updateSessionState(
  sessionId: string,
  state: LiveSessionState,
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("live_sessions")
    .update({
      state: state as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return !error;
}

/**
 * End an active session.
 */
export async function endSession(sessionId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended" })
    .eq("id", sessionId);

  if (!error) revalidatePath("/dashboard/session");
  return !error;
}

/**
 * Fetch session data for the public board display (uses anon key — public).
 */
export async function getSessionForBoard(
  orgSlug: string,
  sessionId: string,
): Promise<LiveSession | null> {
  const supabase = createClient();

  // Resolve org slug to ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return null;

  const { data: session } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("org_id", org.id)
    .single();

  return session as LiveSession | null;
}

/**
 * Fetch the active session for an org by slug (for board display).
 */
export async function getActiveSessionForOrg(
  orgSlug: string,
): Promise<LiveSession | null> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return null;

  const { data: session } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("org_id", org.id)
    .eq("status", "active")
    .maybeSingle();

  return session as LiveSession | null;
}
