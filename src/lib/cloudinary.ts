/**
 * Client & Shared Cloudinary utilities.
 * Handles URL optimization, automatic format delivery, and responsive transformations.
 */

export interface ImageTransformationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  crop?: 'fill' | 'fit' | 'thumb' | 'scale' | 'limit';
  format?: 'auto' | 'webp' | 'png' | 'jpg';
  aspectRatio?: string;
}

/**
 * Checks if a given URL originates from Cloudinary CDN.
 */
export function isCloudinaryUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('res.cloudinary.com') || url.includes('/image/upload/');
}

/**
 * Injects performance transformations into a Cloudinary URL.
 * Defaults to auto-format (WebP/AVIF depending on browser support) and auto-quality.
 * Leaves non-Cloudinary images (e.g. Unsplash, static assets) untouched.
 */
export function getOptimizedImageUrl(
  src: string | undefined | null,
  options: ImageTransformationOptions = {}
): string {
  if (!src || typeof src !== 'string') return '';
  if (!isCloudinaryUrl(src)) return src;

  const {
    width,
    height,
    quality = 'auto',
    crop = 'fill',
    format = 'auto',
    aspectRatio,
  } = options;

  const parts: string[] = [`f_${format}`, `q_${quality}`];
  if (crop) parts.push(`c_${crop}`);
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (aspectRatio) parts.push(`ar_${aspectRatio}`);

  const transformString = parts.join(',');

  // Check if URL already contains /upload/
  const uploadIndex = src.indexOf('/upload/');
  if (uploadIndex === -1) {
    return src;
  }

  // Check if transformations are already present right after /upload/
  const beforeUpload = src.substring(0, uploadIndex + '/upload/'.length);
  const afterUpload = src.substring(uploadIndex + '/upload/'.length);

  // If already contains our transformation, return as is
  if (afterUpload.startsWith(transformString + '/')) {
    return src;
  }

  return `${beforeUpload}${transformString}/${afterUpload}`;
}

/**
 * Extracts the public ID from a Cloudinary asset URL.
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;

  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);

    // Strip out version if present (e.g., v1726000000/)
    const segments = pathAfterUpload.split('/');
    const filteredSegments = segments.filter((seg) => {
      // Ignore transformation segments like f_auto,q_auto,w_800
      if (seg.includes(',') || seg.startsWith('c_') || seg.startsWith('w_') || seg.startsWith('h_')) {
        return false;
      }
      // Ignore version tags like v123456789
      if (/^v\d+$/.test(seg)) {
        return false;
      }
      return true;
    });

    if (filteredSegments.length === 0) return null;

    const fullPublicIdWithExt = filteredSegments.join('/');
    // Strip file extension (.jpg, .png, etc.)
    const lastDotIndex = fullPublicIdWithExt.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return fullPublicIdWithExt.substring(0, lastDotIndex);
    }
    return fullPublicIdWithExt;
  } catch {
    return null;
  }
}
