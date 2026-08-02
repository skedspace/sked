import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remove = vi.hoisted(() => vi.fn(async () => ({ data: [], error: null })));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({ remove }),
    },
  }),
}));

import { getOwnedPublicAssetPath, removeOwnedPublicImage } from "@/lib/storage";

const SUPABASE_URL = "https://project.supabase.co";
const ORG_ID = "11111111-1111-1111-1111-111111111111";

function publicAssetUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/public-assets/${path}`;
}

describe("public asset ownership checks", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    remove.mockClear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("resolves only assets in the owner's court folder", () => {
    expect(
      getOwnedPublicAssetPath(
        publicAssetUrl(`${ORG_ID}/courts/court.webp`),
        ORG_ID,
      ),
    ).toBe(`${ORG_ID}/courts/court.webp`);

    expect(
      getOwnedPublicAssetPath(
        publicAssetUrl(`${ORG_ID}/logo/logo.webp`),
        ORG_ID,
      ),
    ).toBeNull();
    expect(
      getOwnedPublicAssetPath(
        publicAssetUrl(
          `22222222-2222-2222-2222-222222222222/courts/court.webp`,
        ),
        ORG_ID,
      ),
    ).toBeNull();
  });

  it("rejects external projects and traversal-shaped paths", () => {
    expect(
      getOwnedPublicAssetPath("https://images.example/court.webp", ORG_ID),
    ).toBeNull();
    expect(
      getOwnedPublicAssetPath(
        `${SUPABASE_URL}/storage/v1/object/public/avatars/${ORG_ID}/court.webp`,
        ORG_ID,
      ),
    ).toBeNull();
    expect(
      getOwnedPublicAssetPath(
        publicAssetUrl(`${ORG_ID}/courts/%2e%2e/logo.webp`),
        ORG_ID,
      ),
    ).toBeNull();
    expect(
      getOwnedPublicAssetPath(
        publicAssetUrl(`${ORG_ID}/courts/folder%2Ffile.webp`),
        ORG_ID,
      ),
    ).toBeNull();
  });

  it("does not ask storage to remove externally hosted URLs", async () => {
    await removeOwnedPublicImage(
      publicAssetUrl(`${ORG_ID}/courts/old.webp`),
      ORG_ID,
    );
    await removeOwnedPublicImage("https://images.example/court.webp", ORG_ID);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith([`${ORG_ID}/courts/old.webp`]);
  });
});
