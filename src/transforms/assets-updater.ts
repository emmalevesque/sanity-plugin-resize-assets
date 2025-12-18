import type { SanityAssets, ProcessedImage } from '../utils/types';
import { readJSON, write } from '../io/filesystem';

/**
 * Updates asset metadata in assets.json file
 * Updates dimensions, aspect ratio, and file size for processed images
 *
 * @param assetsJsonPath - Path to assets.json file
 * @param processedImages - Array of processed image change records
 */
export async function updateAssetsJson(
  assetsJsonPath: string,
  processedImages: ProcessedImage[]
): Promise<void> {
  // Read assets.json
  const assets: SanityAssets = await readJSON(assetsJsonPath);

  // Update each processed image's metadata
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

      // Update path if filename changed
      if (img.oldFilename !== img.newFilename) {
        assets[assetKey].path = `images/${img.newFilename}`;
      }
    }
  }

  // Write back with pretty formatting
  await write(assetsJsonPath, assets);
}

/**
 * Gets asset metadata for a specific hash
 *
 * @param assetsJsonPath - Path to assets.json file
 * @param hash - Asset hash to look up
 * @returns Asset metadata or undefined if not found
 */
export async function getAssetByHash(
  assetsJsonPath: string,
  hash: string
): Promise<any | undefined> {
  const assets: SanityAssets = await readJSON(assetsJsonPath);
  return assets[`image-${hash}`];
}

/**
 * Validates that assets.json is properly formatted
 *
 * @param assetsJsonPath - Path to assets.json file
 * @returns True if valid, false otherwise
 */
export async function validateAssetsJson(assetsJsonPath: string): Promise<boolean> {
  try {
    const assets: SanityAssets = await readJSON(assetsJsonPath);

    // Check that it's an object
    if (typeof assets !== 'object' || assets === null) {
      return false;
    }

    // Validate structure of first asset (if any exist)
    const keys = Object.keys(assets);
    if (keys.length > 0) {
      const firstAsset = assets[keys[0]];

      // Check required fields exist
      if (
        !firstAsset._id ||
        !firstAsset.assetId ||
        !firstAsset.path ||
        !firstAsset.metadata?.dimensions
      ) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Counts total number of assets in assets.json
 *
 * @param assetsJsonPath - Path to assets.json file
 * @returns Number of assets
 */
export async function countAssets(assetsJsonPath: string): Promise<number> {
  const assets: SanityAssets = await readJSON(assetsJsonPath);
  return Object.keys(assets).length;
}

/**
 * Gets all image asset hashes from assets.json
 *
 * @param assetsJsonPath - Path to assets.json file
 * @returns Array of asset hashes
 */
export async function getImageHashes(assetsJsonPath: string): Promise<string[]> {
  const assets: SanityAssets = await readJSON(assetsJsonPath);

  return Object.keys(assets)
    .filter(key => key.startsWith('image-'))
    .map(key => key.replace('image-', ''));
}
