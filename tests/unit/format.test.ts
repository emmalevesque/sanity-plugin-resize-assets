import { describe, it, expect } from 'bun:test';
import { formatBytes, formatPercent, formatDimensions } from '../../src/utils/format';

describe('formatBytes', () => {
  it('should format zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10240)).toBe('10 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1610612736)).toBe('1.5 GB');
    expect(formatBytes(5368709120)).toBe('5 GB');
  });

  it('should round to 2 decimal places', () => {
    expect(formatBytes(1234567)).toBe('1.18 MB');
    expect(formatBytes(9876543210)).toBe('9.2 GB');
  });
});

describe('formatPercent', () => {
  it('should format percentage with one decimal', () => {
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(0.5)).toBe('50.0%');
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('should handle decimal values', () => {
    expect(formatPercent(0.123)).toBe('12.3%');
    expect(formatPercent(0.456)).toBe('45.6%');
    expect(formatPercent(0.789)).toBe('78.9%');
  });

  it('should round to one decimal place', () => {
    expect(formatPercent(0.1234)).toBe('12.3%');
    expect(formatPercent(0.5678)).toBe('56.8%');
  });
});

describe('formatDimensions', () => {
  it('should format dimensions correctly', () => {
    expect(formatDimensions(1920, 1080)).toBe('1920x1080');
    expect(formatDimensions(800, 600)).toBe('800x600');
    expect(formatDimensions(3840, 2160)).toBe('3840x2160');
  });

  it('should handle large dimensions', () => {
    expect(formatDimensions(8000, 6000)).toBe('8000x6000');
  });

  it('should handle small dimensions', () => {
    expect(formatDimensions(100, 100)).toBe('100x100');
  });
});
