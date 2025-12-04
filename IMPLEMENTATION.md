# Implementation Details

## Architecture

This tool is implemented as a Node.js script with a Fish shell wrapper for convenient command-line usage.

### Core Components

1. **resize-sanity-images.js** - Main Node.js script
2. **~/.config/fish/functions/resize-sanity-images.fish** - Fish shell wrapper
3. **package.json** - Node.js dependencies

## Dependencies

- **sharp** (^0.33.0) - Fast image processing library
  - Supports JPEG, PNG, WebP, HEIC, TIFF, and more
  - Significantly faster than ImageMagick
  - Built on libvips

- **tar** (^7.0.0) - Tarball extraction and creation
  - Handles gzip compression automatically
  - Streaming interface for efficiency

## File Structure

```
sanity-plugin-resize-assets/
├── resize-sanity-images.js    # Main script
├── package.json               # Dependencies
├── package-lock.json          # Locked dependency versions
├── node_modules/              # Installed packages
├── README.md                  # User documentation
└── IMPLEMENTATION.md          # This file
```

## Processing Workflow

### Phase 1: Initialization & Validation
- Parse command-line arguments
- Validate input tarball exists
- Set default values for optional parameters
- Create temporary directory: `./.sanity-resize-tmp-${timestamp}/`

### Phase 2: Tarball Extraction
- Extract tarball to temp directory using `tar.x()`
- Verify required files exist:
  - `images/` directory
  - `assets.json` file
  - `data.ndjson` file

### Phase 3: JSON Parsing
- Load `assets.json` as JSON object
- Load `data.ndjson` and split into array of lines
- Preserve original formatting for data.ndjson

### Phase 4: Image Discovery & Analysis
- Scan `images/` directory
- Parse each filename to extract: `{hash}`, `{width}`, `{height}`, `{ext}`
- Get file size using `fs.statSync()`
- Calculate longest side
- Determine if processing needed based on thresholds

### Phase 5: Image Processing
For each image that needs processing:

1. **Load with Sharp**: `sharp(imagePath).metadata()`
2. **Calculate new dimensions**: Maintain aspect ratio based on max-size
3. **Build pipeline**: Apply format-specific options
   - JPEG: Progressive encoding, quality setting
   - PNG: Compression level 9
   - WebP: Quality setting
   - HEIC: Quality setting (if supported)
4. **Write new file**: Save with updated dimensions in filename
5. **Delete old file**: Remove original
6. **Track changes**: Store old/new filenames and dimensions

### Phase 6: Update data.ndjson
- For each processed image:
  - Find all occurrences of old filename
  - Replace with new filename
  - Use escaped regex for safety
- Write updated content back to file

### Phase 7: Update assets.json
- For each processed image:
  - Find asset by key: `image-{hash}`
  - Update `metadata.dimensions` object:
    - width
    - height
    - aspectRatio (width / height)
  - Update `size` field with new file size
- Write updated JSON back to file (pretty-printed)

### Phase 8: Repackaging
- Create new tarball with gzip compression
- Include: `images/`, `assets.json`, `data.ndjson`
- Write to output path

### Phase 9: Cleanup & Summary
- Remove temporary directory
- Display summary statistics
- Exit with code 0 (success) or 1 (failures occurred)

## Utility Functions

### `parseFilename(filename)`
Extracts hash, dimensions, and extension from Sanity image filename.

**Input**: `"3971e99d050ddfaddf8ca4aa06f5e63bbd55d562-1920x1279.jpg"`

**Output**:
```javascript
{
  hash: "3971e99d050ddfaddf8ca4aa06f5e63bbd55d562",
  width: 1920,
  height: 1279,
  ext: "jpg"
}
```

**Pattern**: `/^([a-f0-9]+)-(\d+)x(\d+)\.([a-z]+)$/i`

### `formatBytes(bytes)`
Converts bytes to human-readable format.

**Examples**:
- `1024` → `"1 KB"`
- `1048576` → `"1 MB"`
- `2621440` → `"2.5 MB"`

### `log(symbol, color, message)`
Prints colored console output with status symbols.

**Symbols**:
- `[+]` Success (green)
- `[~]` Warning/skipped (yellow)
- `[!]` Error (red)
- `[i]` Info (cyan)

## ANSI Color Codes

```javascript
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',      // Errors
  green: '\x1b[32m',    // Success
  yellow: '\x1b[33m',   // Warnings
  cyan: '\x1b[36m'      // Info
};
```

## Image Processing Details

### Dimension Calculation

```javascript
const longestSide = Math.max(metadata.width, metadata.height);
const scale = maxSize / longestSide;
const newWidth = Math.round(metadata.width * scale);
const newHeight = Math.round(metadata.height * scale);
```

**Example**:
- Original: 4032x3024
- Max size: 3600
- Longest side: 4032
- Scale: 3600 / 4032 = 0.893
- New width: 4032 * 0.893 = 3600
- New height: 3024 * 0.893 = 2700

### Format-Specific Options

