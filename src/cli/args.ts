import type { ProcessingOptions } from '../utils/types';
import { colors } from './output';

/**
 * Displays help text for the CLI
 */
export function showHelp(): void {
  console.log(`
${colors.cyan}Sanity Image Resize Tool${colors.reset}

Resize images in Sanity dataset export tarball or directory while updating all
references in data.ndjson and assets.json files.

${colors.cyan}Usage:${colors.reset}
  resize-sanity-images <input.tar.gz|directory> [options]

${colors.cyan}Options:${colors.reset}
  --max-size <pixels>     Maximum dimension in pixels (default: 3600)
  --max-filesize <mb>     Maximum file size in MB (default: 3)
  --quality <percent>     JPEG/WebP quality 1-100 (default: 85)
  --output <path>         Output tarball path (default: input-resized.tar.gz)
  --dry-run               Preview operations without processing
  --help                  Show this help message

${colors.cyan}Examples:${colors.reset}
  # Basic usage with tarball (3600px, 3MB)
  resize-sanity-images export.tar.gz

  # Using an extracted directory
  resize-sanity-images ./production-2024-12-04

  # Custom thresholds
  resize-sanity-images export.tar.gz --max-size 4000 --max-filesize 5

  # Specify output location
  resize-sanity-images export.tar.gz --output processed.tar.gz

  # Dry run to preview
  resize-sanity-images export.tar.gz --dry-run

  # Higher quality compression
  resize-sanity-images export.tar.gz --quality 90
`);
}

/**
 * Parses command-line arguments into processing options
 *
 * @param args - Command-line arguments (typically process.argv.slice(2))
 * @returns Parsed processing options
 */
export function parseArgs(args: string[]): ProcessingOptions {
  const options: ProcessingOptions = {
    inputTarball: '',
    maxSize: 3600,
    maxFilesize: 3, // MB
    quality: 85,
    output: null,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--max-size') {
      const value = parseInt(args[++i], 10);
      if (isNaN(value) || value <= 0) {
        throw new Error('--max-size must be a positive number');
      }
      options.maxSize = value;
    } else if (arg === '--max-filesize') {
      const value = parseFloat(args[++i]);
      if (isNaN(value) || value <= 0) {
        throw new Error('--max-filesize must be a positive number');
      }
      options.maxFilesize = value;
    } else if (arg === '--quality') {
      const value = parseInt(args[++i], 10);
      if (isNaN(value) || value < 1 || value > 100) {
        throw new Error('--quality must be between 1 and 100');
      }
      options.quality = value;
    } else if (arg === '--output') {
      options.output = args[++i];
      if (!options.output) {
        throw new Error('--output requires a path argument');
      }
    } else if (!options.inputTarball) {
      options.inputTarball = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Validates processing options
 *
 * @param options - Processing options to validate
 * @throws Error if validation fails
 */
export function validateArgs(options: ProcessingOptions): void {
  if (!options.inputTarball) {
    throw new Error('No input path specified');
  }
}
