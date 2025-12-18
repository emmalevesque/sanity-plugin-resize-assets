import type { ParsedFilename } from './types';

/**
 * Parses a Sanity image filename into its components
 *
 * Expected format: {hash}-{width}x{height}.{ext}
 * Example: abc123def456-4000x3000.jpg
 *
 * @param filename - The filename to parse
 * @returns Parsed components or null if invalid format
 */
export function parseFilename(filename: string): ParsedFilename | null {
  // Expected format: {hash}-{width}x{height}.{ext}
  const match = filename.match(/^([a-f0-9]+)-(\d+)x(\d+)\.([a-z]+)$/i);

  if (!match) {
    return null;
  }

  return {
    hash: match[1],
    width: parseInt(match[2], 10),
    height: parseInt(match[3], 10),
    ext: match[4].toLowerCase()
  };
}

/**
 * Validates if a filename matches the expected Sanity image format
 *
 * @param filename - The filename to validate
 * @returns True if filename is valid
 */
export function isValidFilename(filename: string): boolean {
  return parseFilename(filename) !== null;
}

/**
 * Constructs a Sanity image filename from components
 *
 * @param hash - Asset hash
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param ext - File extension (without dot)
 * @returns Formatted filename
 */
export function constructFilename(
  hash: string,
  width: number,
  height: number,
  ext: string
): string {
  return `${hash}-${width}x${height}.${ext.toLowerCase()}`;
}
