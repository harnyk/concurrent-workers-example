export interface Handler<Req, Res> {
    (req: Req): Promise<Res>;
}
