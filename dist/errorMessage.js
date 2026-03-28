export class httpError extends Error {
    status;
    constructor(status, messageErr) {
        super(messageErr);
        this.status = status;
    }
}
