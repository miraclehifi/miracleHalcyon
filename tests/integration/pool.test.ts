import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Workers 测试环境", () => {
  it("D1 与 R2 绑定在 workerd 中可用", async () => {
    const row = await env.DB.prepare("SELECT 1 AS one").first<{ one: number }>();
    await env.MEDIA.put("pool-check.txt", "ok");
    const obj = await env.MEDIA.get("pool-check.txt");

    expect({ one: row?.one, media: await obj?.text() }).toEqual({ one: 1, media: "ok" });
  });
});
