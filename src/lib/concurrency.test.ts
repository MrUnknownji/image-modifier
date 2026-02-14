import { describe, it } from 'node:test';
import assert from 'node:assert';
import { pLimit } from './concurrency.ts';

describe('pLimit', () => {
  it('should limit concurrency', async () => {
    const limit = pLimit(2);
    let active = 0;
    const results: number[] = [];

    const task = async (id: number) => {
      active++;
      assert.ok(active <= 2, `Concurrency limit exceeded: ${active}`);
      await new Promise(resolve => setTimeout(resolve, 50));
      active--;
      return id;
    };

    const promises = Array.from({ length: 5 }, (_, i) => limit(() => task(i)));

    results.push(...await Promise.all(promises));

    assert.deepStrictEqual(results.sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  });

  it('should handle errors correctly', async () => {
    const limit = pLimit(2);
    const error = new Error('Test error');

    await assert.rejects(async () => {
      await limit(async () => { throw error; });
    }, error);
  });

  it('should queue tasks correctly', async () => {
      const limit = pLimit(1);
      const log: string[] = [];

      const task = async (name: string) => {
          log.push(`start ${name}`);
          await new Promise(resolve => setTimeout(resolve, 10));
          log.push(`end ${name}`);
      };

      await Promise.all([
          limit(() => task('1')),
          limit(() => task('2')),
          limit(() => task('3')),
      ]);

      assert.deepStrictEqual(log, [
          'start 1', 'end 1',
          'start 2', 'end 2',
          'start 3', 'end 3'
      ]);
  });
});
