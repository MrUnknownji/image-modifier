import { performance } from 'node:perf_hooks';

const processImage = async (id: number) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return id;
};

async function runBenchmark() {
  const tasksCount = 20;
  const limit = 5;

  console.log(`Benchmarking processing ${tasksCount} images (simulated 100ms each)...`);

  // Sequential
  const startSeq = performance.now();
  for (let i = 0; i < tasksCount; i++) {
    await processImage(i);
  }
  const endSeq = performance.now();
  const seqTime = endSeq - startSeq;
  console.log(`Sequential: ${seqTime.toFixed(2)}ms`);

  // Parallel (limit 5)
  const startPar = performance.now();

  const tasks = Array.from({ length: tasksCount }, (_, i) => i);
  const executing = new Set<Promise<any>>();

  for (const id of tasks) {
      const p: Promise<void> = processImage(id).then(() => { executing.delete(p); });
      executing.add(p);

      if (executing.size >= limit) {
          await Promise.race(executing);
      }
  }
  await Promise.all(executing);

  const endPar = performance.now();
  const parTime = endPar - startPar;
  console.log(`Parallel (limit ${limit}): ${parTime.toFixed(2)}ms`);

  console.log(`Speedup: ${(seqTime / parTime).toFixed(2)}x`);
}

runBenchmark().catch(console.error);
