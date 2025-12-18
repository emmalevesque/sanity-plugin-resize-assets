/**
 * Formats bytes into human-readable string with appropriate units
 *
 * @param bytes - Number of bytes to format
 * @returns Formatted string (e.g., "1.5 MB", "256 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a percentage with one decimal place
 *
 * @param value - Decimal value (e.g., 0.75 for 75%)
 * @returns Formatted percentage string (e.g., "75.0%")
 */
export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

/**
 * Formats image dimensions as a string
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Formatted dimensions string (e.g., "1920x1080")
 */
export function formatDimensions(width: number, height: number): string {
  return `${width}x${height}`;
}
