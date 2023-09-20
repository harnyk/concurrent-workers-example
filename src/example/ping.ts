import { chain } from '../Chain';
import { Iter } from '../Iter';
import { OperatorFunction } from '../Operator';
import { pool } from '../Pool';
import { sleep } from './sleep';

async function main() {
    interface PingResponseOk {
        response: 'pong';
        id: number;
    }
    interface PingResponseRateLimit {
        response: 'ratelimit';
        id: number;
        until: Date;
    }
    type PingResponse = PingResponseOk | PingResponseRateLimit;

    async function handler(id: number): Promise<PingResponse> {
        await sleep(Math.random() * 10000);
        if (Math.random() < 0.1) {
            return {
                response: 'ratelimit',
                until: new Date(Date.now() + 5000),
                id,
            };
        }
        return { response: 'pong', id };
    }

    async function* ping() {
        for (let i = 0; ; i++) {
            await sleep(100);
            console.log('ping', i);
            yield i;
        }
    }

    const rateLimiter: OperatorFunction<PingResponse, PingResponse> =
        async function* rateLimiter(responses) {
            for await (const res of responses) {
                if (res.response === 'ratelimit') {
                    const now = Date.now();
                    const until = res.until.getTime();
                    const ms = until - now;
                    console.log(`Rate-limited for ${ms / 1000}s`);
                    await sleep(until - now);
                }
                yield res;
            }
        };

    async function* logger<T>(items: Iter<T>): Iter<T> {
        for await (const item of items) {
            console.log(item);
            yield item;
        }
    }

    chain(ping())
        .pipe(pool(handler, { concurrency: 4 }))
        .pipe(logger<PingResponse>)
        .pipe(rateLimiter)
        .consume();
}

main().catch();
