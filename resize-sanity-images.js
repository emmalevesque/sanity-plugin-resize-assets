#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const tar = require('tar');

// ===== ANSI COLORS =====
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// ===== UTILITY FUNCTIONS =====

function parseFilename(filename) {
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function log(symbol, color, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function showHelp() {
  console.log(`
${colors.cyan}Sanity Image Resize Tool${colors.reset}

Resize images in Sanity dataset export tarball or directory while updating all
references in data.ndjson and assets.json files.

${colors.cyan}Usage:${colors.reset}
  node resize-sanity-images.js <input.tar.gz|directory> [options]

${colors.cyan}Options:${colors.reset}
  --max-size <pixels>     Maximum dimension in pixels (default: 3600)
  --max-filesize <mb>     Maximum file size in MB (default: 3)
  --quality <percent>     JPEG/WebP quality 1-100 (default: 85)
  --output <path>         Output tarball path (default: input-resized.tar.gz)
  --dry-run               Preview operations without processing
  --help                  Show this help message

${colors.cyan}Examples:${colors.reset}
  # Basic usage with tarball (3600px, 3MB)
  node resize-sanity-images.js export.tar.gz

  # Using an extracted directory
  node resize-sanity-images.js ./production-2024-12-04

  # Custom thresholds
  node resize-sanity-images.js export.tar.gz --max-size 4000 --max-filesize 5

  # Specify output location
  node resize-sanity-images.js export.tar.gz --output processed.tar.gz

  # Dry run to preview
  node resize-sanity-images.js export.tar.gz --dry-run

  # Higher quality compression
  node resize-sanity-images.js export.tar.gz --quality 90
`);
}

// ===== ARGUMENT PARSING =====

function parseArgs() {
  const args = process.argv.slice(2);

  const options = {
    inputTarball: null,
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
      options.maxSize = parseInt(args[++i], 10);
    } else if (arg === '--max-filesize') {
      options.maxFilesize = parseFloat(args[++i]);
    } else if (arg === '--quality') {
      options.quality = parseInt(args[++i], 10);
    } else if (arg === '--output') {
      options.output = args[++i];
    } else if (!options.inputTarball) {
      options.inputTarball = arg;
    }
  }

  return options;
}

// ===== MAIN FUNCTION =====

async function main() {
  // Parse arguments
  const options = parseArgs();

  // Validate required arguments
  if (!options.inputTarball) {
    log('[!]', colors.red, 'Error: No input path specified');
    console.log('Usage: node resize-sanity-images.js <input.tar.gz|directory> [options]');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  // Validate input exists
  if (!fs.existsSync(options.inputTarball)) {
    log('[!]', colors.red, `Error: Input path not found: ${options.inputTarball}`);
    process.exit(1);
  }

  // Determine if input is a directory or tarball
  const inputStats = fs.statSync(options.inputTarball);
  const isDirectory = inputStats.isDirectory();
  const isTarball = !isDirectory && (options.inputTarball.endsWith('.tar.gz') || options.inputTarball.endsWith('.tgz'));

  if (!isDirectory && !isTarball) {
    log('[!]', colors.red, 'Error: Input must be a directory or .tar.gz file');
    process.exit(1);
  }

  // Set output path if not specified
  if (!options.output) {
    if (isTarball) {
      const parsed = path.parse(options.inputTarball);
      options.output = path.join(parsed.dir, `${parsed.name}-resized${parsed.ext}`);
    } else {
      const parsed = path.parse(path.resolve(options.inputTarball));
      options.output = path.join(parsed.dir, `${parsed.name}-resized.tar.gz`);
    }
  }

  // Create temp directory in current working directory
  const tempDir = path.join(process.cwd(), `.sanity-resize-tmp-${Date.now()}`);
  let workingDir;

  try {
    // Initialize stats
    const stats = {
      processed: 0,
      skipped: 0,
      failed: 0,
      totalSaved: 0
    };

    const processedImages = [];

    if (isDirectory) {
      // Phase 1: Use directory directly
      log('[i]', colors.cyan, `Using directory: ${options.inputTarball}`);
      workingDir = path.resolve(options.inputTarball);
    } else {
      // Phase 1: Setup temp directory and extract tarball
      log('[i]', colors.cyan, `Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });

      // Phase 2: Extract tarball
      log('[i]', colors.cyan, `Extracting tarball: ${options.inputTarball}`);
      await tar.x({
        file: options.inputTarball,
        cwd: tempDir
      });

      // Find the actual working directory (handle nested structure)
      const extractedContents = fs.readdirSync(tempDir);
      if (extractedContents.length === 1 && fs.statSync(path.join(tempDir, extractedContents[0])).isDirectory()) {
        // Single directory extracted, use it as working dir
        workingDir = path.join(tempDir, extractedContents[0]);
      } else {
        // Multiple files/dirs at root level
        workingDir = tempDir;
      }
    }

    // Phase 3: Validate structure
    const imagesDir = path.join(workingDir, 'images');
    const assetsJsonPath = path.join(workingDir, 'assets.json');
    const dataNdjsonPath = path.join(workingDir, 'data.ndjson');

    if (!fs.existsSync(imagesDir)) {
      throw new Error('Missing images/ directory in tarball');
    }
    if (!fs.existsSync(assetsJsonPath)) {
      throw new Error('Missing assets.json in tarball');
    }
    if (!fs.existsSync(dataNdjsonPath)) {
      throw new Error('Missing data.ndjson in tarball');
    }

    // Phase 4: Load JSON files
    log('[i]', colors.cyan, 'Loading JSON files...');
    const assets = JSON.parse(fs.readFileSync(assetsJsonPath, 'utf8'));
    let dataLines = fs.readFileSync(dataNdjsonPath, 'utf8')
      .split('\n')
      .filter(line => line.trim());

    // Phase 5: Image discovery
    log('[i]', colors.cyan, 'Discovering images...');
    const imageFiles = fs.readdirSync(imagesDir);
    const images = [];

    for (const filename of imageFiles) {
      const parsed = parseFilename(filename);

      if (!parsed) {
        log('[~]', colors.yellow, `Skipping invalid filename: ${filename}`);
        continue;
      }

      const imagePath = path.join(imagesDir, filename);
      const stats_file = fs.statSync(imagePath);
      const longestSide = Math.max(parsed.width, parsed.height);
      const sizeMB = stats_file.size / (1024 * 1024);

      const needsProcessing = longestSide > options.maxSize || sizeMB > options.maxFilesize;

      images.push({
        filename,
        hash: parsed.hash,
        width: parsed.width,
        height: parsed.height,
        ext: parsed.ext,
        path: imagePath,
        size: stats_file.size,
        longestSide,
        needsProcessing
      });
    }

    const imagesToProcess = images.filter(img => img.needsProcessing);
    log('[i]', colors.cyan, `Found ${images.length} images (${imagesToProcess.length} need processing)`);

    if (options.dryRun) {
      log('[i]', colors.cyan, '\nDRY RUN - No changes will be made\n');
    }

    // Phase 6: Process images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Progress update every 10 images
      if (i > 0 && i % 10 === 0) {
        const percent = Math.round((i / images.length) * 100);
        log('[i]', colors.cyan, `Processing ${i}/${images.length}... (${percent}%)`);
      }

      if (!image.needsProcessing) {
        log('[~]', colors.yellow, `Skipped: ${image.filename} (already optimized: ${image.width}x${image.height}, ${formatBytes(image.size)})`);
        stats.skipped++;
        continue;
      }

      if (options.dryRun) {
        const scale = options.maxSize / image.longestSide;
        const newWidth = Math.round(image.width * scale);
        const newHeight = Math.round(image.height * scale);
        log('[+]', colors.green, `Would process: ${image.filename} -> ${image.hash}-${newWidth}x${newHeight}.${image.ext}`);
        continue;
      }

      try {
        // Get metadata from sharp
        const metadata = await sharp(image.path).metadata();

        // Calculate new dimensions
        const longestSide = Math.max(metadata.width, metadata.height);
        const scale = options.maxSize / longestSide;
        const newWidth = Math.round(metadata.width * scale);
        const newHeight = Math.round(metadata.height * scale);

        // Build sharp pipeline
        let pipeline = sharp(image.path)
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true });

        // Format-specific options
        if (image.ext === 'jpg' || image.ext === 'jpeg') {
          pipeline = pipeline.jpeg({ quality: options.quality, progressive: true });
        } else if (image.ext === 'png') {
          pipeline = pipeline.png({ quality: options.quality, compressionLevel: 9 });
        } else if (image.ext === 'webp') {
          pipeline = pipeline.webp({ quality: options.quality });
        } else if (image.ext === 'heic' || image.ext === 'heif') {
          pipeline = pipeline.heif({ quality: options.quality });
        } else if (image.ext === 'tiff' || image.ext === 'tif') {
          pipeline = pipeline.tiff({ quality: options.quality });
        }

        // Write new file
        const newFilename = `${image.hash}-${newWidth}x${newHeight}.${image.ext}`;
        const newPath = path.join(imagesDir, newFilename);
        await pipeline.toFile(newPath);

        // Get new file size
        const newSize = fs.statSync(newPath).size;
        const saved = image.size - newSize;

        // Delete old file
        fs.unlinkSync(image.path);

        // Track changes
        processedImages.push({
          hash: image.hash,
          oldFilename: image.filename,
          newFilename,
          oldWidth: image.width,
          oldHeight: image.height,
          newWidth,
          newHeight,
          oldSize: image.size,
          newSize
        });

        stats.processed++;
        stats.totalSaved += saved;

        log('[+]', colors.green,
          `Processed: ${image.filename} -> ${newFilename} (${formatBytes(image.size)} -> ${formatBytes(newSize)})`);

      } catch (error) {
        log('[!]', colors.red, `Failed: ${image.filename} - ${error.message}`);
        stats.failed++;
      }
    }

    if (options.dryRun) {
      log('[i]', colors.cyan, '\nDry run complete. No changes were made.');
      return;
    }

    // Phase 7: Update data.ndjson
    if (processedImages.length > 0) {
      log('[i]', colors.cyan, 'Updating data.ndjson references...');

      for (const img of processedImages) {
        dataLines = dataLines.map(line => {
          return line.replace(
            new RegExp(img.oldFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            img.newFilename
          );
        });
      }

      fs.writeFileSync(dataNdjsonPath, dataLines.join('\n') + '\n');
    }

    // Phase 8: Update assets.json
    if (processedImages.length > 0) {
      log('[i]', colors.cyan, 'Updating assets.json metadata...');

      for (const img of processedImages) {
        const assetKey = `image-${img.hash}`;

        if (assets[assetKey]) {
          // Update dimensions
          assets[assetKey].metadata.dimensions = {
            _type: 'sanity.imageDimensions',
            width: img.newWidth,
            height: img.newHeight,
            aspectRatio: img.newWidth / img.newHeight
          };

          // Update file size
          assets[assetKey].size = img.newSize;
        }
      }

      fs.writeFileSync(assetsJsonPath, JSON.stringify(assets, null, 2));
    }

    // Phase 9: Repackage tarball
    log('[i]', colors.cyan, 'Creating output tarball...');
    await tar.c({
      gzip: true,
      file: options.output,
      cwd: workingDir
    }, ['images', 'assets.json', 'data.ndjson']);

    const outputSize = fs.statSync(options.output).size;

    // Cleanup
    if (!isDirectory && fs.existsSync(tempDir)) {
      log('[i]', colors.cyan, 'Cleaning up temp directory...');
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Display summary
    console.log('\n=========================================');
    console.log('Sanity Image Resize Summary');
    console.log('=========================================');
    console.log(`Total found:       ${images.length} images`);
    console.log(`Processed:         ${stats.processed} images`);
    console.log(`Skipped:          ${stats.skipped} images (already optimized)`);
    console.log(`Failed:            ${stats.failed} images`);
    console.log(`Total space saved: ${formatBytes(stats.totalSaved)}`);
    console.log(`Output tarball:    ${options.output}`);
    console.log(`Output size:       ${formatBytes(outputSize)}`);
    console.log('=========================================\n');

    if (stats.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    // Cleanup on error (only if we created a temp dir)
    if (!isDirectory && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    log('[!]', colors.red, `Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// ===== EXECUTION =====
main().catch(error => {
  console.error(`${colors.red}[!] Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
