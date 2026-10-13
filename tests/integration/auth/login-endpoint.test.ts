import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../../../src/domains/auth/password";
import { D1ThrottleRepo } from "../../../src/domains/auth/throttle-repo";
import { createLoginHandler, type LoginConfig } from "../../../src/pages/api/admin/login";

// POST /api/admin/login 契约（auth api-contract）
const USERNAME = "halcyon";
const PASSWORD = "s3cret-password";
const NOW = new Date("2026-10-13T00:00:00.000Z");
const LOCKED_IP = "198.51.100.9";

interface Case {
  name: string;
  site?: string;
  ip: string;
  body: string;
  config?: Partial<LoginConfig>;
}
interface Outcome { status: number; code?: string; message?: string; cookie?: string; retryAfter?: string }

const json = (value: unknown) => JSON.stringify(value);
const CASES: [Case, Outcome][] = [
  [
    { name: "成功（https）", site: "https://miraclehalcyon.com", ip: "192.0.2.1", body: json({ username: USERNAME, password: PASSWORD }) },
    { status: 204, cookie: "mh_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800" },
  ],
  [
    { name: "成功（本地 http 去掉 Secure）", ip: "192.0.2.2", body: json({ username: USERNAME, password: PASSWORD }) },
    { status: 204, cookie: "mh_session=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800" },
  ],
  [{ name: "JSON 无法解析", ip: "192.0.2.3", body: "{" }, { status: 400, code: "VALIDATION_FAILED", message: "请输入账号和密码" }],
  [{ name: "缺字段", ip: "192.0.2.4", body: json({ username: USERNAME }) }, { status: 400, code: "VALIDATION_FAILED", message: "请输入账号和密码" }],
  [{ name: "类型不是 string", ip: "192.0.2.5", body: json({ username: USERNAME, password: 123 }) }, { status: 400, code: "VALIDATION_FAILED", message: "请输入账号和密码" }],
  [
    { name: "密码错误", ip: "192.0.2.6", body: json({ username: USERNAME, password: "nope" }) },
    { status: 401, code: "INVALID_CREDENTIALS", message: "账号或密码错误，请检查后重试" },
  ],
  [
    { name: "锁定中", ip: LOCKED_IP, body: json({ username: USERNAME, password: PASSWORD }) },
    { status: 429, code: "RATE_LIMITED", message: "尝试次数过多，请 15 分钟后再试", retryAfter: "600" },
  ],
  [
    { name: "缺配置", ip: "192.0.2.8", body: json({ username: USERNAME, password: PASSWORD }), config: { adminPasswordHash: undefined } },
    { status: 500, code: "SERVER_MISCONFIGURED" },
  ],
];

let adminPasswordHash: string;
beforeAll(async () => {
  adminPasswordHash = await hashPassword(PASSWORD);
  await new D1ThrottleRepo(env.DB).put(LOCKED_IP, { failCount: 0, lockedUntil: new Date(NOW.getTime() + 600_000) });
});

async function run({ site = "http://localhost:4321", ip, body, config }: Case): Promise<Outcome> {
  const handler = createLoginHandler({
    db: env.DB,
    config: { adminUsername: USERNAME, adminPasswordHash, siteOrigin: site, ...config },
    now: () => NOW,
  });
  const request = new Request(`${site}/api/admin/login`, { method: "POST", body, headers: { "CF-Connecting-IP": ip } });
  const response = await handler({ request, url: new URL(request.url) } as unknown as APIContext);

  const outcome: Outcome = { status: response.status };
  const cookie = response.headers.get("Set-Cookie");
  if (cookie) outcome.cookie = cookie.replace(/^mh_session=[A-Za-z0-9_-]{43};/, "mh_session=<token>;");
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) outcome.retryAfter = retryAfter;
  if (response.status >= 400) {
    const { error } = (await response.json()) as { error: { code: string; message: string } };
    outcome.code = error.code;
    if (response.status !== 500) outcome.message = error.message;
  }
  return outcome;
}

describe("POST /api/admin/login", () => {
  it("各分支的状态码、错误体、Cookie 与 Retry-After 符合契约", async () => {
    const actual: Record<string, Outcome> = {};
    for (const [testCase] of CASES) actual[testCase.name] = await run(testCase);

    expect(actual).toEqual(Object.fromEntries(CASES.map(([testCase, outcome]) => [testCase.name, outcome])));
  });
});
