import { Readable } from 'stream';
import { pool } from '../Pool';
import { batch } from '../Batch';
import { chain } from '../Chain';
import { longJsonDataSource } from './longJsonDataSource';
import { parse } from 'jsonlines';
import { Iter } from '../Iter';

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    async function handler(items: number[]): Promise<number[]> {
        await sleep(Math.random() * 3000);
        return items;
    }

    const objectsStream = Readable.from(longJsonDataSource()).pipe(parse());

    async function* extractBaz(input: Iter<any>): Iter<number> {
        for await (const item of input) {
            yield item.baz;
        }
    }

    chain(objectsStream)
        .pipe(extractBaz)
        .pipe(batch(10))
        .pipe(
            pool(handler, {
                concurrency: 4,
                onTaskCompleted(id) {
                    console.log(`Task ${id} completed`);
                },
                onTaskStarted(id) {
                    console.log(`Task ${id} started`);
                },
            })
        )
        .consume(console.log);
}

main().catch(console.error);
