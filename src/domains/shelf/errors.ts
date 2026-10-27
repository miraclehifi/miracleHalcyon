// shelf 领域错误；API 层按 code 映射为 HTTP 状态与错误体（shelf api-contract §4）
export class ShelfValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor(readonly fields: string[]) {
    super(`VALIDATION_FAILED: ${fields.join(", ")}`);
    this.name = "ShelfValidationError";
  }
}

export class EntryNotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor(readonly id: number) {
    super(`NOT_FOUND: ${id}`);
    this.name = "EntryNotFoundError";
  }
}

export class DuplicateDoubanError extends Error {
  readonly code = "DUPLICATE_DOUBAN_ID";
  constructor(readonly existing: { id: number; title: string } | null) {
    super("DUPLICATE_DOUBAN_ID");
    this.name = "DuplicateDoubanError";
  }
}

export class CoverTypeError extends Error {
  readonly code = "COVER_TYPE_INVALID";
}

export class CoverTooLargeError extends Error {
  readonly code = "COVER_TOO_LARGE";
}

// 游戏封面只认 IGDB 链接，不接受上传文件（ADR-013 §5）
export class GameCoverUploadError extends Error {
  readonly code = "BAD_REQUEST";
}

// IgdbImageClient 内部错误：由服务翻译为 CoverLinkUnreachableError
export class IgdbImageError extends Error {
  readonly name = "IgdbImageError";
}

export class CoverLinkUnreachableError extends Error {
  readonly code = "COVER_LINK_UNREACHABLE";
}

// 豆瓣防腐层（shelf/douban/）内部错误：由 recognize 翻译为 RecognizeError
export class DoubanFetchError extends Error {
  readonly name = "DoubanFetchError";
}

export class DoubanParseError extends Error {
  readonly name = "DoubanParseError";
}

export type RecognizeCode = "NOT_DOUBAN_LINK" | "NOT_SUBJECT_LINK" | "FETCH_FAILED" | "PARSE_FAILED";

export class RecognizeError extends Error {
  constructor(readonly code: RecognizeCode) {
    super(code);
    this.name = "RecognizeError";
  }
}
