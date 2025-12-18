import type { ProcessingOptions, ProcessingStats, ProcessedImage } from '../utils/types';
import { Logger } from '../cli/output';
import { validateInputExists, validateInputType, validateSanityStructure, hasFilesDirectory } from './validator';
import { extractTarball, createTarball, detectWorkingDirectory, isTarball } from '../io/tarball';
import { discoverImages } from '../io/image-discovery';
import { resizeImage } from '../transforms/image-resize';
import { updateDataNdjson } from '../transforms/data-updater';
import { updateAssetsJson } from '../transforms/assets-updater';
import { createDir, removeDir, joinPath, parsePath, statSync, removeFile, resolvePath, existsSync } from '../io/filesystem';
import { constructFilename } from '../utils/filename';

/**
 * Main processor class that orchestrates the 9-phase image processing pipeline
 */
export class Processor {
  private options: ProcessingOptions;
  private logger: Logger;
  private tempDir: string;
  private workingDir: string = '';
  private isInputTarball: boolean = false;

  constructor(options: ProcessingOptions, logger: Logger) {
    this.options = options;
    this.logger = logger;
    this.tempDir = joinPath(process.cwd(), `.sanity-resize-tmp-${Date.now()}`);
  }

  /**
   * Runs the complete processing pipeline
   * @returns Processing statistics
   */
  async run(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      processed: 0,
      skipped: 0,
      failed: 0,
      totalSaved: 0
    };

    const processedImages: ProcessedImage[] = [];

    try {
      // Phase 1-2: Setup and extraction
      await this.setupAndExtract();

      // Phase 3: Validation
      this.validateStructure();

      // Phase 4: Load JSON files (happens on-demand in later phases)

      // Phase 5: Image discovery
      this.logger.info('Discovering images...');
      const images = discoverImages(joinPath(this.workingDir, 'images'), this.options);
      const imagesToProcess = images.filter(img => img.needsProcessing);

      this.logger.info(`Found ${images.length} images (${imagesToProcess.length} need processing)`);

      if (this.options.dryRun) {
        this.logger.info('\nDRY RUN - No changes will be made\n');
      }

      // Phase 6: Process images
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Progress update every 10 images
        if (i > 0 && i % 10 === 0) {
          this.logger.progress(i, images.length);
        }

        if (!image.needsProcessing) {
          this.logger.skipped(image);
          stats.skipped++;
          continue;
        }

        if (this.options.dryRun) {
          const newFilename = constructFilename(
            image.hash,
            Math.round(image.width * (this.options.maxSize / image.longestSide)),
            Math.round(image.height * (this.options.maxSize / image.longestSide)),
            image.ext
          );
          this.logger.dryRun(image.filename, newFilename);
          continue;
        }

        try {
          // Create new filename first
          const newFilename = constructFilename(
            image.hash,
            Math.round(image.width * (this.options.maxSize / image.longestSide)),
            Math.round(image.height * (this.options.maxSize / image.longestSide)),
            image.ext
          );
          const newPath = joinPath(joinPath(this.workingDir, 'images'), newFilename);

          // Resize image directly to new path
          const result = await resizeImage(
            image.path,
            newPath,
            {
              maxSize: this.options.maxSize,
              quality: this.options.quality,
              format: image.ext
            }
          );

          // Delete old file if filename changed
          if (newFilename !== image.filename && existsSync(image.path)) {
            removeFile(image.path);
          }

          const saved = image.size - result.size;

          // Track changes
          processedImages.push({
            hash: image.hash,
            oldFilename: image.filename,
            newFilename,
            oldWidth: image.width,
            oldHeight: image.height,
            newWidth: result.width,
            newHeight: result.height,
            oldSize: image.size,
            newSize: result.size
          });

          stats.processed++;
          stats.totalSaved += saved;

          this.logger.processed(image.filename, newFilename, image.size, result.size);
        } catch (error: any) {
          this.logger.failed(image.filename, error.message);
          stats.failed++;
        }
      }

      if (this.options.dryRun) {
        this.logger.printDryRunComplete();
        return stats;
      }

      // Phase 7: Update data.ndjson
      if (processedImages.length > 0) {
        this.logger.info('Updating data.ndjson references...');
        await updateDataNdjson(joinPath(this.workingDir, 'data.ndjson'), processedImages);
      }

      // Phase 8: Update assets.json
      if (processedImages.length > 0) {
        this.logger.info('Updating assets.json metadata...');
        await updateAssetsJson(joinPath(this.workingDir, 'assets.json'), processedImages);
      }

      // Phase 9: Repackage tarball
      await this.repackageTarball();

      // Get output size for summary
      const outputSize = statSync(this.options.output!).size;

      // Cleanup
      await this.cleanup();

      // Display summary
      this.logger.printSummary(stats, images.length, this.options.output!, outputSize);

      return stats;

    } catch (error: any) {
      // Cleanup on error
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Phase 1-2: Setup temp directory and extract tarball (or use directory directly)
   */
  private async setupAndExtract(): Promise<void> {
    // Validate input
    validateInputExists(this.options.inputTarball);
    const inputType = validateInputType(this.options.inputTarball);

    this.isInputTarball = inputType.isTarball;

    if (inputType.isDirectory) {
      // Use directory directly
      this.logger.info(`Using directory: ${this.options.inputTarball}`);
      this.workingDir = resolvePath(this.options.inputTarball);
    } else {
      // Extract tarball
      this.logger.info(`Creating temp directory: ${this.tempDir}`);
      createDir(this.tempDir);

      this.logger.info(`Extracting tarball: ${this.options.inputTarball}`);
      await extractTarball(this.options.inputTarball, this.tempDir);

      // Detect working directory (handle nested structure)
      this.workingDir = detectWorkingDirectory(this.tempDir);
    }

    // Set output path if not specified
    if (!this.options.output) {
      if (inputType.isTarball) {
        const parsed = parsePath(this.options.inputTarball);
        this.options.output = joinPath(parsed.dir, `${parsed.name}-resized${parsed.ext}`);
      } else {
        const parsed = parsePath(resolvePath(this.options.inputTarball));
        this.options.output = joinPath(parsed.dir, `${parsed.name}-resized.tar.gz`);
      }
    }
  }

  /**
   * Phase 3: Validate Sanity export structure
   */
  private validateStructure(): void {
    validateSanityStructure(this.workingDir);
  }

  /**
   * Phase 9: Create output tarball
   */
  private async repackageTarball(): Promise<void> {
    this.logger.info('Creating output tarball...');

    // Always include images, assets.json, data.ndjson
    const entries = ['images', 'assets.json', 'data.ndjson'];

    // Preserve files/ directory if present
    if (hasFilesDirectory(this.workingDir)) {
      this.logger.info('Preserving non-image assets in files/ directory');
      entries.unshift('files');
    }

    await createTarball(this.options.output!, this.workingDir, entries);
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(): Promise<void> {
    // Only cleanup if we created a temp directory
    if (this.isInputTarball && existsSync(this.tempDir)) {
      this.logger.info('Cleaning up temp directory...');
      removeDir(this.tempDir);
    }
  }
}
