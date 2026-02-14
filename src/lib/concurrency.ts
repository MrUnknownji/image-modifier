export function pLimit(concurrency: number) {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new TypeError(`Expected \`concurrency\` to be a number from 1 up, got \`${concurrency}\` (${typeof concurrency})`);
  }

  const queue: (() => Promise<void>)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    const execute = async () => {
      activeCount++;
      try {
        return await fn();
      } finally {
        next();
      }
    };

    if (activeCount < concurrency) {
      return execute();
    } else {
      return new Promise<T>((resolve, reject) => {
        queue.push(async () => {
          try {
            resolve(await execute());
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  };

  return run;
}