**JPEG/JPG**:
```javascript
sharp(imagePath)
  .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85, progressive: true })
  .toFile(outputPath);
```

**PNG**:
```javascript
sharp(imagePath)
  .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
  .png({ quality: 85, compressionLevel: 9 })
  .toFile(outputPath);
```

**WebP**:
```javascript
sharp(imagePath)
  .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 85 })
  .toFile(outputPath);
```

**HEIC/HEIF**:
```javascript
sharp(imagePath)
  .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
  .heif({ quality: 85 })
  .toFile(outputPath);
```

## Reference Update Strategy

### data.ndjson Updates

Uses escaped regex to safely replace filenames:

```javascript
const escapedFilename = oldFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
dataLines = dataLines.map(line => {
  return line.replace(new RegExp(escapedFilename, 'g'), newFilename);
});
```

**Why escape?**: Filenames may contain special regex characters like `.` which need escaping.

### assets.json Updates

Direct object property updates:

```javascript
const assetKey = `image-${hash}`;
if (assets[assetKey]) {
  assets[assetKey].metadata.dimensions = {
    _type: 'sanity.imageDimensions',
    width: newWidth,
    height: newHeight,
    aspectRatio: newWidth / newHeight
  };
  assets[assetKey].size = newSize;
}
```

## Error Handling

### Critical Errors (Exit Code 1)
- Input tarball doesn't exist
- Missing dependencies (sharp, tar)
- Cannot create temp directory
- Cannot extract tarball
- Missing required files in export
- Cannot parse JSON files
- Cannot create output tarball

### Recoverable Errors (Continue Processing)
- Corrupt image file → Skip, log error, increment failed counter
- Unsupported format → Skip with warning
- Sharp processing fails → Log error, continue
- Cannot parse filename → Skip, log warning

### Error Pattern

```javascript
try {
  // Process image
} catch (error) {
  log('[!]', colors.red, `Failed: ${filename} - ${error.message}`);
  stats.failed++;
  continue;
}
```

## Fish Shell Wrapper

The Fish wrapper provides a convenient interface with Fish-style argument parsing:

```fish
function resize-sanity-images
    argparse 'h/help' 'm/max-size=' 's/max-filesize=' 'q/quality=' 'o/output=' 'P/dry-run' -- $argv
    # ... build node command ...
    eval $node_cmd
end
```

**Features**:
- Checks for Node.js availability
- Converts Fish flags to Node.js arguments
- Provides helpful error messages
- Passes through to Node.js script

## Performance Considerations

- **Sharp Performance**: Processes ~234 images in 30-60 seconds
- **Memory Usage**: Sharp uses streaming where possible
- **Disk I/O**: Temp directory in working directory for safety
- **No Parallelization**: Sequential processing is sufficient for most use cases

## Future Enhancements (Not Implemented)

1. **Parallel Processing**: Use worker threads for large datasets
2. **Progress Bar**: Visual progress indicator with ETA
3. **Quality Presets**: Named presets (web, archive, thumbnail)
4. **Backup Option**: Preserve original tarball
5. **Resume Capability**: Continue interrupted operations
6. **Batch Processing**: Handle multiple tarballs
7. **Format Conversion**: Convert between formats (e.g., HEIC → JPEG)
8. **Metadata Preservation**: Optional EXIF preservation

## Testing

### Manual Test Cases

1. **Small tarball** with 10-20 mixed format images
2. **Large tarball** with 100+ images
3. **Already-optimized images** (all below thresholds)
4. **Oversized images** (all above thresholds)
5. **Dry run mode** (verify no changes made)
6. **Custom parameters** (different max-size, quality)

### Edge Cases to Test

- Images with same hash but different dimensions
- Missing entries in assets.json
- Malformed filenames in images/ directory
- Empty images directory
- Corrupt or invalid image files
- Extremely large images (>10000px)
- Very small images (<100px)

## Troubleshooting

### "Cannot find module 'sharp'"
```bash
cd ~/Code/sanity-plugin-resize-assets
npm install
```

### "Input tarball not found"
Ensure the path to the tarball is correct (relative or absolute).

### "Missing images/ directory in tarball"
The tarball must contain a valid Sanity export structure.

### Sharp fails on HEIC images
May need to install libheif:
```bash
brew install libheif
```

## Development Notes

### Why Sharp over ImageMagick?
- **Performance**: 4-5x faster for batch operations
- **Memory**: More efficient streaming
- **Dependencies**: Easier to install (npm package)
- **API**: Modern JavaScript async/await
- **Quality**: Excellent output quality

### Why Local Temp Directory?
- **Safety**: Easier to debug if something fails
- **Permissions**: No system temp directory permission issues
- **Cleanup**: Clear ownership of temp files

### Why Escape Regex in Replacements?
Filenames contain `.` which is a regex wildcard. Without escaping:
- `image-abc-1920x1080.jpg` would match `image-abc-1920x1080Xjpg`

With escaping:
- Only exact filename matches are replaced

## License

ISC
