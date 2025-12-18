/**
 * TypeScript type definitions for the Sanity image resize tool
 */

/**
 * Processing options for the image resize tool
 */
export interface ProcessingOptions {
  /** Input tarball path or directory path */
  inputTarball: string;
  /** Maximum dimension in pixels (default: 3600) */
  maxSize: number;
  /** Maximum file size in MB (default: 3) */
  maxFilesize: number;
  /** JPEG/WebP quality 1-100 (default: 85) */
  quality: number;
  /** Output tarball path (auto-generated if null) */
  output: string | null;
  /** Preview operations without processing */
  dryRun: boolean;
}

/**
 * Parsed Sanity image filename structure
 * Format: {hash}-{width}x{height}.{ext}
 */
export interface ParsedFilename {
  /** Asset hash (hexadecimal) */
  hash: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** File extension (lowercase) */
  ext: string;
}

/**
 * Image metadata collected during discovery phase
 */
export interface ImageMetadata {
  /** Original filename */
  filename: string;
  /** Asset hash */
  hash: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** File extension */
  ext: string;
  /** Full file path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Longest dimension (max of width and height) */
  longestSide: number;
  /** Whether image needs processing based on thresholds */
  needsProcessing: boolean;
}

/**
 * Processing statistics tracked during execution
 */
export interface ProcessingStats {
  /** Number of images successfully processed */
  processed: number;
  /** Number of images skipped (already optimized) */
  skipped: number;
  /** Number of images that failed to process */
  failed: number;
  /** Total bytes saved from processing */
  totalSaved: number;
}

/**
 * Sanity asset metadata structure from assets.json
 */
export interface SanityAsset {
  /** Asset document ID */
  _id: string;
  /** Asset hash */
  assetId: string;
  /** Relative path in tarball */
  path: string;
  /** CDN URL */
  url: string;
  /** Asset metadata */
  metadata: {
    /** Image dimensions */
    dimensions: {
      /** Sanity type identifier */
      _type: 'sanity.imageDimensions';
      /** Image width in pixels */
      width: number;
      /** Image height in pixels */
      height: number;
      /** Aspect ratio (width / height) */
      aspectRatio: number;
    };
  };
  /** File size in bytes */
  size: number;
}

/**
 * Collection of all Sanity assets keyed by asset ID
 * Key format: "image-{hash}"
 */
export interface SanityAssets {
  [key: string]: SanityAsset;
}

/**
 * Processed image change record
 */
export interface ProcessedImage {
  /** Asset hash */
  hash: string;
  /** Original filename */
  oldFilename: string;
  /** New filename after processing */
  newFilename: string;
  /** Original width */
  oldWidth: number;
  /** Original height */
  oldHeight: number;
  /** New width after resize */
  newWidth: number;
  /** New height after resize */
  newHeight: number;
  /** Original file size in bytes */
  oldSize: number;
  /** New file size in bytes */
  newSize: number;
}

/**
 * Resize options for Sharp image processing
 */
export interface ResizeOptions {
  /** Maximum dimension in pixels */
  maxSize: number;
  /** JPEG/WebP quality 1-100 */
  quality: number;
  /** File extension (determines output format) */
  format: string;
}

/**
 * Result of image resize operation
 */
export interface ResizeResult {
  /** New width after resize */
  width: number;
  /** New height after resize */
  height: number;
  /** New file size in bytes */
  size: number;
}
