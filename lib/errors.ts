/**
 * Errors that carry a message safe to show the person who triggered them.
 * Anything else is logged and replaced with a generic message.
 */
export class AppError extends Error {
  readonly publicMessage: string;
  readonly status: number;

  constructor(publicMessage: string, status = 400, options?: { cause?: unknown }) {
    super(publicMessage, options);
    this.name = "AppError";
    this.publicMessage = publicMessage;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string>;

  constructor(publicMessage: string, fieldErrors: Record<string, string> = {}) {
    super(publicMessage, 422);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ForbiddenError extends AppError {
  constructor(publicMessage = "You do not have permission to do that.") {
    super(publicMessage, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(publicMessage = "That record was not found.") {
    super(publicMessage, 404);
    this.name = "NotFoundError";
  }
}

export class RateLimitedError extends AppError {
  constructor(publicMessage = "Too many attempts. Please wait a few minutes and try again.") {
    super(publicMessage, 429);
    this.name = "RateLimitedError";
  }
}

export class ConfigurationError extends AppError {
  constructor(publicMessage: string) {
    super(publicMessage, 503);
    this.name = "ConfigurationError";
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(detail: string, options?: { cause?: unknown }) {
    super("The directory database is unavailable right now. Nothing was saved. Please try again shortly.", 503, options);
    this.name = "DatabaseUnavailableError";
    this.message = detail;
  }
}

export function publicMessageFor(error: unknown): string {
  if (error instanceof AppError) return error.publicMessage;
  return "Something went wrong and nothing was saved. Please try again. If it keeps happening, use the contact page.";
}
