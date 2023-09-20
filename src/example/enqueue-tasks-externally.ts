import { chain } from '../Chain';
import { Fifo } from '../Fifo';
import { pool } from '../Pool';
import { sleep } from './sleep';

async function main() {
    async function handler(item: number): Promise<number> {
        await sleep(1000);
        return item * 100;
    }

    const source = new Fifo<number>();

    chain(source)
        .pipe(pool(handler, { concurrency: 4 }))
        .consume(console.log);

    for (let i = 0; i < 10; i++) {
        await sleep(100);
        source.push(i);
    }
    source.end();
}

main().catch();
