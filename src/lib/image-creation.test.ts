
import { test, describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { getImageDimensions } from './image-processing.ts';

describe('Optimized Image Processing - Unit Tests', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalCreateImageBitmap: typeof createImageBitmap;
  let originalImage: typeof Image;

  before(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    // @ts-ignore
    originalCreateImageBitmap = globalThis.createImageBitmap;
    originalImage = globalThis.Image;

    // Mock URL.createObjectURL
    const createMock = mock.fn((blob: Blob) => `blob:${Date.now()}`);
    URL.createObjectURL = createMock;

    // Mock URL.revokeObjectURL
    const revokeMock = mock.fn((url: string) => {});
    URL.revokeObjectURL = revokeMock;

    // Remove createImageBitmap to force fallback
    // @ts-ignore
    delete globalThis.createImageBitmap;

    // Mock Image
    class MockImage {
      width: number = 100;
      height: number = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(value: string) {
        this._src = value;
        if (value) {
            // Trigger onload synchronously to avoid event loop issues in test runner
            if (this.onload) {
                this.onload();
            }
        }
      }
      get src() { return this._src; }
      private _src: string = '';
    }
    // @ts-ignore
    globalThis.Image = MockImage;
  });

  after(() => {
    mock.reset();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    // @ts-ignore
    if (originalCreateImageBitmap) globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.Image = originalImage;
  });

  it('getImageDimensions should reuse provided URL and NOT revoke it', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const existingUrl = 'blob:existing-url';

    // Clear previous calls
    (URL.createObjectURL as any).mock.resetCalls();
    (URL.revokeObjectURL as any).mock.resetCalls();

    // Call with existing URL
    await getImageDimensions(file, existingUrl);

    // Assertions
    const createCalls = (URL.createObjectURL as any).mock.callCount();
    const revokeCalls = (URL.revokeObjectURL as any).mock.callCount();

    // Should NOT create a new URL
    assert.strictEqual(createCalls, 0, 'Expected 0 calls to URL.createObjectURL');

    // Should NOT revoke the URL
    assert.strictEqual(revokeCalls, 0, 'Expected 0 calls to URL.revokeObjectURL');
  });

  it('getImageDimensions should create and revoke URL if NOT provided (fallback behavior)', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    // Clear previous calls
    (URL.createObjectURL as any).mock.resetCalls();
    (URL.revokeObjectURL as any).mock.resetCalls();

    // Call without existing URL
    await getImageDimensions(file);

    // Assertions
    const createCalls = (URL.createObjectURL as any).mock.callCount();
    const revokeCalls = (URL.revokeObjectURL as any).mock.callCount();

    // Should create a new URL
    assert.strictEqual(createCalls, 1, 'Expected 1 call to URL.createObjectURL');

    // Should revoke the URL
    assert.strictEqual(revokeCalls, 1, 'Expected 1 call to URL.revokeObjectURL');
  });
});
