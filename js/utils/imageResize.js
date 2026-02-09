/**
 * Client-side image compression and resize utility.
 * Resizes images before upload to Firebase Storage to save bandwidth and quota.
 *
 * Usage:
 *   import { compressImage } from './utils/imageResize.js';
 *   const resized = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
 *   const url = await uploadImage(resized, 'vendors');
 */

const DEFAULTS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.80,
  mimeType: 'image/jpeg'
};

/**
 * Compress and resize an image File/Blob.
 * Returns a new Blob (JPEG by default) that fits within maxWidth × maxHeight
 * while preserving aspect ratio.
 *
 * @param {File|Blob} file - The source image
 * @param {object} [opts] - Options
 * @param {number} [opts.maxWidth=1200] - Maximum width in pixels
 * @param {number} [opts.maxHeight=1200] - Maximum height in pixels
 * @param {number} [opts.quality=0.80] - JPEG quality 0-1
 * @param {string} [opts.mimeType='image/jpeg'] - Output MIME type
 * @returns {Promise<Blob>} Resized image blob
 */
export async function compressImage(file, opts = {}) {
  const { maxWidth, maxHeight, quality, mimeType } = { ...DEFAULTS, ...opts };

  // If it's already small enough and JPEG, skip compression
  if (file.size < 200 * 1024 && file.type === 'image/jpeg') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Calculate scaled dimensions preserving aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Use OffscreenCanvas if available (Web Worker–safe), else regular canvas
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Convert to blob
  if (canvas.convertToBlob) {
    return await canvas.convertToBlob({ type: mimeType, quality });
  }
  // Fallback for regular canvas
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

/**
 * Compress an image specifically for profile photos (smaller output).
 * @param {File|Blob} file
 * @returns {Promise<Blob>}
 */
export async function compressProfileImage(file) {
  return compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.80 });
}

/**
 * Compress an image for gallery display.
 * @param {File|Blob} file
 * @returns {Promise<Blob>}
 */
export async function compressGalleryImage(file) {
  return compressImage(file, { maxWidth: 1600, maxHeight: 1200, quality: 0.82 });
}

/**
 * Compress an image for a background/hero banner.
 * @param {File|Blob} file
 * @returns {Promise<Blob>}
 */
export async function compressBackgroundImage(file) {
  return compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.78 });
}

/**
 * Read a File as a data URL (base64). Utility for previewing before upload.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
