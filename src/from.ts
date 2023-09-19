import { Iter } from './Iter';
import { Operator } from './Operator';

class Chain<I> {
    constructor(private source: Iter<I>) {}
    pipe<O>(op: Operator<I, O>) {
        if (typeof op === 'function') {
            return new Chain(op(this.source));
        } else {
            return new Chain(op.process(this.source));
        }
    }
    async consume(callback?: (value: I) => void | Promise<void>) {
        for await (const value of this.source) {
            await callback?.(value);
        }
    }
}

export function from<T>(source: Iter<T>) {
    return new Chain(source);
}
