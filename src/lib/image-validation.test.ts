import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeBaseName,
  validateImageFile,
} from './image-processing';
import { MAX_IMAGE_FILE_SIZE } from '../types/image';

describe('image input hardening', () => {
  it('accepts supported image MIME types within the size limit', () => {
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
    assert.strictEqual(validateImageFile(file), null);
  });

  it('rejects SVG and other unapproved image MIME types', () => {
    const file = new File(['<svg/>'], 'payload.svg', { type: 'image/svg+xml' });
    assert.match(validateImageFile(file) ?? '', /not a supported/i);
  });

  it('rejects files larger than the processing limit', () => {
    const file = {
      name: 'huge.jpg',
      type: 'image/jpeg',
      size: MAX_IMAGE_FILE_SIZE + 1,
    } as File;

    assert.match(validateImageFile(file) ?? '', /larger than/i);
  });

  it('removes paths, control characters, and unsafe filename characters', () => {
    assert.strictEqual(
      sanitizeBaseName('../folder/..\\portrait\u0000<>:"|?*.png'),
      'portrait'
    );
  });

  it('uses a safe fallback for empty filenames', () => {
    assert.strictEqual(sanitizeBaseName('...jpg'), 'image');
  });
});
