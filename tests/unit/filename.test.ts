import { describe, it, expect } from 'bun:test';
import { parseFilename, isValidFilename, constructFilename } from '../../src/utils/filename';

describe('parseFilename', () => {
  it('should parse valid Sanity image filename', () => {
    const result = parseFilename('3971e99d050ddfaddf8ca4aa06f5e63bbd55d562-1920x1279.jpg');

    expect(result).toEqual({
      hash: '3971e99d050ddfaddf8ca4aa06f5e63bbd55d562',
      width: 1920,
      height: 1279,
      ext: 'jpg'
    });
  });

  it('should parse filenames with different extensions', () => {
    const extensions = ['jpg', 'png', 'webp', 'heic', 'tiff'];

    extensions.forEach(ext => {
      const result = parseFilename(`abc123def456-1024x768.${ext}`);
      expect(result?.ext).toBe(ext);
    });
  });

  it('should handle uppercase extensions', () => {
    const result = parseFilename('abc123def456-1024x768.JPG');
    expect(result?.ext).toBe('jpg');
  });

  it('should parse large dimensions', () => {
    const result = parseFilename('abc123-8000x6000.jpg');
    expect(result?.width).toBe(8000);
    expect(result?.height).toBe(6000);
  });

  it('should return null for invalid filename format', () => {
    const invalidNames = [
      'invalid.jpg',
      'no-dimensions.jpg',
      'abc-1920.jpg',
      'abc-1920x.jpg',
      'abc-x1080.jpg',
      '-1920x1080.jpg',
      'abc-1920x1080',
      'abc-1920x1080.invalid123',
    ];

    invalidNames.forEach(name => {
      expect(parseFilename(name)).toBeNull();
    });
  });

  it('should handle different hash lengths', () => {
    const shortHash = parseFilename('abc123-1920x1080.jpg');
    const longHash = parseFilename('a'.repeat(64) + '-1920x1080.jpg');

    expect(shortHash).not.toBeNull();
    expect(longHash).not.toBeNull();
  });
});

describe('isValidFilename', () => {
  it('should return true for valid filenames', () => {
    expect(isValidFilename('abc123-1920x1080.jpg')).toBe(true);
    expect(isValidFilename('3971e99d050ddfaddf8ca4aa06f5e63bbd55d562-1920x1279.jpg')).toBe(true);
  });

  it('should return false for invalid filenames', () => {
    expect(isValidFilename('invalid.jpg')).toBe(false);
    expect(isValidFilename('no-dimensions.jpg')).toBe(false);
    expect(isValidFilename('abc-1920.jpg')).toBe(false);
  });
});

describe('constructFilename', () => {
  it('should construct valid filename from components', () => {
    const result = constructFilename('abc123def456', 1920, 1080, 'jpg');
    expect(result).toBe('abc123def456-1920x1080.jpg');
  });

  it('should lowercase the extension', () => {
    const result = constructFilename('abc123', 1920, 1080, 'JPG');
    expect(result).toBe('abc123-1920x1080.jpg');
  });

  it('should handle various extensions', () => {
    const extensions = ['jpg', 'png', 'webp', 'heic', 'tiff'];

    extensions.forEach(ext => {
      const result = constructFilename('hash', 1920, 1080, ext);
      expect(result).toBe(`hash-1920x1080.${ext}`);
    });
  });
});
