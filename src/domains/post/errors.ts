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
