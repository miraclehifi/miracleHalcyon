// post 领域错误；API 层按 code 映射为 HTTP 状态与错误体（post api-contract）
export class ValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(readonly fields: string[]) {
    super(`VALIDATION_FAILED: ${fields.join(", ")}`);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  readonly code = "POST_NOT_FOUND";
  constructor(readonly id: number) {
    super(`POST_NOT_FOUND: ${id}`);
    this.name = "NotFoundError";
  }
}

export class SlugTakenError extends Error {
  readonly code = "SLUG_TAKEN";
  constructor(readonly slug: string) {
    super(`SLUG_TAKEN: ${slug}`);
    this.name = "SlugTakenError";
  }
}

export class MissingFieldsError extends Error {
  readonly code = "MISSING_FIELDS";
  constructor(readonly fields: ("title" | "slug" | "body")[]) {
    super(`MISSING_FIELDS: ${fields.join(", ")}`);
    this.name = "MissingFieldsError";
  }
}

export class NotPublishedError extends Error {
  readonly code = "NOT_PUBLISHED";
  constructor(readonly id: number) {
    super(`NOT_PUBLISHED: ${id}`);
    this.name = "NotPublishedError";
  }
}
