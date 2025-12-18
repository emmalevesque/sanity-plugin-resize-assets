import type { ProcessingStats, ImageMetadata } from '../utils/types';
import { formatBytes } from '../utils/format';

/**
 * ANSI color codes for terminal output
 */
export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
} as const;

/**
 * Logger class for colored console output with consistent formatting
 */
export class Logger {
  /**
   * Logs an informational message
   * @param message - Message to log
   */
  info(message: string): void {
    console.log(`${colors.cyan}[i]${colors.reset} ${message}`);
  }

  /**
   * Logs a success message
   * @param message - Message to log
   */
  success(message: string): void {
    console.log(`${colors.green}[+]${colors.reset} ${message}`);
  }

  /**
   * Logs a warning message
   * @param message - Message to log
   */
  warning(message: string): void {
    console.log(`${colors.yellow}[~]${colors.reset} ${message}`);
  }

  /**
   * Logs an error message
   * @param message - Message to log
   */
  error(message: string): void {
    console.log(`${colors.red}[!]${colors.reset} ${message}`);
  }

  /**
   * Logs a processing update with progress indicator
   * @param current - Current item number
   * @param total - Total number of items
   */
  progress(current: number, total: number): void {
    const percent = Math.round((current / total) * 100);
    this.info(`Processing ${current}/${total}... (${percent}%)`);
  }

  /**
   * Logs a skipped image message
   * @param image - Image metadata
   */
  skipped(image: ImageMetadata): void {
    this.warning(
      `Skipped: ${image.filename} (already optimized: ${image.width}x${image.height}, ${formatBytes(image.size)})`
    );
  }

  /**
   * Logs a processed image message
   * @param oldFilename - Original filename
   * @param newFilename - New filename
   * @param oldSize - Original file size in bytes
   * @param newSize - New file size in bytes
   */
  processed(oldFilename: string, newFilename: string, oldSize: number, newSize: number): void {
    this.success(
      `Processed: ${oldFilename} -> ${newFilename} (${formatBytes(oldSize)} -> ${formatBytes(newSize)})`
    );
  }

  /**
   * Logs a failed image processing message
   * @param filename - Filename that failed
   * @param error - Error message
   */
  failed(filename: string, error: string): void {
    this.error(`Failed: ${filename} - ${error}`);
  }

  /**
   * Logs a dry-run preview message
   * @param oldFilename - Original filename
   * @param newFilename - New filename that would be created
   */
  dryRun(oldFilename: string, newFilename: string): void {
    this.success(`Would process: ${oldFilename} -> ${newFilename}`);
  }

  /**
   * Prints the final summary with statistics
   * @param stats - Processing statistics
   * @param totalImages - Total number of images found
   * @param outputPath - Output tarball path
   * @param outputSize - Output tarball size in bytes
   */
  printSummary(stats: ProcessingStats, totalImages: number, outputPath: string, outputSize: number): void {
    console.log('\n=========================================');
    console.log('Sanity Image Resize Summary');
    console.log('=========================================');
    console.log(`Total found:       ${totalImages} images`);
    console.log(`Processed:         ${stats.processed} images`);
    console.log(`Skipped:          ${stats.skipped} images (already optimized)`);
    console.log(`Failed:            ${stats.failed} images`);
    console.log(`Total space saved: ${formatBytes(stats.totalSaved)}`);
    console.log(`Output tarball:    ${outputPath}`);
    console.log(`Output size:       ${formatBytes(outputSize)}`);
    console.log('=========================================\n');
  }

  /**
   * Prints dry-run completion message
   */
  printDryRunComplete(): void {
    this.info('\nDry run complete. No changes were made.');
  }
}
