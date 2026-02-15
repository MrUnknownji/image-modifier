import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { processImage } from './image-processing.ts';
import type { ProcessedImage } from '../types/image.ts';

// --- Mocks ---

const originalURL = global.URL;
const originalImage = global.Image;
const originalDocument = global.document;
const originalBlob = global.Blob;
const originalFile = global.File;

// Mock Blob
class MockBlob {
  constructor(content: any[], options?: any) {}
}

// Mock File
class MockFile extends MockBlob {
  name: string;
  lastModified: number;
  size: number = 0;
  type: string = '';
  constructor(content: any[], name: string, options?: any) {
    super(content, options);
    this.name = name;
    this.lastModified = Date.now();
  }
}

// Mock URL
const mockCreateObjectURL = mock.fn((obj: any) => 'blob:mock-created-url');
const mockRevokeObjectURL = mock.fn((url: string) => {});

// Mock Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  _src: string = '';
  width = 100;
  height = 100;

  set src(value: string) {
    this._src = value;
    // Simulate async load
    process.nextTick(() => {
      if (this.onload) this.onload();
    });
  }
  get src() { return this._src; }
}

// Mock Canvas Context
const mockContext = {
  imageSmoothingEnabled: false,
  imageSmoothingQuality: '',
  filter: '',
  translate: mock.fn(),
  rotate: mock.fn(),
  scale: mock.fn(),
  drawImage: mock.fn(),
};

// Mock Document
const mockDocument = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: (type: string) => mockContext,
        toBlob: (callback: (blob: Blob | null) => void, type: string, quality?: number) => {
          callback(new MockBlob(['mock-data']) as any);
        }
      };
    }
    return {};
  }
};

describe('processImage optimization', () => {
  before(() => {
    global.URL = {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as any;
    global.Image = MockImage as any;
    global.document = mockDocument as any;
    global.Blob = MockBlob as any;
    global.File = MockFile as any;
  });

  after(() => {
    global.URL = originalURL;
    global.Image = originalImage;
    global.document = originalDocument;
    global.Blob = originalBlob;
    global.File = originalFile;
  });

  it('should create object URL if originalUrl is missing (baseline behavior)', async () => {
    // Reset mocks
    mockCreateObjectURL.mock.resetCalls();

    const image: ProcessedImage = {
      id: '1',
      originalFile: new MockFile([''], 'test.png') as any,
      originalUrl: '', // EMPTY
      processedUrl: null,
      metadata: { name: 'test.png', type: 'image/png', size: 0, lastModified: 0 },
      dimensions: { width: 100, height: 100 },
      exif: null,
      settings: {
        width: 100, height: 100, maintainAspectRatio: true, quality: 85, format: 'jpeg',
        dpi: 72, preserveMetadata: true, filters: {} as any, rotation: 0, flipHorizontal: false, flipVertical: false
      },
      history: [],
      historyIndex: 0
    };

    await processImage(image, null);

    // Verify createObjectURL called
    assert.strictEqual(mockCreateObjectURL.mock.calls.length, 1, 'Expected URL.createObjectURL to be called once');
  });

  it('should NOT create object URL if originalUrl is present (optimized behavior)', async () => {
    // Reset mocks
    mockCreateObjectURL.mock.resetCalls();
    mockRevokeObjectURL.mock.resetCalls();

    const existingUrl = 'blob:existing-url';
    const image: ProcessedImage = {
      id: '2',
      originalFile: new MockFile([''], 'test.png') as any,
      originalUrl: existingUrl, // PRESENT
      processedUrl: null,
      metadata: { name: 'test.png', type: 'image/png', size: 0, lastModified: 0 },
      dimensions: { width: 100, height: 100 },
      exif: null,
      settings: {
        width: 100, height: 100, maintainAspectRatio: true, quality: 85, format: 'jpeg',
        dpi: 72, preserveMetadata: true, filters: {} as any, rotation: 0, flipHorizontal: false, flipVertical: false
      },
      history: [],
      historyIndex: 0
    };

    await processImage(image, null);

    // Verify createObjectURL NOT called
    // NOTE: This assertion will fail initially (baseline), demonstrating the opportunity for optimization.
    // After fix, it should pass.

    // For now, let's log the result so we can see it failing/passing in the output without failing the test suite completely if we want to check baseline.
    // But usually tests should assert the desired state.

    // I will write the assertion expecting 0 calls, so the test fails initially.
    assert.strictEqual(mockCreateObjectURL.mock.calls.length, 0, 'Expected URL.createObjectURL to NOT be called when originalUrl is present');

    // Also verify we didn't revoke the existing URL
    const revokeCallsForExisting = mockRevokeObjectURL.mock.calls.filter(call => call.arguments[0] === existingUrl);
    assert.strictEqual(revokeCallsForExisting.length, 0, 'Expected URL.revokeObjectURL to NOT be called for the reused URL');
  });
});
