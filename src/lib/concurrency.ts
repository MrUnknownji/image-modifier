export function pLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()?.();
    }
  };

  const run = async <T>(
    fn: () => Promise<T>,
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: unknown) => void
  ) => {
    activeCount++;
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    next();
  };

  const enqueue = <T>(
    fn: () => Promise<T>,
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: unknown) => void
  ) => {
    queue.push(() => run(fn, resolve, reject));

    if (activeCount < concurrency && queue.length > 0) {
      queue.shift()?.();
    }
  };

  const generator = <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      enqueue(fn, resolve, reject);
    });
  };

  return generator;
}
