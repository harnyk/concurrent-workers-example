export class Fifo<T> {
    #queue: T[] = [];
    #ended: boolean = false;
    #onEnd?: () => void;
    #waitEnd() {
        if (this.#ended) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => (this.#onEnd = resolve));
    }

    #onPush?: () => void;
    #waitPush() {
        return new Promise<void>((resolve) => (this.#onPush = resolve));
    }

    async *#flush(): AsyncGenerator<T> {
        while (this.#queue.length) {
            yield this.#queue.shift() as T;
        }
    }

    push(item: T) {
        this.#queue.push(item);
        this.#onPush?.();
    }
    end() {
        this.#ended = true;
        this.#onEnd?.();
    }
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
        for (;;) {
            yield* this.#flush();
            await Promise.race([this.#waitPush(), this.#waitEnd()]);
            if (this.#ended) {
                break;
            }
        }
        yield* this.#flush();
    }
}
