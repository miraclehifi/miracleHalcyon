import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { createAuthService, hashToken } from "../../../src/domains/auth/service";
import { D1SessionRepo } from "../../../src/domains/auth/session-repo";
import { D1ThrottleRepo } from "../../../src/domains/auth/throttle-repo";
import { createAuthMiddleware } from "../../../src/middleware";
import { createLogoutHandlers } from "../../../src/pages/api/admin/logout";

// POST /api/admin/logout（auth api-contract；无效会话也返回成功——2026-10-14 作者确认）
const NOW = new Date("2026-10-14T00:00:00.000Z");
const HTTPS = "https://miraclehalcyon.com";
const HTTP = "http://localhost:4321";

const sessions = () => new D1SessionRepo(env.DB);
const auth = () =>
  createAuthService({ sessions: sessions(), throttles: new D1ThrottleRepo(env.DB), adminUsername: "", adminPasswordHash: "" });

// 直接插入会话（不走密码哈希，快）
async function newSession(ageMs = 0): Promise<string> {
  const token = crypto.randomUUID().replaceAll("-", "").padEnd(43, "x");
  const createdAt = new Date(NOW.getTime() - ageMs);
  await sessions().insert({ tokenHash: await hashToken(token), createdAt, expiresAt: new Date(createdAt.getTime() + 7 * 24 * 3600_000) });
  return token;
}

function context(method: string, site: string, token?: string): APIContext {
  const request = new Request(`${site}/api/admin/logout`, { method, headers: { Origin: site } });
  return {
    request,
    url: new URL(request.url),
    cookies: { get: (name: string) => (token !== undefined && name === "mh_session" ? { value: token } : undefined) },
    locals: {},
  } as unknown as APIContext;
}

const handlers = createLogoutHandlers({ db: env.DB });
const logout = (token?: string, site = HTTP) => handlers.POST(context("POST", site, token));
const isValid = async (token: string) => (await auth().getSession(token, NOW)) !== null;

describe("POST /api/admin/logout", () => {
  // [TC-US02-01][TC-US02-05][TC-US02-17][SC-LOGOUT-01] 有效会话：204，清除 Cookie（属性与签发时一致），会话失效
  it("有效会话登出：204、清 Cookie、会话失效", async () => {
    const httpsToken = await newSession();
    const httpToken = await newSession();
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");

    const https = await logout(httpsToken, HTTPS);
    const http = await logout(httpToken);
    const logged = [...log.mock.calls, ...error.mock.calls].flat().map(String).join(" ");

    expect({
      status: [https.status, http.status],
      cookie: [https.headers.get("Set-Cookie"), http.headers.get("Set-Cookie")],
      valid: [await isValid(httpsToken), await isValid(httpToken)],
      tokenLeaked: logged.includes(httpsToken) || logged.includes(httpToken),
    }).toEqual({
      status: [204, 204],
      cookie: ["mh_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0", "mh_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"],
      valid: [false, false],
      tokenLeaked: false,
    });
  });

  // [TC-US02-06] 多会话：只失效当前会话
  // [TC-US02-07][TC-US02-08][TC-US02-09][SC-LOGOUT-04] 无 / 伪造 / 过期 / 已登出 / 超长 / 注入 Cookie 与重复登出都返回 204 并清 Cookie，不误删其他会话
  it("无效会话与重复登出幂等成功，不影响其他会话", async () => {
    const a = await newSession();
    const b = await newSession();
    const expired = await newSession(7 * 24 * 3600_000 + 60_000);
    await logout(a);

    const variants = [undefined, a, "f".repeat(43), expired, "", "x".repeat(4000), "' OR '1'='1"];
    const results = [];
    for (const token of variants) {
      const response = await logout(token);
      results.push(`${response.status} ${response.headers.get("Set-Cookie")?.endsWith("Max-Age=0")}`);
    }

    expect({ results, a: await isValid(a), b: await isValid(b) }).toEqual({ results: variants.map(() => "204 true"), a: false, b: true });
  });

  // [TC-US02-11] GET 不登出：405，不下发 Cookie，会话仍有效
  it("GET 返回 405 且不改变会话", async () => {
    const token = await newSession();
    const response = await handlers.GET(context("GET", HTTP, token));
    const body = (await response.json()) as { error: { code: string } };

    expect({ status: response.status, code: body.error.code, cookie: response.headers.get("Set-Cookie"), valid: await isValid(token) }).toEqual({
      status: 405,
      code: "METHOD_NOT_ALLOWED",
      cookie: null,
      valid: true,
    });
  });
});

// [TC-US02-03][TC-US02-04][TC-US02-10][SC-LOGOUT-02] 经 middleware：登出后旧会话访问页面跳登录、写接口 401；
// 登出接口无会话也放行，但 Origin 外域 / 缺失仍 403
describe("登出与 middleware", () => {
  const middleware = createAuthMiddleware({ getSession: (token, now) => auth().getSession(token, now), siteOrigin: HTTP, now: () => NOW });
  const through = async (method: string, path: string, token: string | undefined, origin: string | null) => {
    const request = new Request(`${HTTP}${path}`, { method, headers: origin ? { Origin: origin } : {} });
    const ctx = {
      request,
      url: new URL(request.url),
      cookies: { get: (name: string) => (token && name === "mh_session" ? { value: token } : undefined) },
      locals: {},
    } as unknown as APIContext;
    const response = (await middleware(ctx, async () => new Response("next"))) as Response;
    return `${response.status}${response.headers.get("Location") ? ` ${response.headers.get("Location")}` : ""}`;
  };

  it("旧会话被拒；登出接口无会话放行、校验 Origin", async () => {
    const old = await newSession();
    await logout(old);

    expect({
      page: await through("GET", "/admin", old, null),
      create: await through("POST", "/api/admin/posts", old, HTTP),
      save: await through("PUT", "/api/admin/posts/1", old, HTTP),
      publish: await through("POST", "/api/admin/posts/1/publish", old, HTTP),
      remove: await through("DELETE", "/api/admin/posts/1", old, HTTP),
      upload: await through("POST", "/api/admin/images", old, HTTP),
      logoutWithoutSession: await through("POST", "/api/admin/logout", undefined, HTTP),
      logoutCrossOrigin: await through("POST", "/api/admin/logout", old, "https://evil.example"),
      logoutNoOrigin: await through("POST", "/api/admin/logout", old, null),
    }).toEqual({
      page: "302 /admin/login?next=%2Fadmin",
      create: "401",
      save: "401",
      publish: "401",
      remove: "401",
      upload: "401",
      logoutWithoutSession: "200",
      logoutCrossOrigin: "403",
      logoutNoOrigin: "403",
    });
  });
});
