import { Handler, HandlerResponse } from './Handler';

export class TaskWorker<Req, Res> {
    #isBusy = false;

    constructor(
        private options: {
            onResponse: (response: HandlerResponse<Res>) => void;
        }
    ) {}

    public isBusy() {
        return this.#isBusy;
    }

    public async handle(
        request: Req,
        handler: Handler<Req, Res>
    ): Promise<void> {
        if (this.#isBusy) {
            throw new Error('Worker is busy');
        }
        this.#isBusy = true;
        const res = await handler(request);
        this.#isBusy = false;
        this.onResponse(res);
    }

    public onResponse(response: HandlerResponse<Res>) {
        this.options.onResponse(response);
    }
}
