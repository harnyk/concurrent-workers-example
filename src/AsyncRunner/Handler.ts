export interface Handler<Req, Res> {
    (req: Req): Promise<HandlerResponse<Res>>;
}

export interface HandlerResponse<T> {
    kind: 'success' | 'error' | 'ratelimit';
    value?: T;
}
