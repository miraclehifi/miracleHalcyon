import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { D1ImageRepo } from "../../../src/domains/media/repo";
import { createAuthMiddleware } from "../../../src/middleware";
import { createUploadImageHandler } from "../../../src/pages/api/admin/images";
import { GIF_1X1, HTML, PDF, PNG_1X1, SVG, jpeg } from "../../unit/media/image-bytes";

// POST /api/admin/images（media api-contract）：单图上传
const SITE = "http://localhost:4321";
const NOW = new Date("2026-10-14T03:00:00.000Z");
const handler = createUploadImageHandler({ db: env.DB, bucket: env.MEDIA, now: () => NOW });

interface Part {
  bytes: Uint8Array;
  name: string;
  type: string;
}

function form(file?: Part, fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  if (file) data.append("file", new File([file.bytes as Uint8Array<ArrayBuffer>], file.name, { type: file.type }));
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

async function call(body: FormData, headers: Record<string, string> = {}, h = handler) {
  const request = new Request(`${SITE}/api/admin/images`, { method: "POST", body, headers });
  const response = await h({ request, url: new URL(request.url) } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> & { error?: { code: string; message: string } } };
}

async function objectCount(): Promise<number> {
  return (await env.MEDIA.list({ prefix: "img/" })).objects.length;
}

const png = (name = "1x1.png"): Part => ({ bytes: PNG_1X1, name, type: "image/png" });

describe("POST /api/admin/images", () => {
  // [TC-US05-04][SC-IMAGE-01][SC-IMAGE-03] + [MEDIA-UT-07]
  it("gif 与 1×1 png 上传成功：201 契约字段、R2 对象类型与字节一致、images 记录；尺寸取文件头而非客户端上报", async () => {
    const gif = await call(form({ bytes: GIF_1X1, name: "anim.gif", type: "image/gif" }, { rgb: "8a7b6c" }));
    const tiny = await call(form(png(), { width: "4032", height: "3024" }));
    const gifObject = await env.MEDIA.get(String(gif.body.url).slice(1));
    const row = await env.DB.prepare("SELECT mime, size, width, height, rgb, original_name FROM images WHERE key = ?")
      .bind(String(tiny.body.url).slice(1))
      .first();

    expect({
      gif: gif.status,
      gifBody: gif.body,
      tinyUrl: tiny.body.url,
      gifType: gifObject?.httpMetadata?.contentType,
      gifCache: gifObject?.httpMetadata?.cacheControl,
      gifBytes: new Uint8Array(await gifObject!.arrayBuffer()),
      row,
    }).toEqual({
      gif: 201,
      gifBody: { url: expect.stringMatching(/^\/img\/2026\/10\/[a-z2-7]{10}_1x1_8a7b6c\.gif$/), width: 1, height: 1, rgb: "8a7b6c", live: false, videoUrl: null },
      tinyUrl: expect.stringMatching(/^\/img\/2026\/10\/[a-z2-7]{10}_1x1_808080\.png$/),
      gifType: "image/gif",
      gifCache: "public, max-age=31536000, immutable",
      gifBytes: GIF_1X1,
      row: { mime: "image/png", size: PNG_1X1.length, width: 1, height: 1, rgb: "808080", original_name: "1x1.png" },
    });
  });

  // [TC-US05-08][SC-IMAGE-05] + [TC-US05-16][SC-IMAGE-08]：服务端独立校验大小；0 字节与缺少 file 都是 400，无 5xx，R2 不新增
  it("超过 5MB → 413 图片不能超过 5MB；0 字节 / 缺少 file → 400", async () => {
    const before = await objectCount();
    const over = await call(form({ bytes: new Uint8Array(5_242_881), name: "over-5mb.png", type: "image/png" }));
    const big = await call(form({ bytes: new Uint8Array(6_291_456), name: "big-6mb.jpg", type: "image/jpeg" }));
    const empty = await call(form({ bytes: new Uint8Array(0), name: "empty.png", type: "image/png" }));
    const missing = await call(form(undefined, { rgb: "808080" }));

    expect({
      over: [over.status, over.body.error],
      big: [big.status, big.body.error?.code],
      empty: [empty.status, empty.body.error],
      missing: [missing.status, missing.body.error?.code],
      added: (await objectCount()) - before,
    }).toEqual({
      over: [413, { code: "FILE_TOO_LARGE", message: "图片不能超过 5MB" }],
      big: [413, "FILE_TOO_LARGE"],
      empty: [400, { code: "VALIDATION_FAILED", message: "不支持的图片格式", fields: ["file"] }],
      missing: [400, "VALIDATION_FAILED"],
      added: 0,
    });
  });

  // [TC-US05-14][TC-US05-15][SC-IMAGE-08] 按文件头判定：HTML / SVG / PDF 伪装成图片被拒；jpg 改名 .png 按 jpeg 存
  it("伪装文件 400 不支持的图片格式；jpg 改名 .png 成功且存为 image/jpeg", async () => {
    const before = await objectCount();
    const rejected = await Promise.all([
      call(form({ bytes: HTML, name: "fake.png", type: "image/png" })),
      call(form({ bytes: SVG, name: "svg-as.png", type: "image/png" })),
      call(form({ bytes: SVG, name: "logo.svg", type: "image/svg+xml" })),
      call(form({ bytes: PDF, name: "doc.jpg", type: "image/jpeg" })),
    ]);
    const addedByRejected = (await objectCount()) - before;
    const renamed = await call(form({ bytes: jpeg(800, 600), name: "photo.png", type: "image/png" }));
    const stored = await env.MEDIA.head(String(renamed.body.url).slice(1));

    expect({
      rejected: rejected.map((r) => [r.status, r.body.error]),
      addedByRejected,
      renamed: [renamed.status, renamed.body.url],
      storedType: stored?.httpMetadata?.contentType,
    }).toEqual({
      rejected: new Array(4).fill([400, { code: "UNSUPPORTED_TYPE", message: "不支持的图片格式" }]),
      addedByRejected: 0,
      renamed: [201, expect.stringMatching(/_800x600_808080\.jpg$/)],
      storedType: "image/jpeg",
    });
  });

  // [MEDIA-UT-04] 字段不合法 → 400 并列出字段；[MEDIA-UT-06] D1 插入失败 → 500 UPLOAD_FAILED，R2 无残留
  it("rgb 不合法 400；D1 写入失败时回滚 R2", async () => {
    const invalid = await call(form(png(), { rgb: "ZZZZZZ", width: "0" }));
    const before = await objectCount();
    const failingRepo = new (class extends D1ImageRepo {
      override async insert(): Promise<void> {
        throw new Error("D1 down");
      }
    })(env.DB);
    const broken = createUploadImageHandler({ db: env.DB, bucket: env.MEDIA, now: () => NOW, repo: failingRepo });
    const failed = await call(form(png()), {}, broken);

    expect({
      invalid: [invalid.status, invalid.body.error?.code, (invalid.body.error as { fields?: string[] }).fields],
      failed: [failed.status, failed.body.error],
      added: (await objectCount()) - before,
    }).toEqual({
      invalid: [400, "VALIDATION_FAILED", ["rgb", "width"]],
      failed: [500, { code: "UPLOAD_FAILED", message: "上传失败，请重试" }],
      added: 0,
    });
  });

  // 请求体超过 16 MiB：按 Content-Length 直接拒绝，不读取
  it("Content-Length 超过 16 MiB → 413 PAYLOAD_TOO_LARGE", async () => {
    const result = await call(form(png()), { "Content-Length": String(16 * 1024 * 1024 + 1) });
    expect([result.status, result.body.error?.code]).toEqual([413, "PAYLOAD_TOO_LARGE"]);
  });

  // [TC-US05-17][TC-US05-18][SC-IMAGE-08] 经 middleware：未登录 401、跨站 / 缺失 Origin 403，均不到达处理器
  it("未登录 401；跨站 Origin 403", async () => {
    const middleware = createAuthMiddleware({ getSession: async () => null, siteOrigin: SITE, now: () => NOW });
    let reached = 0;
    const run = async (headers: Record<string, string>) => {
      const request = new Request(`${SITE}/api/admin/images`, { method: "POST", body: form(png()), headers });
      const context = { request, url: new URL(request.url), cookies: { get: () => undefined }, locals: {} } as unknown as APIContext;
      const response = (await middleware(context, async () => {
        reached++;
        return new Response(null, { status: 201 });
      })) as Response;
      return [response.status, ((await response.json()) as { error: { code: string } }).error.code];
    };

    expect({
      guest: await run({ Origin: SITE }),
      cross: await run({ Origin: "https://evil.example" }),
      noOrigin: await run({}),
      reached,
    }).toEqual({ guest: [401, "UNAUTHENTICATED"], cross: [403, "FORBIDDEN_ORIGIN"], noOrigin: [403, "FORBIDDEN_ORIGIN"], reached: 0 });
  });
});
