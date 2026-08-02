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

const PUBLIC_OBJECT_PATH_PREFIX = `/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/`;

function decodeSafePathSegments(pathname: string): string[] | null {
  const rawSegments = pathname.split("/");
  if (rawSegments.some((segment) => segment.length === 0)) return null;

  try {
    const segments = rawSegments.map((segment) => decodeURIComponent(segment));
    if (
      segments.some(
        (segment) =>
          segment.length === 0 ||
          segment === "." ||
          segment === ".." ||
          segment.includes("/") ||
          segment.includes("\\") ||
          segment.includes("\0"),
      )
    ) {
      return null;
    }
    return segments;
  } catch {
    // Malformed percent-encoding is not a storage path we should touch.
    return null;
  }
}

function safeFolderSegments(orgId: string, folder: string): string[] | null {
  return decodeSafePathSegments(`${orgId}/${folder.replace(/^\/+|\/+$/g, "")}`);
}

/**
 * Resolves a URL produced by Supabase's public-assets bucket to an object
 * path, but only when it belongs to the supplied organization/folder.
 *
 * External URLs and URLs for another bucket/project intentionally return null.
 * Keeping this check next to the delete helper prevents a pasted URL from ever
 * being sent to storage.remove().
 */
export function getOwnedPublicAssetPath(
  publicUrl: string | null | undefined,
  orgId: string,
  folder = "courts",
): string | null {
  if (!publicUrl?.trim() || !orgId.trim() || !folder.trim()) return null;

  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredSupabaseUrl) return null;

  let assetUrl: URL;
  let supabaseUrl: URL;
  try {
    assetUrl = new URL(publicUrl);
    supabaseUrl = new URL(configuredSupabaseUrl);
  } catch {
    return null;
  }

  // `origin` excludes credentials, so reject those explicitly as well.
  if (
    assetUrl.origin !== supabaseUrl.origin ||
    assetUrl.username ||
    assetUrl.password
  ) {
    return null;
  }

  if (!assetUrl.pathname.startsWith(PUBLIC_OBJECT_PATH_PREFIX)) return null;

  const objectPath = assetUrl.pathname.slice(PUBLIC_OBJECT_PATH_PREFIX.length);
  const objectSegments = decodeSafePathSegments(objectPath);
  const ownerSegments = safeFolderSegments(orgId, folder);
  if (!objectSegments || !ownerSegments) return null;
  if (objectSegments.length <= ownerSegments.length) return null;

  for (let index = 0; index < ownerSegments.length; index += 1) {
    if (objectSegments[index] !== ownerSegments[index]) return null;
  }

  return objectSegments.join("/");
}

/**
 * Removes an owned public asset. Returns false for external, malformed, or
 * out-of-scope URLs so callers can safely use this for optional cleanup.
 */
export async function removeOwnedPublicImage(
  publicUrl: string | null | undefined,
  orgId: string,
  folder = "courts",
): Promise<boolean> {
  const path = getOwnedPublicAssetPath(publicUrl, orgId, folder);
  if (!path) return false;

  const { error } = await createClient()
    .storage.from(PUBLIC_ASSETS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(error.message || "Could not remove the stored image.");
  }
  return true;
}

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

// Compression settings. Large phone photos are downscaled to fit within this
// box (keeping aspect ratio) and re-encoded as WebP, which is dramatically
// smaller than the source JPEG/PNG while staying sharp for web display.
const MAX_IMAGE_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

async function decodeImage(
  file: File,
): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    if (typeof createImageBitmap === "function") {
      // `from-image` honours EXIF orientation so portrait photos aren't rotated.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    }
  } catch {
    // Fall through to the <img> decoder below.
  }
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Downscales (if needed) and re-encodes an image to WebP in the browser.
 * Returns a new `.webp` File, or the original file when conversion isn't
 * worthwhile or possible (animated GIFs, decode failures, no size win, or a
 * non-browser environment).
 */
export async function compressImage(file: File): Promise<File> {
  // Keep animated GIFs intact — a canvas would flatten them to one frame.
  if (file.type === "image/gif") return file;
  if (typeof document === "undefined") return file;

  const source = await decodeImage(file);
  if (!source) return file;

  const width =
    (source as ImageBitmap).width ||
    (source as HTMLImageElement).naturalWidth;
  const height =
    (source as ImageBitmap).height ||
    (source as HTMLImageElement).naturalHeight;
  if (!width || !height) {
    if ("close" in source) (source as ImageBitmap).close();
    return file;
  }

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in source) (source as ImageBitmap).close();
    return file;
  }
  ctx.drawImage(source, 0, 0, targetW, targetH);
  if ("close" in source) (source as ImageBitmap).close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
  );
  // No blob, or the re-encode didn't actually save space → keep the original.
  if (!blob || blob.size >= file.size) return file;

  const name = `${file.name.replace(/\.[^./\\]+$/, "")}.webp`;
  return new File([blob], name, { type: "image/webp" });
}

/**
 * Uploads an image to the public bucket and returns its public URL.
 * `folder` should namespace the file, e.g. `${orgId}/courts`.
 * The image is compressed to WebP before upload. Throws with a readable
 * message on failure.
 */
export async function uploadPublicImage(
  file: File,
  folder: string,
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const compressed = await compressImage(file);

  const supabase = createClient();
  const path = `${folder.replace(/\/+$/, "")}/${crypto.randomUUID()}.${fileExtension(compressed)}`;

  const { error } = await supabase.storage
    .from(PUBLIC_ASSETS_BUCKET)
    .upload(path, compressed, { cacheControl: "3600", upsert: false });

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
