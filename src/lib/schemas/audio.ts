import { z } from "zod";

/**
 * Multipart form fields for audio + image uploads. Body validation happens on
 * the `File` object directly (size/type) rather than via Zod; these schemas
 * cover the string fields.
 */
export const audioUploadFieldsSchema = z.object({
  projectId: z.string().min(1),
});

/**
 * Validate an uploaded audio file. Currently we don't enforce a strict MIME
 * allow-list (xLights users upload all sorts of formats) but we do reject
 * empty payloads and oversized files.
 */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB

export function validateAudioFile(file: File): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_AUDIO_BYTES) return "File exceeds 50 MB limit";
  return null;
}

/**
 * Validate an uploaded image file. Used by the house-photo upload route.
 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "File must be an image";
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_IMAGE_BYTES) return "File exceeds 10 MB limit";
  return null;
}
