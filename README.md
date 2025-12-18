# Sanity Image Resize Tool

A command-line tool for resizing images in Sanity dataset export tarballs while automatically updating all references in `data.ndjson` and `assets.json` files.

## Features

- **Conditional Processing**: Only resizes images that exceed dimension or filesize thresholds
- **Format Preservation**: Maintains original image formats (JPEG, PNG, WebP, HEIC, etc.)
- **Reference Updates**: Automatically updates filenames in `data.ndjson` and dimensions in `assets.json`
- **Progress Tracking**: Real-time progress updates with colored output
- **Dry Run Mode**: Preview operations without making changes
- **Safe Cleanup**: Uses local temp directory for easy debugging

## Installation

```bash
cd ~/Code/sanity-plugin-resize-assets
npm install
```

## Usage

### Direct Node.js Usage

```bash
node resize-sanity-images.js <input.tar.gz> [options]
```

### Fish Shell Function

If you're using Fish shell, a wrapper function is available at:
`~/.config/fish/functions/resize-sanity-images.fish`

```fish
resize-sanity-images <input.tar.gz> [options]
```

## Options

- `--max-size <pixels>` - Maximum dimension in pixels (default: 3600)
- `--max-filesize <mb>` - Maximum file size in MB (default: 3)
- `--quality <percent>` - JPEG/WebP quality 1-100 (default: 85)
- `--output <path>` - Output tarball path (default: `input-resized.tar.gz`)
- `--dry-run` - Preview operations without processing
- `--help` - Show help message

## Examples

### Basic usage with defaults (3600px, 3MB)
```bash
resize-sanity-images export.tar.gz
```

### Custom thresholds
```bash
resize-sanity-images export.tar.gz --max-size 4000 --max-filesize 5
```

### Specify output location
```bash
resize-sanity-images export.tar.gz --output processed.tar.gz
```

### Dry run to preview
```bash
resize-sanity-images export.tar.gz --dry-run
```

### Higher quality compression
```bash
resize-sanity-images export.tar.gz --quality 90
```

## How It Works

1. **Extraction**: Extracts the tarball to a temporary directory
2. **Analysis**: Scans all images and determines which need processing
3. **Processing**: Resizes images that exceed thresholds while maintaining aspect ratio
4. **Update References**: Updates all filename references in `data.ndjson`
5. **Update Metadata**: Updates dimensions and file sizes in `assets.json`
6. **Repackage**: Creates a new tarball with processed images
7. **Cleanup**: Removes temporary files

## Sanity Export Structure

The tool expects a tarball with the following structure. If a `files/` directory exists (e.g., PDFs or other non-image assets), it is preserved unchanged in the output tarball so subsequent imports can locate those assets.

```
export.tar.gz
├── images/
│   ├── {hash}-{width}x{height}.{ext}
│   └── ...
├── files/ (optional)
│   ├── {assetHash}.pdf
│   └── ...
├── assets.json
└── data.ndjson
```

### Filename Format

Images follow the pattern: `{hash}-{width}x{height}.{ext}`

Example: `3971e99d050ddfaddf8ca4aa06f5e63bbd55d562-1920x1279.jpg`

When resized, the hash is preserved but dimensions are updated:
`3971e99d050ddfaddf8ca4aa06f5e63bbd55d562-1920x1279.jpg` → `3971e99d050ddfaddf8ca4aa06f5e63bbd55d562-1710x1140.jpg`

## Dependencies

- [sharp](https://sharp.pixelplumbing.com/) - Fast image processing
- [tar](https://www.npmjs.com/package/tar) - Tarball extraction and creation

## Requirements

- Node.js 14 or higher
- macOS, Linux, or Windows

## Output

The tool provides detailed progress information:

```
[i] Extracting tarball: export.tar.gz
[i] Found 234 images (156 need processing)
[i] Processing 10/234... (4%)
[+] Processed: abc123-4032x3024.jpg -> abc123-3600x2700.jpg (8.2MB -> 2.4MB)
[~] Skipped: def456-1920x1080.jpg (already optimized: 1920x1080, 1.2MB)
[i] Updating data.ndjson references...
[i] Updating assets.json metadata...
[i] Creating output tarball...
=========================================
Sanity Image Resize Summary
=========================================
Total found:       234 images
Processed:         156 images
Skipped:          76 images (already optimized)
Failed:            2 images
Total space saved: 892.5 MB
Output tarball:    export-resized.tar.gz
=========================================
```

## License

ISC
