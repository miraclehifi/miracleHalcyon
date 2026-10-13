// POST /api/admin/login（auth api-contract）；Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAuthService } from "../../../domains/auth/service";
import { D1SessionRepo } from "../../../domains/auth/session-repo";
import { D1ThrottleRepo } from "../../../domains/auth/throttle-repo";
import { jsonError, serverMisconfigured } from "../../../lib/api/errors";
import { sessionCookie } from "../../../lib/api/session-cookie";

export const prerender = false;

const LOCAL_IP = "127.0.0.1";

export interface LoginConfig {
  adminUsername: string | undefined;
  adminPasswordHash: string | undefined;
  siteOrigin: string | undefined;
}

export interface LoginHandlerDeps {
  db: D1Database;
  config: LoginConfig;
  now?: () => Date;
}

const CONFIG_NAMES: Record<keyof LoginConfig, string> = {
  adminUsername: "ADMIN_USERNAME",
  adminPasswordHash: "ADMIN_PASSWORD_HASH",
  siteOrigin: "SITE_ORIGIN",
};

type CompleteConfig = { [K in keyof LoginConfig]: string };

// 缺少任一配置返回 null，并只记录配置名（不记录值）
function completeConfig(config: LoginConfig): CompleteConfig | null {
  const missing = (Object.keys(CONFIG_NAMES) as (keyof LoginConfig)[]).filter((key) => !config[key]);
  if (missing.length === 0) return config as CompleteConfig;
  console.error("SERVER_MISCONFIGURED: missing", missing.map((key) => CONFIG_NAMES[key]).join(", "));
  return null;
}

async function readCredentials(request: Request): Promise<{ username: string; password: string } | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return null;
    const { username, password } = body as Record<string, unknown>;
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}

export function createLoginHandler({ db, config, now = () => new Date() }: LoginHandlerDeps): APIRoute {
  return async ({ request, url }) => {
    const complete = completeConfig(config);
    if (!complete) return serverMisconfigured();

    const credentials = await readCredentials(request);
    if (!credentials) return jsonError(400, "VALIDATION_FAILED", "请输入账号和密码");

    const auth = createAuthService({
      sessions: new D1SessionRepo(db),
      throttles: new D1ThrottleRepo(db),
      adminUsername: complete.adminUsername,
      adminPasswordHash: complete.adminPasswordHash,
    });
    const at = now();
    const result = await auth.login({ ...credentials, ip: request.headers.get("CF-Connecting-IP") ?? LOCAL_IP, now: at });

    if (result.ok) return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookie(result.token, url) } });
    if (result.code === "RATE_LIMITED") {
      const retryAfter = Math.max(1, Math.ceil((result.lockedUntil.getTime() - at.getTime()) / 1000));
      return jsonError(429, "RATE_LIMITED", "尝试次数过多，请 15 分钟后再试", { "Retry-After": String(retryAfter) });
    }
    return jsonError(401, "INVALID_CREDENTIALS", "账号或密码错误，请检查后重试");
  };
}

export const POST: APIRoute = (context) =>
  createLoginHandler({
    db: env.DB,
    config: { adminUsername: env.ADMIN_USERNAME, adminPasswordHash: env.ADMIN_PASSWORD_HASH, siteOrigin: env.SITE_ORIGIN },
  })(context);
