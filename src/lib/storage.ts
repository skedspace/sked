import { createClient } from "@/lib/supabase/client";

/**
 * Public storage bucket for user-uploaded images (court photos, gallery
 * photos, etc.). Created in migration 00042. The bucket is world-readable so
 * uploaded files can be served on the public storefront.
 */
export const PUBLIC_ASSETS_BUCKET = "public-assets";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, matches bucket limit
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

/** Human-readable guard so callers can validate before hitting the network. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Please choose a JPG, PNG, WebP, GIF, or AVIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large. Maximum size is 10 MB.";
  }
  return null;
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase();
  return fromType && /^[a-z0-9]+$/.test(fromType) ? fromType : "jpg";
}

/**
 * Uploads an image to the public bucket and returns its public URL.
 * `folder` should namespace the file, e.g. `${orgId}/courts`.
 * Throws with a readable message on failure.
 */
export async function uploadPublicImage(
  file: File,
  folder: string,
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const path = `${folder.replace(/\/+$/, "")}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await supabase.storage
    .from(PUBLIC_ASSETS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  const { data } = supabase.storage
    .from(PUBLIC_ASSETS_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Could not resolve the uploaded image URL.");
  }
  return data.publicUrl;
}
