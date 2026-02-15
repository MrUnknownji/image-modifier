import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { calculateDimensions, formatFileSize, processImage } from './image-processing.ts';
import type { ImageSettings, ProcessedImage } from '../types/image.ts';

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
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
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

describe('processImage', () => {
  let originalURL: typeof URL;
  let originalImage: typeof Image;
  let originalDocument: typeof document;

  // Mocks
  let mockCreateObjectURL: any;
  let mockRevokeObjectURL: any;
  let mockDrawImage: any;
  let mockToBlob: any;
  let mockGetContext: any;
  let mockCreateElement: any;
  let mockContext: any;

  before(() => {
    originalURL = global.URL;
    originalImage = global.Image;
    originalDocument = global.document;

    // Setup basic mocks
    mockCreateObjectURL = mock.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = mock.fn();
    global.URL = {
      ...originalURL,
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as any;

    // Mock Image
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width: number = 100;
      height: number = 100;
      _src: string = '';

      set src(value: string) {
        this._src = value;
        if (value) {
            // Simulate async load
            setImmediate(() => {
                if (this.src === value) { // Check if still valid (not aborted/cleared)
                   if (value === 'error') {
                       if (this.onerror) this.onerror();
                   } else {
                       if (this.onload) this.onload();
                   }
                }
            });
        }
      }
      get src() { return this._src; }
    } as any;

    // Mock Document
    mockDrawImage = mock.fn();
    mockToBlob = mock.fn((cb) => cb(new Blob(['mock-blob'], { type: 'image/jpeg' })));

    mockContext = {
      drawImage: mockDrawImage,
      translate: mock.fn(),
      rotate: mock.fn(),
      scale: mock.fn(),
      filter: '',
      imageSmoothingEnabled: false,
      imageSmoothingQuality: '',
    };

    mockGetContext = mock.fn(() => mockContext);

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: mockGetContext,
      toBlob: mockToBlob,
    };

    mockCreateElement = mock.fn((tag) => {
      if (tag === 'canvas') return mockCanvas;
      return { href: '', download: '', click: mock.fn() };
    });

    global.document = {
      ...originalDocument,
      createElement: mockCreateElement,
      body: { appendChild: mock.fn(), removeChild: mock.fn() } as any,
    } as any;
  });

  after(() => {
    global.URL = originalURL;
    global.Image = originalImage;
    global.document = originalDocument;
  });

  beforeEach(() => {
    mockCreateObjectURL.mock.resetCalls();
    mockRevokeObjectURL.mock.resetCalls();
    mockDrawImage.mock.resetCalls();
    mockToBlob.mock.resetCalls();
    mockGetContext.mock.resetCalls();
    mockCreateElement.mock.resetCalls();

    // Reset context spies
    mockContext.translate.mock.resetCalls();
    mockContext.rotate.mock.resetCalls();
    mockContext.scale.mock.resetCalls();
    mockContext.filter = '';

    // Reset implementation
    mockGetContext.mock.mockImplementation(() => mockContext);
    mockToBlob.mock.mockImplementation((cb: any) => cb(new Blob(['mock-blob'], { type: 'image/jpeg' })));
  });

  function createMockProcessedImage(settings: Partial<ImageSettings> = {}): ProcessedImage {
    return {
      id: 'test-id',
      originalFile: new File([''], 'test.jpg', { type: 'image/jpeg' }),
      originalUrl: 'blob:original',
      processedUrl: null,
      metadata: {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        lastModified: 1234567890,
      },
      dimensions: { width: 100, height: 100 },
      exif: null,
      settings: {
        width: 100,
        height: 100,
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
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        ...settings,
      },
      history: [],
      historyIndex: 0,
    };
  }

  it('should process image successfully with default settings', async () => {
    const image = createMockProcessedImage();
    const result = await processImage(image, null);

    assert.ok(result instanceof Blob);
    assert.strictEqual(mockDrawImage.mock.callCount(), 1);

    const calls = mockDrawImage.mock.calls[0].arguments;
    // arguments: [img, x, y, width, height]
    // drawImage at -50, -50, 100, 100.
    assert.strictEqual(calls[1], -50);
    assert.strictEqual(calls[2], -50);
    assert.strictEqual(calls[3], 100);
    assert.strictEqual(calls[4], 100);
  });

  it('should apply filters correctly', async () => {
    const filters = {
        brightness: 110,
        contrast: 120,
        saturation: 130,
        grayscale: 10,
        sepia: 20,
        blur: 5,
        hueRotate: 45,
    };
    const image = createMockProcessedImage({ filters });

    await processImage(image, null);

    assert.strictEqual(
      mockContext.filter,
      'brightness(110%) contrast(120%) saturate(130%) grayscale(10%) sepia(20%) blur(5px) hue-rotate(45deg)'
    );
  });

  it('should apply transformations (rotation/flip)', async () => {
    const image = createMockProcessedImage({
        rotation: 90,
        flipHorizontal: true,
        flipVertical: true
    });

    await processImage(image, null);

    assert.strictEqual(mockContext.rotate.mock.callCount(), 1);
    assert.strictEqual(mockContext.scale.mock.callCount(), 1);

    const rotateArgs = mockContext.rotate.mock.calls[0].arguments;
    assert.strictEqual(rotateArgs[0], (90 * Math.PI) / 180);

    const scaleArgs = mockContext.scale.mock.calls[0].arguments;
    assert.strictEqual(scaleArgs[0], -1); // flipHorizontal
    assert.strictEqual(scaleArgs[1], -1); // flipVertical
  });

  it('should handle cropping with aspect ratio', async () => {
    const image = createMockProcessedImage();
    await processImage(image, 2);

    assert.strictEqual(mockDrawImage.mock.callCount(), 1);
    const args = mockDrawImage.mock.calls[0].arguments;

    assert.strictEqual(args.length, 9);
    assert.strictEqual(args[1], 0);   // sx
    assert.strictEqual(args[2], 25);  // sy
    assert.strictEqual(args[3], 100); // sWidth
    assert.strictEqual(args[4], 50);  // sHeight
    assert.strictEqual(args[5], -50); // dx
    assert.strictEqual(args[6], -25); // dy
    assert.strictEqual(args[7], 100); // dWidth
    assert.strictEqual(args[8], 50);  // dHeight
  });

  it('should reject when abort signal is triggered before load', async () => {
    const controller = new AbortController();
    const image = createMockProcessedImage();

    controller.abort();

    await assert.rejects(
        processImage(image, null, controller.signal),
        { message: 'Processing aborted' }
    );
  });

  it('should reject when image load fails', async () => {
    const image = createMockProcessedImage();
    // Simulate error by setting originalUrl to 'error' which our mock Image interprets
    image.originalUrl = 'error';

    await assert.rejects(
        processImage(image, null),
        { message: 'Failed to load image' }
    );
  });

  it('should reject if canvas context cannot be obtained', async () => {
     mockGetContext.mock.mockImplementation(() => null);
     const image = createMockProcessedImage();

     await assert.rejects(
        processImage(image, null),
        { message: 'Could not get canvas context' }
     );
  });

  it('should reject if toBlob fails', async () => {
     mockToBlob.mock.mockImplementation((cb: any) => cb(null));
     const image = createMockProcessedImage();

     await assert.rejects(
        processImage(image, null),
        { message: 'Failed to create blob' }
     );
  });
});
