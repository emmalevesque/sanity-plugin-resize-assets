import * as tar from 'tar';
import { createDir, readDir, isDirectory, joinPath } from './filesystem';

/**
 * Extracts a tarball to a destination directory
 *
 * @param tarballPath - Path to the tarball file
 * @param destDir - Destination directory for extraction
 */
export async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  await tar.x({
    file: tarballPath,
    cwd: destDir
  });
}

/**
 * Creates a gzipped tarball from a directory
 *
 * @param outputPath - Path for the output tarball
 * @param sourceDir - Source directory to archive
 * @param entries - Specific entries to include (defaults to all)
 */
export async function createTarball(
  outputPath: string,
  sourceDir: string,
  entries?: string[]
): Promise<void> {
  await tar.c(
    {
      gzip: true,
      file: outputPath,
      cwd: sourceDir
    },
    entries || ['.']
  );
}

/**
 * Detects the working directory after tarball extraction
 * Handles both flat and nested tarball structures
 *
 * @param extractDir - Directory where tarball was extracted
 * @returns Path to the actual working directory
 */
export function detectWorkingDirectory(extractDir: string): string {
  const contents = readDir(extractDir);

  // If single directory was extracted, use it as working dir
  if (contents.length === 1) {
    const singleEntry = joinPath(extractDir, contents[0]);
    if (isDirectory(singleEntry)) {
      return singleEntry;
    }
  }

  // Multiple files/dirs at root level, use extract dir
  return extractDir;
}

/**
 * Validates that a directory contains required Sanity export files
 *
 * @param workingDir - Directory to validate
 * @returns Object indicating which required files exist
 */
export function validateSanityStructure(workingDir: string): {
  valid: boolean;
  hasImages: boolean;
  hasAssets: boolean;
  hasData: boolean;
  hasFiles: boolean;
} {
  const fs = require('fs');
  const path = require('path');

  const imagesDir = path.join(workingDir, 'images');
  const assetsJson = path.join(workingDir, 'assets.json');
  const dataNdjson = path.join(workingDir, 'data.ndjson');
  const filesDir = path.join(workingDir, 'files');

  const hasImages = fs.existsSync(imagesDir);
  const hasAssets = fs.existsSync(assetsJson);
  const hasData = fs.existsSync(dataNdjson);
  const hasFiles = fs.existsSync(filesDir);

  return {
    valid: hasImages && hasAssets && hasData,
    hasImages,
    hasAssets,
    hasData,
    hasFiles
  };
}

/**
 * Determines if a path is a tarball based on extension
 *
 * @param filePath - Path to check
 * @returns True if path appears to be a tarball
 */
export function isTarball(filePath: string): boolean {
  return filePath.endsWith('.tar.gz') || filePath.endsWith('.tgz');
}
