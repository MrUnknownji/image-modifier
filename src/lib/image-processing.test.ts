import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateDimensions, formatFileSize } from './image-processing.ts';
import type { ImageSettings } from '../types/image.ts';

const DEFAULT_SETTINGS: ImageSettings = {
  width: 0,
  height: 0,
  maintainAspectRatio: true,
  quality: 85,
  format: 'jpeg',
  dpi: 72,
  preserveMetadata: true,
  filters: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
  },
};

describe('calculateDimensions', () => {
  it('should return original dimensions when no resizing is requested', () => {
    const originalWidth = 1000;
    const originalHeight = 800;
    const settings = { ...DEFAULT_SETTINGS };

    const result = calculateDimensions(originalWidth, originalHeight, settings, null);

    assert.deepStrictEqual(result, { width: 1000, height: 800 });
  });

  it('should calculate height when width is provided and maintainAspectRatio is true (no target aspect ratio)', () => {
    const originalWidth = 1000;
    const originalHeight = 500; // 2:1 ratio
    const settings = { ...DEFAULT_SETTINGS, width: 500 };

    const result = calculateDimensions(originalWidth, originalHeight, settings, null);

    assert.deepStrictEqual(result, { width: 500, height: 250 });
  });

  it('should calculate width when height is provided and maintainAspectRatio is true (no target aspect ratio)', () => {
    const originalWidth = 1000;
    const originalHeight = 500; // 2:1 ratio
    const settings = { ...DEFAULT_SETTINGS, height: 250 };

    const result = calculateDimensions(originalWidth, originalHeight, settings, null);

    assert.deepStrictEqual(result, { width: 500, height: 250 });
  });

  it('should return provided dimensions if both are set and maintainAspectRatio is true (no target aspect ratio)', () => {
    // In this case, the function trusts the user input if both are provided and no specific aspectRatio is enforced
    const originalWidth = 1000;
    const originalHeight = 500;
    const settings = { ...DEFAULT_SETTINGS, width: 100, height: 100 };

    const result = calculateDimensions(originalWidth, originalHeight, settings, null);

    assert.deepStrictEqual(result, { width: 100, height: 100 });
  });

  it('should calculate height based on target aspect ratio when only width is provided', () => {
    const originalWidth = 1000;
    const originalHeight = 1000;
    const settings = { ...DEFAULT_SETTINGS, width: 500 };
    const aspectRatio = 16 / 9; // ~1.777

    const result = calculateDimensions(originalWidth, originalHeight, settings, aspectRatio);

    // height = width / aspectRatio = 500 / (16/9) = 500 * 9 / 16 = 281.25 -> 281
    assert.deepStrictEqual(result, { width: 500, height: 281 });
  });

  it('should calculate width based on target aspect ratio when only height is provided', () => {
    const originalWidth = 1000;
    const originalHeight = 1000;
    const settings = { ...DEFAULT_SETTINGS, height: 281 };
    const aspectRatio = 16 / 9;

    const result = calculateDimensions(originalWidth, originalHeight, settings, aspectRatio);

    // width = height * aspectRatio = 281 * (16/9) = 499.55 -> 500
    assert.deepStrictEqual(result, { width: 500, height: 281 });
  });

  it('should adjust height if dimensions do not match target aspect ratio (width constraint)', () => {
    const originalWidth = 1000;
    const originalHeight = 1000;
    // User requests 100x100 but aspect ratio is 2:1.
    // 100 / 2 <= 100 (50 <= 100) -> True. Height becomes 50.
    const settings = { ...DEFAULT_SETTINGS, width: 100, height: 100 };
    const aspectRatio = 2;

    const result = calculateDimensions(originalWidth, originalHeight, settings, aspectRatio);

    assert.deepStrictEqual(result, { width: 100, height: 50 });
  });

  it('should adjust width if dimensions do not match target aspect ratio (height constraint)', () => {
    const originalWidth = 1000;
    const originalHeight = 1000;
    // User requests 200x100 but aspect ratio is 1:1.
    // 200 / 1 <= 100 (200 <= 100) -> False. Width becomes 100.
    const settings = { ...DEFAULT_SETTINGS, width: 200, height: 100 };
    const aspectRatio = 1;

    const result = calculateDimensions(originalWidth, originalHeight, settings, aspectRatio);

    assert.deepStrictEqual(result, { width: 100, height: 100 });
  });

  it('should allow independent resizing when maintainAspectRatio is false', () => {
    const originalWidth = 1000;
    const originalHeight = 500;
    const settings = { ...DEFAULT_SETTINGS, maintainAspectRatio: false, width: 800 };

    const result = calculateDimensions(originalWidth, originalHeight, settings, null);

    // Height should remain original because it wasn't specified and aspect ratio is ignored
    assert.deepStrictEqual(result, { width: 800, height: 500 });
  });

  it('should allow completely custom dimensions when maintainAspectRatio is false', () => {
    const originalWidth = 1000;
    const originalHeight = 500;
    const settings = { ...DEFAULT_SETTINGS, maintainAspectRatio: false, width: 100, height: 900 };

    const result = calculateDimensions(originalWidth, originalHeight, settings, null);

    assert.deepStrictEqual(result, { width: 100, height: 900 });
  });

  it('should handle zero original dimensions gracefully', () => {
     // If settings provided, it should respect settings.
     const settings = { ...DEFAULT_SETTINGS, width: 100, height: 100 };
     const result = calculateDimensions(0, 0, settings, null);
     assert.deepStrictEqual(result, { width: 100, height: 100 });

     // If no settings provided
     const settingsEmpty = { ...DEFAULT_SETTINGS };
     const resultEmpty = calculateDimensions(0, 0, settingsEmpty, null);
     assert.deepStrictEqual(resultEmpty, { width: 0, height: 0 });
  });
});

describe('formatFileSize', () => {
  it('should return "0 Bytes" for 0 bytes', () => {
    assert.strictEqual(formatFileSize(0), '0 Bytes');
  });

  it('should format Bytes correctly', () => {
    assert.strictEqual(formatFileSize(500), '500 Bytes');
    assert.strictEqual(formatFileSize(1023), '1023 Bytes');
  });

  it('should format KB correctly', () => {
    assert.strictEqual(formatFileSize(1024), '1 KB');
    assert.strictEqual(formatFileSize(1500), '1.46 KB'); // 1500 / 1024 = 1.4648...
    assert.strictEqual(formatFileSize(2048), '2 KB');
  });

  it('should format MB correctly', () => {
    assert.strictEqual(formatFileSize(1048576), '1 MB'); // 1024 * 1024
    assert.strictEqual(formatFileSize(1572864), '1.5 MB'); // 1.5 * 1024 * 1024
  });

  it('should format GB correctly', () => {
    assert.strictEqual(formatFileSize(1073741824), '1 GB'); // 1024^3
    assert.strictEqual(formatFileSize(1610612736), '1.5 GB'); // 1.5 * 1024^3
  });

  it('should format TB correctly', () => {
    assert.strictEqual(formatFileSize(1099511627776), '1 TB'); // 1024^4
  });
});
