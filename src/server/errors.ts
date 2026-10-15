import type { FieldErrors } from "@/lib/validation";

/** Thrown when a record does not exist *for this user*. Never reveals whether it exists for someone else. */
export class NotFoundError extends Error {
  constructor(public readonly entity: string) {
    super(`${entity} not found`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

/** A business-rule conflict; `code` is an i18n key under `errors.*`. */
export class ConflictError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ConflictError";
  }
}
