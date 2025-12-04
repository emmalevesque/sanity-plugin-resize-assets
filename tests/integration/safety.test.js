import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { createTestTarball, extractAndValidate } from '../fixtures/test-helpers.js';

describe('Safety and Edge Cases', () => {
  let testTarball;
  let outputTarball;
  let tempFiles = [];

  beforeEach(() => {
    testTarball = path.join(process.cwd(), `test-safety-${Date.now()}.tar.gz`);
    outputTarball = path.join(process.cwd(), `test-safety-output-${Date.now()}.tar.gz`);
    tempFiles = [testTarball, outputTarball];
  });

  afterEach(() => {
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  it('should not corrupt original tarball when processing fails', async () => {
    await createTestTarball(testTarball, { numImages: 2 });

    // Get original tarball hash
    const originalContent = fs.readFileSync(testTarball);
    const originalHash = crypto
      .createHash('md5')
      .update(originalContent)
      .digest('hex');

    // Try to process with invalid output path (should fail)
    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    const invalidOutput = '/invalid/path/that/does/not/exist/output.tar.gz';

    try {
      execSync(`node "${scriptPath}" "${testTarball}" --output "${invalidOutput}"`, {
        stdio: 'pipe'
      });
    } catch (e) {
      // Expected to fail
    }

    // Original tarball should be unchanged
    const currentContent = fs.readFileSync(testTarball);
    const currentHash = crypto
      .createHash('md5')
      .update(currentContent)
      .digest('hex');

    expect(currentHash).toBe(originalHash);
  }, 30000);

  it('should not leave temp directories after successful processing', async () => {
    await createTestTarball(testTarball, { numImages: 2 });

    const cwdBefore = fs.readdirSync(process.cwd());

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}"`, {
      stdio: 'pipe'
    });

    const cwdAfter = fs.readdirSync(process.cwd());

    // Filter out our test files
    const tempDirsBefore = cwdBefore.filter(f => f.startsWith('.sanity-resize-tmp-'));
    const tempDirsAfter = cwdAfter.filter(f => f.startsWith('.sanity-resize-tmp-'));

    expect(tempDirsAfter.length).toBe(tempDirsBefore.length);
  }, 30000);

  it('should cleanup temp directories on failure', async () => {
    // Create a tarball with invalid structure to trigger error
    const tempDir = path.join(process.cwd(), `.test-bad-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'invalid.txt'), 'not a valid structure');

    const tar = await import('tar');
    await tar.c({
      gzip: true,
      file: testTarball,
      cwd: tempDir
    }, ['invalid.txt']);

    fs.rmSync(tempDir, { recursive: true, force: true });

    const cwdBefore = fs.readdirSync(process.cwd());
    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');

    try {
      execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}"`, {
        stdio: 'pipe'
      });
    } catch (e) {
      // Expected to fail
    }

    const cwdAfter = fs.readdirSync(process.cwd());

    // No new temp directories should remain
    const tempDirsBefore = cwdBefore.filter(f => f.startsWith('.sanity-resize-tmp-'));
    const tempDirsAfter = cwdAfter.filter(f => f.startsWith('.sanity-resize-tmp-'));

    expect(tempDirsAfter.length).toBe(tempDirsBefore.length);
  }, 30000);

  it('should preserve original files when dry-run is used', async () => {
    const { imageData } = await createTestTarball(testTarball, {
      numImages: 2,
      imageSizes: [
        { width: 5000, height: 4000 },
        { width: 4500, height: 3000 }
      ]
    });

    // Extract original for comparison
    const originalResult = await extractAndValidate(testTarball);
    const originalImage = originalResult.images.find(img =>
      img.filename.includes(imageData[0].hash)
    );

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    execSync(`node "${scriptPath}" "${testTarball}" --dry-run`, {
      stdio: 'pipe'
    });

    // Verify original tarball is still valid and unchanged
    const afterResult = await extractAndValidate(testTarball);
    const afterImage = afterResult.images.find(img =>
      img.filename.includes(imageData[0].hash)
    );

    expect(afterImage.width).toBe(originalImage.width);
    expect(afterImage.height).toBe(originalImage.height);
    expect(afterImage.size).toBe(originalImage.size);

    originalResult.cleanup();
    afterResult.cleanup();
  }, 30000);

  it('should handle image hashes that appear in multiple places', async () => {
    // This tests that regex replacement doesn't break other data
    await createTestTarball(testTarball, {
      numImages: 1,
      imageSizes: [{ width: 5000, height: 4000 }]
    });

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}"`, {
      stdio: 'pipe'
    });

    const result = await extractAndValidate(outputTarball);

    try {
      // Parse all documents and ensure they're valid JSON
      result.dataLines.forEach(doc => {
        expect(doc).toBeDefined();
        expect(typeof doc).toBe('object');

        // If it has image references, they should use new dimensions
        if (doc._type === 'sanity.imageAsset' || doc.image) {
          const docStr = JSON.stringify(doc);
          // Should not contain original 5000x4000
          expect(docStr).not.toContain('5000x4000');
        }
      });
    } finally {
      result.cleanup();
    }
  }, 30000);

  it('should handle special characters in file paths', async () => {
    const specialPathTarball = path.join(process.cwd(), `test with spaces-${Date.now()}.tar.gz`);
    const specialPathOutput = path.join(process.cwd(), `output with spaces-${Date.now()}.tar.gz`);
    tempFiles.push(specialPathTarball, specialPathOutput);

    await createTestTarball(specialPathTarball, { numImages: 1 });

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    execSync(`node "${scriptPath}" "${specialPathTarball}" --output "${specialPathOutput}"`, {
      stdio: 'pipe'
    });

    expect(fs.existsSync(specialPathOutput)).toBe(true);
  }, 30000);

  it('should not process already-processed tarballs twice', async () => {
    await createTestTarball(testTarball, {
      numImages: 2,
      imageSizes: [
        { width: 4000, height: 3000 },
        { width: 3000, height: 2000 }
      ]
    });

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');

    // First processing
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}"`, {
      stdio: 'pipe'
    });

    const firstResult = await extractAndValidate(outputTarball);
    const firstSizes = firstResult.images.map(img => ({
      filename: img.filename,
      size: img.size
    }));
    firstResult.cleanup();

    // Second processing (should skip all images)
    const output2 = outputTarball.replace('.tar.gz', '-2.tar.gz');
    tempFiles.push(output2);

    const secondOutput = execSync(`node "${scriptPath}" "${outputTarball}" --output "${output2}"`, {
      encoding: 'utf8'
    });

    // Should mention skipping
    expect(secondOutput).toContain('Skipped');

    const secondResult = await extractAndValidate(output2);
    const secondSizes = secondResult.images.map(img => ({
      filename: img.filename,
      size: img.size
    }));

    // Sizes should be the same (no further compression)
    firstSizes.forEach((first, i) => {
      const second = secondSizes[i];
      expect(second.filename).toBe(first.filename);
      // Size might vary slightly due to recompression, but should be close
      expect(Math.abs(second.size - first.size)).toBeLessThan(first.size * 0.1);
    });

    secondResult.cleanup();
  }, 60000);

  it('should validate required command line arguments', () => {
    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');

    // No arguments
    expect(() => {
      execSync(`node "${scriptPath}"`, { stdio: 'pipe' });
    }).toThrow();
  });

  it('should handle very small images without errors', async () => {
    await createTestTarball(testTarball, {
      numImages: 2,
      imageSizes: [
        { width: 100, height: 100 },
        { width: 50, height: 50 }
      ]
    });

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    const output = execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}"`, {
      encoding: 'utf8'
    });

    expect(output).toContain('Skipped');

    const result = await extractAndValidate(outputTarball);
    expect(result.images).toHaveLength(2);
    result.cleanup();
  }, 30000);

  it('should preserve image format after resizing', async () => {
    // Note: We're only testing JPEG in fixtures for now
    // but this test validates the format is preserved
    await createTestTarball(testTarball, {
      numImages: 1,
      imageSizes: [{ width: 5000, height: 4000 }]
    });

    const scriptPath = path.join(process.cwd(), 'resize-sanity-images.cjs');
    execSync(`node "${scriptPath}" "${testTarball}" --output "${outputTarball}"`, {
      stdio: 'pipe'
    });

    const result = await extractAndValidate(outputTarball);

    try {
      result.images.forEach(img => {
        expect(img.format).toBe('jpeg');
        expect(img.filename).toMatch(/\.jpg$/);
      });
    } finally {
      result.cleanup();
    }
  }, 30000);
});
