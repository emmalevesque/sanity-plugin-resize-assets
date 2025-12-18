import type { ProcessedImage } from '../utils/types';
import { readText, write } from '../io/filesystem';

/**
 * Updates filename references in data.ndjson file
 * Replaces old filenames with new filenames for all processed images
 *
 * @param dataNdjsonPath - Path to data.ndjson file
 * @param processedImages - Array of processed image change records
 */
export async function updateDataNdjson(
  dataNdjsonPath: string,
  processedImages: ProcessedImage[]
): Promise<void> {
  // Read file content
  const content = await readText(dataNdjsonPath);

  // Split into lines
  let lines = content.split('\n').filter(line => line.trim());

  // Replace filenames in each line
  for (const img of processedImages) {
    lines = lines.map(line => replaceFilename(line, img.oldFilename, img.newFilename));
  }

  // Write back with trailing newline
  await write(dataNdjsonPath, lines.join('\n') + '\n');
}

/**
 * Replaces all occurrences of old filename with new filename in a string
 * Properly escapes special regex characters in the filename
 *
 * @param content - Content to search and replace in
 * @param oldFilename - Old filename to find
 * @param newFilename - New filename to replace with
 * @returns Content with replaced filenames
 */
function replaceFilename(content: string, oldFilename: string, newFilename: string): string {
  // Escape special regex characters in the filename
  const escapedFilename = oldFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create regex to match all occurrences
  const regex = new RegExp(escapedFilename, 'g');

  return content.replace(regex, newFilename);
}

/**
 * Validates that data.ndjson is properly formatted
 * Each line should be valid JSON
 *
 * @param dataNdjsonPath - Path to data.ndjson file
 * @returns True if valid, false otherwise
 */
export async function validateDataNdjson(dataNdjsonPath: string): Promise<boolean> {
  try {
    const content = await readText(dataNdjsonPath);
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      JSON.parse(line); // Will throw if invalid
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Counts how many references to a filename exist in data.ndjson
 *
 * @param dataNdjsonPath - Path to data.ndjson file
 * @param filename - Filename to search for
 * @returns Number of occurrences
 */
export async function countFilenameReferences(
  dataNdjsonPath: string,
  filename: string
): Promise<number> {
  const content = await readText(dataNdjsonPath);
  const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedFilename, 'g');
  const matches = content.match(regex);

  return matches ? matches.length : 0;
}
