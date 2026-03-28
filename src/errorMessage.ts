export class httpError extends Error {
    status: number;

    constructor(status: number, messageErr: string) {
        super(messageErr);
        this.status = status;
    }
}