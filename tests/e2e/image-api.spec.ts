import { expect, test } from "@playwright/test";
import { login } from "./support/admin";

const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

// [TC-US05-04][SC-IMAGE-01] 经真实服务（Astro + workerd）：上传 1×1 png 后按返回地址读取，类型、缓存头、字节一致；不合规地址 404
test("[TC-US05-04] 上传图片后可按地址公开读取", async ({ page, baseURL }) => {
  await login(page);
  const response = await page.request.post("/api/admin/images", {
    headers: { Origin: new URL(baseURL!).origin },
    multipart: { file: { name: "1x1.png", mimeType: "image/png", buffer: PNG_1X1 } },
  });
  expect(response.status()).toBe(201);
  const { url } = (await response.json()) as { url: string };

  const image = await page.request.get(url);
  expect({
    status: image.status(),
    type: image.headers()["content-type"],
    cache: image.headers()["cache-control"],
    same: Buffer.compare(await image.body(), PNG_1X1) === 0,
    missing: (await page.request.get("/img/2026/10/zzzzzzzzzz_1x1_808080.png")).status(),
  }).toEqual({ status: 200, type: "image/png", cache: "public, max-age=31536000, immutable", same: true, missing: 404 });
});
