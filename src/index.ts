/**
 * Public API exports for the Sanity image resize tool
 */

// Core processor
export { Processor } from './core/processor';

// Types
export type {
  ProcessingOptions,
  ProcessingStats,
  ImageMetadata,
  ParsedFilename,
  ProcessedImage,
  SanityAsset,
  SanityAssets,
  ResizeOptions,
  ResizeResult
} from './utils/types';

// Utility functions
export { parseFilename, isValidFilename, constructFilename } from './utils/filename';
export { formatBytes, formatPercent, formatDimensions } from './utils/format';

// I/O operations
export { discoverImages, getImagesToProcess } from './io/image-discovery';
export { extractTarball, createTarball } from './io/tarball';

// Transform operations
export { resizeImage, calculateNewDimensions } from './transforms/image-resize';
export { updateDataNdjson } from './transforms/data-updater';
export { updateAssetsJson } from './transforms/assets-updater';

// CLI utilities
export { Logger } from './cli/output';
export { parseArgs, validateArgs } from './cli/args';
