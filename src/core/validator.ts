import { existsSync, isDirectory, joinPath } from '../io/filesystem';

/**
 * Validates that an input path exists
 *
 * @param inputPath - Path to validate
 * @throws Error if path doesn't exist
 */
export function validateInputExists(inputPath: string): void {
  if (!existsSync(inputPath)) {
    throw new Error(`Input path not found: ${inputPath}`);
  }
}

/**
 * Validates that input is either a directory or tarball
 *
 * @param inputPath - Path to validate
 * @returns Object indicating if it's a directory or tarball
 * @throws Error if neither
 */
export function validateInputType(inputPath: string): {
  isDirectory: boolean;
  isTarball: boolean;
} {
  const isDir = isDirectory(inputPath);
  const isTarball = !isDir && (inputPath.endsWith('.tar.gz') || inputPath.endsWith('.tgz'));

  if (!isDir && !isTarball) {
    throw new Error('Input must be a directory or .tar.gz file');
  }

  return {
    isDirectory: isDir,
    isTarball
  };
}

/**
 * Validates that a directory contains required Sanity export structure
 *
 * @param workingDir - Directory to validate
 * @throws Error if required files are missing
 */
export function validateSanityStructure(workingDir: string): void {
  const imagesDir = joinPath(workingDir, 'images');
  const assetsJson = joinPath(workingDir, 'assets.json');
  const dataNdjson = joinPath(workingDir, 'data.ndjson');

  if (!existsSync(imagesDir)) {
    throw new Error('Missing images/ directory in tarball');
  }

  if (!existsSync(assetsJson)) {
    throw new Error('Missing assets.json in tarball');
  }

  if (!existsSync(dataNdjson)) {
    throw new Error('Missing data.ndjson in tarball');
  }
}

/**
 * Validates processing options
 *
 * @param maxSize - Maximum dimension in pixels
 * @param maxFilesize - Maximum file size in MB
 * @param quality - Quality setting 1-100
 * @throws Error if options are invalid
 */
export function validateProcessingOptions(
  maxSize: number,
  maxFilesize: number,
  quality: number
): void {
  if (maxSize <= 0) {
    throw new Error('maxSize must be greater than 0');
  }

  if (maxFilesize <= 0) {
    throw new Error('maxFilesize must be greater than 0');
  }

  if (quality < 1 || quality > 100) {
    throw new Error('quality must be between 1 and 100');
  }
}

/**
 * Checks if a directory has files/ subdirectory (for non-image assets)
 *
 * @param workingDir - Directory to check
 * @returns True if files/ directory exists
 */
export function hasFilesDirectory(workingDir: string): boolean {
  const filesDir = joinPath(workingDir, 'files');
  return existsSync(filesDir) && isDirectory(filesDir);
}
