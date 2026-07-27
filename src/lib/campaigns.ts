export type CampaignStatus = "draft" | "active" | "drawn" | "cancelled";
export type DrawType = "standard" | "provably_fair";

export type Campaign = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  prize: string;
  prize_cents: number;
  starts_at: string;
  ends_at: string;
  draw_type: DrawType;
  winner_count: number;
  status: CampaignStatus;
  draw_commitment: string | null;
  draw_nonce: string | null;
  draw_block_hash: string | null;
};

export type CampaignTask = {
  id: string;
  campaign_id: string;
  type: "booking" | "follow_social" | "share" | "referral";
  label: string;
  description: string | null;
  entry_count: number;
  config: Record<string, unknown>;
};

/**
 * Generates a 6-digit OTP code using browser-compatible crypto.
 */
export function generateOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const num = buf[0] % 1000000;
  return num.toString().padStart(6, "0");
}

/**
 * Creates a provably fair commitment hash using Web Crypto API.
 * commitment = SHA-256(nonce + "_" + blockHash)
 * After the draw, participants can verify with the nonce + block hash.
 */
export async function createCommitment(nonce: string, blockHash?: string): Promise<string> {
  const data = new TextEncoder().encode(nonce + (blockHash ? "_" + blockHash : ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Performs a provably fair draw using Web Crypto API.
 *
 * The winner is determined by:
 *   index = SHA-256(nonce + "_" + blockHash) % entryCount
 *
 * Anyone can verify by recomputing with the published values.
 */
export async function performDraw(
  entries: { id: string; customer_name: string }[],
  nonce: string,
  blockHash: string,
  winnerCount: number,
): Promise<{ entryId: string; customerName: string }[]> {
  const hash = await createCommitment(nonce, blockHash);
  const seed = BigInt("0x" + hash);

  // Fisher-Yates shuffle with seeded randomness
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Number(seed % BigInt(i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, winnerCount).map((e) => ({
    entryId: e.id,
    customerName: e.customer_name,
  }));
}
