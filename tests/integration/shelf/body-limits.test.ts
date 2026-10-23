import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CoverTooLargeError } from "../../../src/domains/shelf/errors";
import { readEntryForm } from "../../../src/lib/api/shelf-http";
import { createRecognizeHandler } from "../../../src/pages/api/admin/shelf/recognize";
import { SITE } from "./shelf-fixtures";

// code-review：超限请求按 Content-Length 拒绝前要读完请求体。本地 preview（miniflare）里带体请求没读就返回，
// 同一连接上的下一个请求会 500（middleware reject 同样处理）
const big = (bytes: number) => new Request(`${SITE}/x`, { method: "POST", headers: { "Content-Length": String(bytes) }, body: new Uint8Array(bytes) });

describe("超限请求体", () => {
  it("条目表单超过 6 MiB：COVER_TOO_LARGE，且请求体已读完", async () => {
    const request = big(6 * 1024 * 1024 + 1);
    await expect(readEntryForm(request)).rejects.toBeInstanceOf(CoverTooLargeError);
    expect(request.bodyUsed).toBe(true);
  });

  it("识别请求超过 64 KiB：400，且请求体已读完", async () => {
    const request = big(64 * 1024 + 1);
    const response = await createRecognizeHandler({ db: env.DB, bucket: env.MEDIA })({ request, url: new URL(request.url), params: {}, locals: {} } as unknown as APIContext);
    expect([response.status, request.bodyUsed]).toEqual([400, true]);
  });
});
