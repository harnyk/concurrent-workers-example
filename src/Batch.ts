import { Iter } from './Iter';
import { Operator } from './Operator';

export function batch<T>(batchSize: number): Operator<T, T[]> {
    return async function* batchOperator(input: Iter<T>): Iter<T[]> {
        let currentBatch: T[] = [];
        for await (const value of input) {
            currentBatch.push(value);
            if (currentBatch.length === batchSize) {
                yield currentBatch;
                currentBatch = [];
            }
        }
        if (currentBatch.length > 0) {
            yield currentBatch;
        }
    };
}
