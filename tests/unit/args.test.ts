import { describe, it, expect } from 'bun:test';
import { parseArgs, validateArgs } from '../../src/cli/args';

describe('parseArgs', () => {
  it('should parse input path', () => {
    const options = parseArgs(['export.tar.gz']);
    expect(options.inputTarball).toBe('export.tar.gz');
  });

  it('should use default values when not specified', () => {
    const options = parseArgs(['export.tar.gz']);
    expect(options.maxSize).toBe(3600);
    expect(options.maxFilesize).toBe(3);
    expect(options.quality).toBe(85);
    expect(options.output).toBeNull();
    expect(options.dryRun).toBe(false);
  });

  it('should parse --max-size option', () => {
    const options = parseArgs(['export.tar.gz', '--max-size', '4000']);
    expect(options.maxSize).toBe(4000);
  });

  it('should parse --max-filesize option', () => {
    const options = parseArgs(['export.tar.gz', '--max-filesize', '5']);
    expect(options.maxFilesize).toBe(5);
  });

  it('should parse --quality option', () => {
    const options = parseArgs(['export.tar.gz', '--quality', '90']);
    expect(options.quality).toBe(90);
  });

  it('should parse --output option', () => {
    const options = parseArgs(['export.tar.gz', '--output', 'processed.tar.gz']);
    expect(options.output).toBe('processed.tar.gz');
  });

  it('should parse --dry-run flag', () => {
    const options = parseArgs(['export.tar.gz', '--dry-run']);
    expect(options.dryRun).toBe(true);
  });

  it('should parse multiple options', () => {
    const options = parseArgs([
      'export.tar.gz',
      '--max-size', '4000',
      '--max-filesize', '5',
      '--quality', '90',
      '--output', 'out.tar.gz',
      '--dry-run'
    ]);

    expect(options.inputTarball).toBe('export.tar.gz');
    expect(options.maxSize).toBe(4000);
    expect(options.maxFilesize).toBe(5);
    expect(options.quality).toBe(90);
    expect(options.output).toBe('out.tar.gz');
    expect(options.dryRun).toBe(true);
  });

  it('should throw error for invalid --max-size', () => {
    expect(() => parseArgs(['export.tar.gz', '--max-size', 'invalid'])).toThrow('must be a positive number');
    expect(() => parseArgs(['export.tar.gz', '--max-size', '0'])).toThrow('must be a positive number');
    expect(() => parseArgs(['export.tar.gz', '--max-size', '-100'])).toThrow('must be a positive number');
  });

  it('should throw error for invalid --max-filesize', () => {
    expect(() => parseArgs(['export.tar.gz', '--max-filesize', 'invalid'])).toThrow('must be a positive number');
    expect(() => parseArgs(['export.tar.gz', '--max-filesize', '0'])).toThrow('must be a positive number');
  });

  it('should throw error for invalid --quality', () => {
    expect(() => parseArgs(['export.tar.gz', '--quality', 'invalid'])).toThrow('must be between 1 and 100');
    expect(() => parseArgs(['export.tar.gz', '--quality', '0'])).toThrow('must be between 1 and 100');
    expect(() => parseArgs(['export.tar.gz', '--quality', '101'])).toThrow('must be between 1 and 100');
  });

  it('should throw error for missing --output value', () => {
    expect(() => parseArgs(['export.tar.gz', '--output'])).toThrow('requires a path argument');
  });

  it('should throw error for unknown argument', () => {
    expect(() => parseArgs(['export.tar.gz', '--unknown'])).toThrow('Unknown argument: --unknown');
  });

  it('should accept decimal values for --max-filesize', () => {
    const options = parseArgs(['export.tar.gz', '--max-filesize', '2.5']);
    expect(options.maxFilesize).toBe(2.5);
  });
});

describe('validateArgs', () => {
  it('should pass validation with valid input', () => {
    const options = parseArgs(['export.tar.gz']);
    expect(() => validateArgs(options)).not.toThrow();
  });

  it('should throw error when input path is missing', () => {
    const options = parseArgs([]);
    expect(() => validateArgs(options)).toThrow('No input path specified');
  });

  it('should throw error when input path is empty string', () => {
    const options = {
      inputTarball: '',
      maxSize: 3600,
      maxFilesize: 3,
      quality: 85,
      output: null,
      dryRun: false
    };
    expect(() => validateArgs(options)).toThrow('No input path specified');
  });
});
