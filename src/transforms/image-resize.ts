import sharp from 'sharp';
import type { ResizeOptions, ResizeResult } from '../utils/types';
import { statSync } from '../io/filesystem';

/**
 * Resizes an image using Sharp with format-specific optimization
 *
 * @param inputPath - Path to input image
 * @param outputPath - Path for output image
 * @param options - Resize options (maxSize, quality, format)
 * @returns Result containing new dimensions and file size
 */
export async function resizeImage(
  inputPath: string,
  outputPath: string,
  options: ResizeOptions
): Promise<ResizeResult> {
  // Get metadata from sharp
  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  // Calculate new dimensions maintaining aspect ratio
  const longestSide = Math.max(metadata.width, metadata.height);
  const scale = options.maxSize / longestSide;
  const newWidth = Math.round(metadata.width * scale);
  const newHeight = Math.round(metadata.height * scale);

  // Build sharp pipeline
  let pipeline = sharp(inputPath)
    .resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

  // Apply format-specific options
  pipeline = applyFormatOptions(pipeline, options.format, options.quality);

  // Write output file
  await pipeline.toFile(outputPath);

  // Get new file size
  const stats = statSync(outputPath);

  return {
    width: newWidth,
    height: newHeight,
    size: stats.size
  };
}

/**
 * Applies format-specific compression options to Sharp pipeline
 *
 * @param pipeline - Sharp pipeline instance
 * @param format - Image format (jpg, png, webp, etc.)
 * @param quality - Quality setting (1-100)
 * @returns Modified pipeline
 */
function applyFormatOptions(
  pipeline: sharp.Sharp,
  format: string,
  quality: number
): sharp.Sharp {
  const ext = format.toLowerCase();

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return pipeline.jpeg({
        quality,
        progressive: true
      });

    case 'png':
      return pipeline.png({
        quality,
        compressionLevel: 9
      });

    case 'webp':
      return pipeline.webp({
        quality
      });

    case 'heic':
    case 'heif':
      return pipeline.heif({
        quality
      });

    case 'tiff':
    case 'tif':
      return pipeline.tiff({
        quality
      });

    default:
      // For unknown formats, try generic quality setting
      return pipeline;
  }
}

/**
 * Gets image metadata without processing
 *
 * @param imagePath - Path to image
 * @returns Image metadata (width, height, format, size)
 */
export async function getImageMetadata(imagePath: string): Promise<{
  width: number;
  height: number;
  format?: string;
  size: number;
}> {
  const metadata = await sharp(imagePath).metadata();
  const stats = statSync(imagePath);

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format,
    size: stats.size
  };
}

/**
 * Calculates new dimensions for an image given a max size constraint
 *
 * @param width - Original width
 * @param height - Original height
 * @param maxSize - Maximum dimension
 * @returns New width and height
 */
export function calculateNewDimensions(
  width: number,
  height: number,
  maxSize: number
): { width: number; height: number } {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxSize) {
    return { width, height };
  }

  const scale = maxSize / longestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}
