import { Handler, HandlerResponse } from './Handler';
import { Iter } from './Iter';

interface AsyncPoolOptions {
    concurrency: number;
    onTaskStarted?: (taskId: number) => void;
    onTaskCompleted?: (taskId: number) => void;
}

export class AsyncPool<Req, Res> {
    #currentTasksRunning = 0;
    #onCapable: (() => void) | null = null;
    #onAnyTaskCompleted: (() => void) | null = null;
    #taskId = 0;

    #checkOut(): number {
        if (this.#currentTasksRunning >= this.options.concurrency) {
            throw new Error('Pool is empty');
        }
        this.#currentTasksRunning++;
        const id = this.#taskId++;
        this.options.onTaskStarted?.(id);
        return id;
    }

    #checkIn(id: number) {
        if (this.#currentTasksRunning <= 0) {
            throw new Error('Pool is full');
        }
        this.#currentTasksRunning--;
        if (this.#currentTasksRunning < this.options.concurrency) {
            this.#onCapable?.();
        }
        this.#onAnyTaskCompleted?.();
        this.options.onTaskCompleted?.(id);
    }

    constructor(
        private handler: Handler<Req, Res>,
        private options: AsyncPoolOptions
    ) {}

    #onceCapable() {
        // If we already know that the pool is not full, we don't need to wait
        if (this.#currentTasksRunning < this.options.concurrency) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            this.#onCapable = resolve;
        });
    }

    #onceAnyTaskCompleted() {
        return new Promise<void>((resolve) => {
            this.#onAnyTaskCompleted = resolve;
        });
    }

    async *#process(input: Iter<Req>): AsyncIterable<HandlerResponse<Res>> {
        const buffer: HandlerResponse<Res>[] = [];

        for await (const req of input) {
            // Wait for available concurrency capacity
            await this.#onceCapable();

            for (const item of buffer) {
                yield item;
            }
            buffer.length = 0;

            const id = this.#checkOut();
            const responsePromise = this.handler(req);
            responsePromise
                .then((response) => {
                    buffer.push(response);
                })
                .finally(() => {
                    this.#checkIn(id);
                });
        }

        // Flush remaining tasks
        while (this.#currentTasksRunning > 0) {
            await this.#onceAnyTaskCompleted();
            yield buffer.shift() as HandlerResponse<Res>;
        }
    }

    process = (input: Iter<Req>): AsyncIterable<HandlerResponse<Res>> => {
        return this.#process(input);
    };
}

export function pool<Req, Res>(
    handler: Handler<Req, Res>,
    options: AsyncPoolOptions
) {
    return new AsyncPool(handler, options);
}
