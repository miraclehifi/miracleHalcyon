import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createAuthService, hashToken } from "../../../src/domains/auth/service";
import { D1SessionRepo } from "../../../src/domains/auth/session-repo";
import { D1ThrottleRepo } from "../../../src/domains/auth/throttle-repo";
import { createAuthMiddleware } from "../../../src/middleware";

// [AUTH-UT-07] middleware 行为（auth domain-model §7）：4 类请求 × 有 / 无会话 × Origin 同源 / 异源 / 缺失
const SITE = "http://localhost:4321";
const TOKEN = "k".repeat(43);
const NOW = new Date("2026-10-13T00:00:00.000Z");

type Session = "with" | "without";
type Origin = "same" | "cross" | "missing";
interface Outcome { status: number; location?: string; code?: string }

const REQUESTS = {
  loginPage: { method: "GET", path: "/admin/login?next=/admin/posts/1" },
  page: { method: "GET", path: "/admin/posts?tab=draft" },
  loginApi: { method: "POST", path: "/api/admin/login" },
  api: { method: "POST", path: "/api/admin/posts" },
} as const;

const NEXT: Outcome = { status: 200 };
const FORBIDDEN: Outcome = { status: 403, code: "FORBIDDEN_ORIGIN" };

// 期望（与 §7 表一致）；GET 页面不校验 Origin
function expected(kind: keyof typeof REQUESTS, session: Session, origin: Origin): Outcome {
  switch (kind) {
    case "loginPage":
      return session === "with" ? { status: 302, location: "/admin/posts/1" } : NEXT;
    case "page":
      return session === "with" ? NEXT : { status: 302, location: "/admin/login?next=%2Fadmin%2Fposts%3Ftab%3Ddraft" };
    case "loginApi":
      return origin === "same" ? NEXT : FORBIDDEN;
    case "api":
      if (origin !== "same") return FORBIDDEN;
      return session === "with" ? NEXT : { status: 401, code: "UNAUTHENTICATED" };
  }
}

function originHeaders(origin: Origin): Record<string, string> {
  if (origin === "same") return { Origin: SITE };
  if (origin === "cross") return { Origin: "https://evil.example" };
  return {};
}

function fakeContext(method: string, path: string, session: Session, origin: Origin): APIContext {
  const request = new Request(`${SITE}${path}`, { method, headers: originHeaders(origin) });
  return {
    request,
    url: new URL(request.url),
    cookies: { get: (name: string) => (session === "with" && name === "mh_session" ? { value: TOKEN } : undefined) },
    locals: {},
  } as unknown as APIContext;
}

async function outcome(response: Response): Promise<Outcome> {
  const result: Outcome = { status: response.status };
  const location = response.headers.get("Location");
  if (location) result.location = location;
  if (response.status >= 400) result.code = ((await response.json()) as { error: { code: string } }).error.code;
  return result;
}

describe("auth middleware", () => {
  it("[AUTH-UT-07] 24 种组合的结果与 domain-model §7 一致", async () => {
    const sessions = new D1SessionRepo(env.DB);
    await sessions.insert({ tokenHash: await hashToken(TOKEN), createdAt: NOW, expiresAt: new Date("2026-10-20T00:00:00.000Z") });
    const auth = createAuthService({ sessions, throttles: new D1ThrottleRepo(env.DB), adminUsername: "a", adminPasswordHash: "x" });
    const middleware = createAuthMiddleware({ getSession: auth.getSession, siteOrigin: SITE, now: () => NOW });

    const actual: Record<string, Outcome> = {};
    const wanted: Record<string, Outcome> = {};
    for (const [kind, { method, path }] of Object.entries(REQUESTS) as [keyof typeof REQUESTS, (typeof REQUESTS)[keyof typeof REQUESTS]][]) {
      for (const session of ["with", "without"] as const) {
        for (const origin of ["same", "cross", "missing"] as const) {
          const key = `${kind}/${session}/${origin}`;
          const response = await middleware(fakeContext(method, path, session, origin), async () => new Response("next"));
          actual[key] = await outcome(response as Response);
          wanted[key] = expected(kind, session, origin);
        }
      }
    }

    expect(actual).toEqual(wanted);
  });
});
