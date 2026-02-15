
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function blockCpu(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
}

async function mockProcessImage(id) {
    // 1. Simulate image loading (network/IO) - async
    await sleep(50);

    // 2. Simulate canvas drawing - sync CPU
    blockCpu(10);

    // 3. Simulate encoding (toBlob) - async + some CPU overhead
    await sleep(100);

    return `blob-${id}`;
}

// Sequential implementation
async function processSequential(count) {
    console.log(`Starting sequential processing of ${count} items...`);
    const start = Date.now();
    for (let i = 0; i < count; i++) {
        await mockProcessImage(i);
    }
    const end = Date.now();
    console.log(`Sequential finished in ${end - start}ms`);
    return end - start;
}

// Simple p-limit implementation for benchmark
function pLimit(concurrency) {
    const queue = [];
    let activeCount = 0;

    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            queue.shift()();
        }
    };

    const run = async (fn, resolve, reject) => {
        activeCount++;
        const result = (async () => fn())();
        try {
            const res = await result;
            resolve(res);
        } catch (err) {
            reject(err);
        }
        next();
    };

    const enqueue = (fn, resolve, reject) => {
        queue.push(run.bind(null, fn, resolve, reject));
        if (activeCount < concurrency && queue.length > 0) {
            queue.shift()();
        }
    };

    const generator = (fn, ...args) =>
        new Promise((resolve, reject) => {
            enqueue(fn, resolve, reject);
        });

    return generator;
}

// Concurrent implementation
async function processConcurrent(count, limit) {
    console.log(`Starting concurrent processing of ${count} items with limit ${limit}...`);
    const start = Date.now();

    const limitFn = pLimit(limit);
    const tasks = [];

    for (let i = 0; i < count; i++) {
        tasks.push(limitFn(() => mockProcessImage(i)));
    }

    await Promise.all(tasks);

    const end = Date.now();
    console.log(`Concurrent finished in ${end - start}ms`);
    return end - start;
}


async function runBenchmark() {
    const COUNT = 20;

    console.log("--- Benchmark Start ---");
    const sequentialTime = await processSequential(COUNT);
    const concurrentTime = await processConcurrent(COUNT, 3);

    console.log("--- Results ---");
    console.log(`Sequential: ${sequentialTime}ms`);
    console.log(`Concurrent (3): ${concurrentTime}ms`);
    console.log(`Improvement: ${((sequentialTime - concurrentTime) / sequentialTime * 100).toFixed(2)}%`);
}

runBenchmark();
