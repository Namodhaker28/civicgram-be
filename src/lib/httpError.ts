/** HTTP error with status for {@link ../middleware/errorHandler.js}. */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
