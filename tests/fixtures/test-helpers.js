import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as tar from 'tar';

/**
 * Creates a test image with specified dimensions
 */
async function createTestImage(width, height, outputPath) {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 }
    }
  })
  .jpeg({ quality: 90 })
  .toFile(outputPath);

  return outputPath;
}

/**
 * Creates a complete test tarball with Sanity export structure
 */
async function createTestTarball(outputPath, options = {}) {
  const {
    numImages = 5,
    imageSizes = [
      { width: 4000, height: 3000, size: 8 * 1024 * 1024 }, // Large - needs processing
      { width: 3600, height: 2400, size: 4 * 1024 * 1024 }, // At threshold
      { width: 2000, height: 1500, size: 2 * 1024 * 1024 }, // Medium - ok
      { width: 1920, height: 1080, size: 1.5 * 1024 * 1024 }, // Standard - ok
      { width: 800, height: 600, size: 0.5 * 1024 * 1024 }  // Small - ok
    ],
    includeFiles = false
  } = options;

  const tempDir = path.join(process.cwd(), `.test-export-${Date.now()}`);
  const imagesDir = path.join(tempDir, 'images');
  const filesDir = path.join(tempDir, 'files');

  fs.mkdirSync(imagesDir, { recursive: true });
  if (includeFiles) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  const assets = {};
  const dataLines = [];
  const imageData = [];

  // Create test images
  for (let i = 0; i < Math.min(numImages, imageSizes.length); i++) {
    const { width, height } = imageSizes[i];
    const hash = `test${i}hash${Math.random().toString(36).substring(7)}`.padEnd(40, '0');
    const filename = `${hash}-${width}x${height}.jpg`;
    const imagePath = path.join(imagesDir, filename);

    await createTestImage(width, height, imagePath);
    const stats = fs.statSync(imagePath);

    // Add to assets.json
    assets[`image-${hash}`] = {
      _id: `image-${hash}`,
      assetId: hash,
      path: `images/${filename}`,
      url: `https://cdn.sanity.io/images/project/dataset/${hash}-${width}x${height}.jpg`,
      metadata: {
        dimensions: {
          _type: 'sanity.imageDimensions',
          width,
          height,
          aspectRatio: width / height
        }
      },
      size: stats.size
    };

    // Add to data.ndjson
    dataLines.push(JSON.stringify({
      _id: `image-${hash}`,
      _type: 'sanity.imageAsset',
      assetId: hash,
      path: `images/${filename}`,
      url: `https://cdn.sanity.io/images/project/dataset/${hash}-${width}x${height}.jpg`
    }));

    // Reference in a document
    dataLines.push(JSON.stringify({
      _id: `doc-${i}`,
      _type: 'testDocument',
      image: {
        _type: 'image',
        asset: {
          _ref: `image-${hash}`,
          _type: 'reference'
        }
      },
      imageUrl: `https://cdn.sanity.io/images/project/dataset/${hash}-${width}x${height}.jpg`
    }));

    imageData.push({ hash, filename, width, height, size: stats.size });
  }

  // Optionally add a PDF file and corresponding file asset
  let fileAssetData = null;
  if (includeFiles) {
    const fileHash = `filehash${Math.random().toString(36).substring(7)}`.padEnd(40, '0');
    const fileName = `${fileHash}.pdf`;
    const filePath = path.join(filesDir, fileName);
    // Create a dummy PDF-like file (not a valid PDF, but sufficient for presence checks)
    const dummyContent = Buffer.from('%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');
    fs.writeFileSync(filePath, dummyContent);
    const fstats = fs.statSync(filePath);

    assets[`file-${fileHash}`] = {
      _id: `file-${fileHash}`,
      assetId: fileHash,
      path: `files/${fileName}`,
      url: `https://cdn.sanity.io/files/project/dataset/${fileName}`,
      mimeType: 'application/pdf',
      size: fstats.size
    };

    // Add file asset doc
    dataLines.push(JSON.stringify({
      _id: `file-${fileHash}`,
      _type: 'sanity.fileAsset',
      assetId: fileHash,
      path: `files/${fileName}`,
      url: `https://cdn.sanity.io/files/project/dataset/${fileName}`,
      mimeType: 'application/pdf'
    }));

    fileAssetData = { hash: fileHash, filename: fileName, size: fstats.size };
  }

  // Write assets.json
  fs.writeFileSync(
    path.join(tempDir, 'assets.json'),
    JSON.stringify(assets, null, 2)
  );

  // Write data.ndjson
  fs.writeFileSync(
    path.join(tempDir, 'data.ndjson'),
    dataLines.join('\n') + '\n'
  );

  // Create tarball
  await tar.c({
    gzip: true,
    file: outputPath,
    cwd: tempDir
  }, includeFiles ? ['files', 'images', 'assets.json', 'data.ndjson'] : ['images', 'assets.json', 'data.ndjson']);

  // Cleanup temp dir
  fs.rmSync(tempDir, { recursive: true, force: true });

  return { tarballPath: outputPath, imageData, assets, fileAssetData };
}

/**
 * Extracts and validates tarball structure
 */
async function extractAndValidate(tarballPath) {
  const tempDir = path.join(process.cwd(), `.test-extract-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  await tar.x({
    file: tarballPath,
    cwd: tempDir
  });

  const imagesDir = path.join(tempDir, 'images');
  const filesDir = path.join(tempDir, 'files');
  const assetsJsonPath = path.join(tempDir, 'assets.json');
  const dataNdjsonPath = path.join(tempDir, 'data.ndjson');

  const exists = {
    images: fs.existsSync(imagesDir),
    files: fs.existsSync(filesDir),
    assetsJson: fs.existsSync(assetsJsonPath),
    dataNdjson: fs.existsSync(dataNdjsonPath)
  };

  let assets = null;
  let dataLines = [];
  let images = [];
  let files = [];

  if (exists.assetsJson) {
    assets = JSON.parse(fs.readFileSync(assetsJsonPath, 'utf8'));
  }

  if (exists.dataNdjson) {
    dataLines = fs.readFileSync(dataNdjsonPath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }

  if (exists.images) {
    const files = fs.readdirSync(imagesDir);
    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      const metadata = await sharp(filePath).metadata();

      images.push({
        filename: file,
        width: metadata.width,
        height: metadata.height,
        size: stats.size,
        format: metadata.format
      });
    }
  }

  if (exists.files) {
    const fileList = fs.readdirSync(filesDir);
    for (const fname of fileList) {
      const fpath = path.join(filesDir, fname);
      const fstats = fs.statSync(fpath);
      const md5 = require('crypto').createHash('md5').update(fs.readFileSync(fpath)).digest('hex');
      files.push({ filename: fname, size: fstats.size, md5 });
    }
  }

  return {
    tempDir,
    exists,
    assets,
    dataLines,
    images,
    files,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true })
  };
}

/**
 * Parses Sanity image filename
 */
function parseFilename(filename) {
  const match = filename.match(/^([a-f0-9]+)-(\d+)x(\d+)\.([a-z]+)$/i);
  if (!match) return null;

  return {
    hash: match[1],
    width: parseInt(match[2], 10),
    height: parseInt(match[3], 10),
    ext: match[4].toLowerCase()
  };
}

export {
  createTestImage,
  createTestTarball,
  extractAndValidate,
  parseFilename
};
