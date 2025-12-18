import fs from 'fs';
import path from 'path';

/**
 * Checks if a file or directory exists using Bun's file API
 *
 * @param filePath - Path to check
 * @returns True if file/directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
  return await Bun.file(filePath).exists();
}

/**
 * Synchronous version of exists check
 * Uses Node.js fs for compatibility with sync operations
 *
 * @param filePath - Path to check
 * @returns True if file/directory exists
 */
export function existsSync(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Reads a file as text using Bun's optimized file reading
 *
 * @param filePath - Path to file
 * @returns File contents as string
 */
export async function readText(filePath: string): Promise<string> {
  return await Bun.file(filePath).text();
}

/**
 * Reads a file as JSON and parses it
 *
 * @param filePath - Path to JSON file
 * @returns Parsed JSON object
 */
export async function readJSON<T = any>(filePath: string): Promise<T> {
  const text = await readText(filePath);
  return JSON.parse(text);
}

/**
 * Writes content to a file using Bun's optimized file writing
 *
 * @param filePath - Path to file
 * @param content - Content to write (string or object)
 */
export async function write(filePath: string, content: string | object): Promise<void> {
  const data = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  await Bun.write(filePath, data);
}

/**
 * Gets file statistics (size, modification time, etc.)
 *
 * @param filePath - Path to file
 * @returns File statistics
 */
export async function stat(filePath: string): Promise<{ size: number; mtime: Date; isDirectory: boolean }> {
  const file = Bun.file(filePath);
  const size = await file.size;

  // Use fs.statSync for additional metadata not available in Bun.file()
  const stats = fs.statSync(filePath);

  return {
    size,
    mtime: stats.mtime,
    isDirectory: stats.isDirectory()
  };
}

/**
 * Synchronous version of stat
 *
 * @param filePath - Path to file
 * @returns File statistics
 */
export function statSync(filePath: string): { size: number; mtime: Date; isDirectory: boolean } {
  const stats = fs.statSync(filePath);

  return {
    size: stats.size,
    mtime: stats.mtime,
    isDirectory: stats.isDirectory()
  };
}

/**
 * Gets file size in bytes
 *
 * @param filePath - Path to file
 * @returns File size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  return await Bun.file(filePath).size;
}

/**
 * Reads a directory and returns list of files/directories
 *
 * @param dirPath - Path to directory
 * @returns Array of filenames
 */
export function readDir(dirPath: string): string[] {
  return fs.readdirSync(dirPath);
}

/**
 * Creates a directory recursively
 *
 * @param dirPath - Path to directory
 */
export function createDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Removes a file
 *
 * @param filePath - Path to file
 */
export function removeFile(filePath: string): void {
  fs.unlinkSync(filePath);
}

/**
 * Removes a directory recursively
 *
 * @param dirPath - Path to directory
 */
export function removeDir(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

/**
 * Checks if path is a directory
 *
 * @param dirPath - Path to check
 * @returns True if path is a directory
 */
export function isDirectory(dirPath: string): boolean {
  return fs.statSync(dirPath).isDirectory();
}

/**
 * Resolves a path to absolute path
 *
 * @param filePath - Path to resolve
 * @returns Absolute path
 */
export function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}

/**
 * Joins path segments
 *
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Parses a file path into components
 *
 * @param filePath - Path to parse
 * @returns Parsed path components
 */
export function parsePath(filePath: string): {
  dir: string;
  name: string;
  ext: string;
  base: string;
} {
  return path.parse(filePath);
}

/**
 * Gets the directory name from a path
 *
 * @param filePath - Path to process
 * @returns Directory path
 */
export function dirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Gets the base name from a path
 *
 * @param filePath - Path to process
 * @returns Base name
 */
export function basename(filePath: string): string {
  return path.basename(filePath);
}
