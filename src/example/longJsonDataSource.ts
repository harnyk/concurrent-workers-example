export interface StubData {
    foo: string;
    baz: string;
}

export async function* longJsonDataSource() {
    for (let i = 0; i < 100; i++) {
        yield JSON.stringify({ foo: 'bar', baz: i.toString() }) + '\n';
    }
}
