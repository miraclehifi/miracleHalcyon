// media 领域错误；API 层按 code 映射为 HTTP 状态与错误体（media api-contract）
export class MediaValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(readonly fields: string[]) {
    super(`VALIDATION_FAILED: ${fields.join(", ")}`);
    this.name = "MediaValidationError";
  }
}

export class UnsupportedTypeError extends Error {
  readonly code = "UNSUPPORTED_TYPE";
  constructor() {
    super("UNSUPPORTED_TYPE");
    this.name = "UnsupportedTypeError";
  }
}

export class FileTooLargeError extends Error {
  readonly code = "FILE_TOO_LARGE";
  constructor(readonly size: number) {
    super(`FILE_TOO_LARGE: ${size}`);
    this.name = "FileTooLargeError";
  }
}

export class VideoTooLargeError extends Error {
  readonly code = "VIDEO_TOO_LARGE";
  constructor(readonly size: number) {
    super(`VIDEO_TOO_LARGE: ${size}`);
    this.name = "VideoTooLargeError";
  }
}

// R2 / D1 写入失败，已回滚
export class UploadFailedError extends Error {
  readonly code = "UPLOAD_FAILED";
  constructor(cause?: unknown) {
    super("UPLOAD_FAILED", { cause });
    this.name = "UploadFailedError";
  }
}
