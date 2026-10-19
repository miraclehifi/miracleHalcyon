import { describe, expect, it } from "vitest";
import { formatBytes } from "../../../src/lib/format/bytes";

// [F-006 UT-01] 文件体积显示（shared-field-formats"文件体积"）：1 MB = 1,048,576 B；≥ 1 MB 一位小数，< 1 MB 向上取整 KB，0 为 0 MB
describe("formatBytes", () => {
  it.each([
    [0, "0 MB"],
    [1, "1 KB"],
    [1024, "1 KB"],
    [1025, "2 KB"],
    [1_048_575, "1024 KB"],
    [1_048_576, "1.0 MB"],
    [6_000_000, "5.7 MB"],
    [26_552_460, "25.3 MB"],
  ])("[UT-01] %i B → %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});
