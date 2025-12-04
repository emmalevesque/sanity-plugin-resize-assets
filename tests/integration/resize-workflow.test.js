const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createTestTarball, extractAndValidate } = require('../fixtures/test-helpers');

describe('Image Resize Workflow', () => {
  let testTarball;
  let outputTarball;
  let tempFiles = [];

  beforeEach(() => {
    // Setup test files
    testTarball = path.join(process.cwd(), `test-input-${Date.now()}.tar.gz`);
    outputTarball = path.join(process.cwd(), `test-output-${Date.now()}.tar.gz`);
    tempFiles = [testTarball, outputTarball];
  });

  afterEach(() => {
    // Cleanup test files
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  it('should process a complete tarball and reduce image sizes', async () => {
    // Create test tarball
    const { imageData } = await createTestTarball(testTarball, {
      numImages: 5,
      imageSizes: [
        { width: 4000, height: 3000 }, // Should be resized
        { width: 3600, height: 2400 }, // At threshold
        { width: 2000, height: 1500 }, // Should be skipped
        { width: 1920, height: 1080 }, // Should be skipped
        { width: 800, height: 600 }    // Should be skipped
      ]
    });

    // Run the script
    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}" --max-size 3600 --max-filesize 3`, {
      stdio: 'pipe'
    });

    // Verify output exists
    expect(fs.existsSync(outputTarball)).toBe(true);

    // Extract and validate output
    const result = await extractAndValidate(outputTarball);

    try {
      // Should have all required files
      expect(result.exists.images).toBe(true);
      expect(result.exists.assetsJson).toBe(true);
      expect(result.exists.dataNdjson).toBe(true);

      // Should have same number of images
      expect(result.images).toHaveLength(5);

      // Check first image was resized (4000x3000 -> 3600x2700)
      const largeImage = result.images.find(img =>
        img.filename.includes(imageData[0].hash)
      );
      expect(largeImage).toBeDefined();
      expect(largeImage.width).toBe(3600);
      expect(largeImage.height).toBe(2700);

      // Check smaller images were not resized
      const smallImage = result.images.find(img =>
        img.filename.includes(imageData[4].hash)
      );
      expect(smallImage.width).toBe(800);
      expect(smallImage.height).toBe(600);

      // Verify assets.json was updated
      const largeImageAsset = result.assets[`image-${imageData[0].hash}`];
      expect(largeImageAsset.metadata.dimensions.width).toBe(3600);
      expect(largeImageAsset.metadata.dimensions.height).toBe(2700);

      // Verify data.ndjson references were updated
      const imageAssetDoc = result.dataLines.find(doc =>
        doc._id === `image-${imageData[0].hash}`
      );
      expect(imageAssetDoc.path).toContain('3600x2700');

    } finally {
      result.cleanup();
    }
  }, 30000); // 30 second timeout for image processing

  it('should handle dry-run mode without making changes', async () => {
    await createTestTarball(testTarball, { numImages: 2 });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    const output = execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}" --dry-run`, {
      encoding: 'utf8'
    });

    // Should not create output file in dry-run
    expect(fs.existsSync(outputTarball)).toBe(false);

    // Should mention dry run in output
    expect(output).toContain('DRY RUN');
  }, 30000);

  it('should preserve all image references in data.ndjson', async () => {
    const { imageData } = await createTestTarball(testTarball, {
      numImages: 3,
      imageSizes: [
        { width: 5000, height: 4000 },
        { width: 4500, height: 3000 },
        { width: 4000, height: 2500 }
      ]
    });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}" --max-size 3600`, {
      stdio: 'pipe'
    });

    const result = await extractAndValidate(outputTarball);

    try {
      // All documents should still exist
      expect(result.dataLines.length).toBeGreaterThan(0);

      // Check that all image references were updated
      for (const img of imageData) {
        const docs = result.dataLines.filter(doc =>
          JSON.stringify(doc).includes(img.hash)
        );

        expect(docs.length).toBeGreaterThan(0);

        // Should not contain old dimensions
        docs.forEach(doc => {
          const docStr = JSON.stringify(doc);
          expect(docStr).not.toContain(`${img.width}x${img.height}`);
        });
      }
    } finally {
      result.cleanup();
    }
  }, 30000);

  it('should handle custom quality settings', async () => {
    await createTestTarball(testTarball, {
      numImages: 1,
      imageSizes: [{ width: 4000, height: 3000 }]
    });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');

    // Low quality
    const outputLow = outputTarball.replace('.tar.gz', '-low.tar.gz');
    tempFiles.push(outputLow);
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputLow}" --quality 50`, {
      stdio: 'pipe'
    });

    // High quality
    const outputHigh = outputTarball.replace('.tar.gz', '-high.tar.gz');
    tempFiles.push(outputHigh);
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputHigh}" --quality 95`, {
      stdio: 'pipe'
    });

    // High quality should be larger file
    const lowSize = fs.statSync(outputLow).size;
    const highSize = fs.statSync(outputHigh).size;

    expect(highSize).toBeGreaterThan(lowSize);
  }, 60000);

  it('should skip images that are already below thresholds', async () => {
    await createTestTarball(testTarball, {
      numImages: 3,
      imageSizes: [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 800, height: 600 }
      ]
    });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    const output = execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}" --max-size 3600`, {
      encoding: 'utf8'
    });

    // Should mention skipping
    expect(output).toContain('Skipped');
    expect(output).toContain('already optimized');

    const result = await extractAndValidate(outputTarball);

    try {
      // All images should retain original dimensions
      expect(result.images[0].width).toBe(1920);
      expect(result.images[1].width).toBe(1280);
      expect(result.images[2].width).toBe(800);
    } finally {
      result.cleanup();
    }
  }, 30000);

  it('should maintain aspect ratios when resizing', async () => {
    const { imageData } = await createTestTarball(testTarball, {
      numImages: 2,
      imageSizes: [
        { width: 4000, height: 3000 }, // 4:3 ratio
        { width: 5120, height: 2880 }  // 16:9 ratio
      ]
    });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}" --max-size 3600`, {
      stdio: 'pipe'
    });

    const result = await extractAndValidate(outputTarball);

    try {
      // Check 4:3 image
      const img1 = result.images.find(img => img.filename.includes(imageData[0].hash));
      const ratio1 = img1.width / img1.height;
      expect(Math.abs(ratio1 - 4/3)).toBeLessThan(0.01);

      // Check 16:9 image
      const img2 = result.images.find(img => img.filename.includes(imageData[1].hash));
      const ratio2 = img2.width / img2.height;
      expect(Math.abs(ratio2 - 16/9)).toBeLessThan(0.01);
    } finally {
      result.cleanup();
    }
  }, 30000);

  it('should update asset metadata correctly', async () => {
    const { imageData } = await createTestTarball(testTarball, {
      numImages: 1,
      imageSizes: [{ width: 5000, height: 4000 }]
    });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}" --max-size 3600`, {
      stdio: 'pipe'
    });

    const result = await extractAndValidate(outputTarball);

    try {
      const asset = result.assets[`image-${imageData[0].hash}`];

      // Check dimensions
      expect(asset.metadata.dimensions.width).toBe(3600);
      expect(asset.metadata.dimensions.height).toBe(2880); // Maintains 5:4 ratio

      // Check aspect ratio
      const expectedRatio = 3600 / 2880;
      expect(asset.metadata.dimensions.aspectRatio).toBeCloseTo(expectedRatio, 2);

      // Size should be updated
      expect(asset.size).toBeGreaterThan(0);
      expect(asset.size).toBeLessThan(imageData[0].size); // Should be smaller
    } finally {
      result.cleanup();
    }
  }, 30000);

  it('should handle missing input file gracefully', () => {
    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');
    const nonExistentFile = '/tmp/does-not-exist.tar.gz';

    expect(() => {
      execSync(`node "${scriptPath}" "${nonExistentFile}"`, {
        stdio: 'pipe'
      });
    }).toThrow();
  });

  it('should validate tarball structure', async () => {
    // Create invalid tarball (missing assets.json)
    const invalidTarball = path.join(process.cwd(), `test-invalid-${Date.now()}.tar.gz`);
    tempFiles.push(invalidTarball);

    const tempDir = path.join(process.cwd(), `.test-invalid-${Date.now()}`);
    fs.mkdirSync(path.join(tempDir, 'images'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'data.ndjson'), '{}');

    const tar = require('tar');
    await tar.c({
      gzip: true,
      file: invalidTarball,
      cwd: tempDir
    }, ['images', 'data.ndjson']);

    fs.rmSync(tempDir, { recursive: true, force: true });

    const scriptPath = path.join(__dirname, '../../resize-sanity-images.js');

    expect(() => {
      execSync(`node "${scriptPath}" "${invalidTarball}" --output "${outputTarball}"`, {
        stdio: 'pipe'
      });
    }).toThrow();
  }, 30000);
});
