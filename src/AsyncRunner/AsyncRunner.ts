import { HandlerResponse } from './Handler';
import { Handler } from './Handler';
import { TaskWorker } from './TaskWorker';

interface AsyncRunnerOptions<Req, Res> {
    concurrency: number;
    source: AsyncGenerator<Req>;
    handler: Handler<Req, Res>;
    rateLimitTimeout: number;
    onResponse: (response: HandlerResponse<Res>) => void;
}

export class AsyncRunner<Req, Res> {
    private isRateLimited = false;
    private continueAfter = 0;
    private workers: TaskWorker<Req, Res>[] = [];

    constructor(private options: AsyncRunnerOptions<Req, Res>) {
        this.initWorkers();
    }

    private refreshWorkerStatuses() {
        const freeWorker = this.workers.find((w) => !w.isBusy());
        if (!freeWorker) {
            return;
        }
        if (this.freeWorkerCallback) {
            this.freeWorkerCallback(freeWorker);
            this.freeWorkerCallback = null;
        }
    }

    private handleResponse(response: HandlerResponse<Res>) {
        this.refreshWorkerStatuses();
        this.options.onResponse(response);
        if (response.kind === 'ratelimit') {
            this.isRateLimited = true;
            this.continueAfter = Date.now() + this.options.rateLimitTimeout;
        }
    }

    private initWorkers() {
        const workers: TaskWorker<Req, Res>[] = [];
        for (let i = 0; i < this.options.concurrency; i++) {
            const w = new TaskWorker<Req, Res>({
                onResponse: (response) => {
                    this.handleResponse(response);
                },
            });
            workers.push(w);
        }

        this.workers = workers;
    }

    private freeWorkerCallback:
        | ((worker: TaskWorker<Req, Res>) => void)
        | null = null;

    private async getFreeWorker() {
        return new Promise<TaskWorker<Req, Res>>((resolve) => {
            this.freeWorkerCallback = resolve;
            this.refreshWorkerStatuses();
        });
    }

    async start() {
        for await (const request of this.options.source) {
            const worker = await this.getFreeWorker();
            worker.handle(request, this.options.handler);
        }
    }
}
