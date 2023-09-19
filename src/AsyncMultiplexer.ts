interface AsyncMultiplexerOptions<T> {
    source: AsyncGenerator<T>;
    batchSize: number;
}

export class AsyncMultiplexer<T> implements AsyncIterable<T[]> {
    constructor(private options: AsyncMultiplexerOptions<T>) {}
    async *[Symbol.asyncIterator](): AsyncGenerator<T[]> {
        let currentBatch = [];
        for await (const data of this.options.source) {
            currentBatch.push(data);
            if (currentBatch.length === this.options.batchSize) {
                yield currentBatch;
                currentBatch = [];
            }
        }
        if (currentBatch.length > 0) {
            yield currentBatch;
        }
    }
}
