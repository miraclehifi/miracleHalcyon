import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { createAuthMiddleware } from "../../../src/middleware";
import { createAfilmoryPhotoHandler } from "../../../src/pages/api/admin/afilmory/photos/[id]";
import page from "../../fixtures/afilmory/photo-page.html?raw";

// GET /api/admin/afilmory/photos/{id}（media api-contract，US-13 TC-US13-13）。不访问真实 Afilmory：替换 fetch
const SITE = "http://localhost:4321";
const AFILMORY = "https://miraclehalcyon.afilmory.art";

async function call(id: string, fetch: typeof globalThis.fetch, site: string | undefined = AFILMORY) {
  const request = new Request(`${SITE}/api/admin/afilmory/photos/${id}`);
  const response = await createAfilmoryPhotoHandler({ site, fetch })({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> & { error?: { code: string; message: string } } };
}

const serve = (body: string | null, status = 200, headers?: HeadersInit) => vi.fn(async () => new Response(body, { status, headers }));

describe("GET /api/admin/afilmory/photos/{id}", () => {
  it("[TC-US13-13 #1] 未登录：middleware 返回 401，不进入处理", async () => {
    const middleware = createAuthMiddleware({ getSession: async () => null, siteOrigin: SITE, now: () => new Date() });
    const request = new Request(`${SITE}/api/admin/afilmory/photos/18369`);
    const context = { request, url: new URL(request.url), cookies: { get: () => undefined }, locals: {} } as unknown as APIContext;
    let reached = false;
    const response = (await middleware(context, async () => {
      reached = true;
      return new Response("ok");
    })) as Response;
    expect([response.status, reached]).toEqual([401, false]);
  });

  it("[TC-US13-13 #2] 非法 id：400，不请求外部", async () => {
    const fetch = serve(page);
    for (const id of ["../x", "a b", "x".repeat(65)]) {
      const { status, body } = await call(id, fetch);
      expect([status, body.error?.code]).toEqual([400, "VALIDATION_FAILED"]);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("[TC-US13-13 #3 #4] 200：动态照片带 video，普通照片没有；只请求登记站点、不跟随重定向", async () => {
    const fetch = serve(page);
    const live = await call("18369", fetch);
    expect(live).toEqual({
      status: 200,
      body: {
        id: "18369",
        url: "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/18369.jpg",
        thumbnail: "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/.afilmory/thumbnails/18369.jpg",
        width: 3072,
        height: 4096,
        rgb: "8c778e",
        video: { offset: 3337665, size: 14749941 },
      },
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect([url, init.redirect]).toEqual([`${AFILMORY}/photos/18369`, "manual"]);
    expect((await call("18382", serve(page))).body).not.toHaveProperty("video");
  });

  it("[TC-US13-13 #5] 清单中没有：404", async () => {
    const { status, body } = await call("99999", serve(page));
    expect([status, body.error]).toEqual([404, { code: "NOT_FOUND", message: "Afilmory 中没有这张照片" }]);
  });

  it("[TC-US13-13 #6 #7] 上游异常、无清单、损坏清单、重定向：502", async () => {
    const cases = [
      serve("err", 500),
      vi.fn(async () => {
        throw new TypeError("network");
      }),
      serve("<html></html>"),
      serve('<script id="manifest">window.__MANIFEST__ = {"version":"v10"};</script>'),
      serve(null, 302, { Location: "https://evil.example/" }),
    ];
    for (const fetch of cases) {
      const { status, body } = await call("18369", fetch as unknown as typeof globalThis.fetch);
      expect([status, body.error]).toEqual([502, { code: "UPSTREAM_UNAVAILABLE", message: "Afilmory 暂时无法访问" }]);
    }
  });

  it("未登记站点：500 SERVER_MISCONFIGURED", async () => {
    const { status, body } = await call("18369", serve(page), "");
    expect([status, body.error?.code]).toEqual([500, "SERVER_MISCONFIGURED"]);
  });
});
