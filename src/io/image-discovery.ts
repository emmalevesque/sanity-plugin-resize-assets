import type { ImageMetadata, ProcessingOptions } from '../utils/types';
import { parseFilename } from '../utils/filename';
import { readDir, joinPath, statSync } from './filesystem';

/**
 * Discovers and collects metadata for all images in a directory
 *
 * @param imagesDir - Path to the images directory
 * @param options - Processing options (maxSize, maxFilesize)
 * @returns Array of image metadata
 */
export function discoverImages(
  imagesDir: string,
  options: ProcessingOptions
): ImageMetadata[] {
  let imageFiles: string[];
  try {
    imageFiles = readDir(imagesDir);
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
  const images: ImageMetadata[] = [];

  for (const filename of imageFiles) {
    const parsed = parseFilename(filename);

    if (!parsed) {
      // Skip invalid filenames (will be logged by caller)
      continue;
    }

    const imagePath = joinPath(imagesDir, filename);
    const stats = statSync(imagePath);
    const longestSide = Math.max(parsed.width, parsed.height);
    const sizeMB = stats.size / (1024 * 1024);

    const needsProcessing = longestSide > options.maxSize || sizeMB > options.maxFilesize;

    images.push({
      filename,
      hash: parsed.hash,
      width: parsed.width,
      height: parsed.height,
      ext: parsed.ext,
      path: imagePath,
      size: stats.size,
      longestSide,
      needsProcessing
    });
  }

  return images;
}

/**
 * Filters images that need processing based on thresholds
 *
 * @param images - Array of image metadata
 * @returns Images that need processing
 */
export function getImagesToProcess(images: ImageMetadata[]): ImageMetadata[] {
  return images.filter(img => img.needsProcessing);
}

/**
 * Groups images by whether they need processing
 *
 * @param images - Array of image metadata
 * @returns Object with needsProcessing and alreadyOptimized arrays
 */
export function groupImagesByProcessing(images: ImageMetadata[]): {
  needsProcessing: ImageMetadata[];
  alreadyOptimized: ImageMetadata[];
} {
  return {
    needsProcessing: images.filter(img => img.needsProcessing),
    alreadyOptimized: images.filter(img => !img.needsProcessing)
  };
}

/**
 * Finds an image by its hash
 *
 * @param images - Array of image metadata
 * @param hash - Asset hash to find
 * @returns Image metadata or undefined
 */
export function findImageByHash(images: ImageMetadata[], hash: string): ImageMetadata | undefined {
  return images.find(img => img.hash === hash);
}

/**
 * Calculates total size of all images
 *
 * @param images - Array of image metadata
 * @returns Total size in bytes
 */
export function calculateTotalSize(images: ImageMetadata[]): number {
  return images.reduce((total, img) => total + img.size, 0);
}
