import { AsyncRunner } from '../AsyncRunner/AsyncRunner';
import { Handler } from '../AsyncRunner/Handler';
import { parse } from 'jsonlines';
import { StubData, longJsonDataSource } from './longJsonDataSource';
import { Readable } from 'node:stream';
import { AsyncMultiplexer } from '../AsyncMultiplexer/AsyncMultiplexer';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    // Emulate a data source
    async function* itemsSource(): AsyncGenerator<StubData> {
        for await (const a of Readable.from(longJsonDataSource()).pipe(
            parse()
        )) {
            yield a;
        }
    }

    // Group the data items into batches
    const batchesSource = new AsyncMultiplexer<StubData>({
        batchSize: 10,
        source: itemsSource(),
    }).start();

    async function handler(batch: StubData[]) {
        // emulate hard work
        await sleep(1000);

        return {
            kind: 'success' as const,
            value: batch.map((a) => parseFloat(a.baz) * 100),
        };
    }

    // Process the batches:
    // call handler for each batch
    // concurrently in 4 "threads"
    const runner = new AsyncRunner<StubData[], number[]>({
        source: batchesSource,
        concurrency: 4,
        rateLimitTimeout: 1000,
        handler,
        onResponse: (response) => {
            // Write log
            console.log('response:', response);
        },
    });

    await runner.start();
}

main().catch(console.error);
