import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateId } from './image-processing.ts';

describe('generateId', () => {
  it('should generate an ID with the correct format (timestamp-UUID)', () => {
    const id = generateId();
    // Regex for timestamp-UUIDv4
    // timestamp is digits
    // UUIDv4 is xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    assert.match(id, /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
