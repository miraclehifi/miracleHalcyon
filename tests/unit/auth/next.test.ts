import { describe, expect, it } from "vitest";
import { sanitizeNext } from "../../../src/domains/auth/next";

// [AUTH-UT-03] SafeNext：/admin 开头、非 //、不含 \、不含协议；否则回退 /admin
const CASES: [string | null, string][] = [
  ["/admin/posts/1?x=1", "/admin/posts/1?x=1"],
  ["/admin", "/admin"],
  ["//evil.com", "/admin"],
  ["https://evil.com", "/admin"],
  ["/\\evil", "/admin"],
  ["/posts", "/admin"],
  [null, "/admin"],
  ["/adminx", "/admin"], // 前缀相同但不是 /admin 路径
];

describe("sanitizeNext", () => {
  it("[AUTH-UT-03] 合法回跳原样返回，其余回退 /admin", () => {
    expect(CASES.map(([input]) => sanitizeNext(input))).toEqual(CASES.map(([, output]) => output));
  });
});
