// 认证与 Origin 校验（auth domain-model §7）
import type { MiddlewareHandler } from "astro";
import { env } from "cloudflare:workers";
import { sanitizeNext } from "./domains/auth/next";
import { createAuthService } from "./domains/auth/service";
import type { AdminSession } from "./domains/auth/session-repo";
import { D1SessionRepo } from "./domains/auth/session-repo";
import { D1ThrottleRepo } from "./domains/auth/throttle-repo";
import { forbiddenOrigin, serverMisconfigured, unauthenticated } from "./lib/api/errors";
import { SESSION_COOKIE } from "./lib/api/session-cookie";

const LOGIN_PAGE = "/admin/login";
const LOGIN_API = "/api/admin/login";
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export interface AuthMiddlewareDeps {
  getSession(token: string | undefined, now: Date): Promise<AdminSession | null>;
  siteOrigin: string | undefined;
  now?: () => Date;
}

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

// 拒绝写请求前读完请求体：本地 preview（miniflare）里带请求体的请求未被读取就返回时，同一连接上的下一个请求
// 会失败（如自动保存 PUT 收到 401 后跳登录页，登录页返回 500）；只 cancel 流不够，必须读完
async function reject(request: Request, response: Response): Promise<Response> {
  if (request.body) await request.arrayBuffer().catch(() => undefined);
  return response;
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

// Origin 缺失时取 Referer 的 origin；都缺失视为不可信
function requestOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (origin) return origin;
  const referer = request.headers.get("Referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function createAuthMiddleware(deps: AuthMiddlewareDeps): MiddlewareHandler {
  const now = deps.now ?? (() => new Date());

  return async (context, next) => {
    const { pathname, search, searchParams } = context.url;
    const isApi = isUnder(pathname, "/api/admin");
    if (!isApi && !isUnder(pathname, "/admin")) return next();

    if (!SAFE_METHODS.has(context.request.method)) {
      if (!deps.siteOrigin) return reject(context.request, serverMisconfigured()); // 无法校验来源时拒绝写操作
      if (requestOrigin(context.request) !== deps.siteOrigin) return reject(context.request, forbiddenOrigin());
    }
    if (pathname === LOGIN_API) return next();

    const session = await deps.getSession(context.cookies.get(SESSION_COOKIE)?.value, now());
    context.locals.session = session;

    if (pathname === LOGIN_PAGE) return session ? redirect(sanitizeNext(searchParams.get("next"))) : next();
    if (session) return next();
    return isApi ? reject(context.request, unauthenticated()) : redirect(`${LOGIN_PAGE}?next=${encodeURIComponent(pathname + search)}`);
  };
}

export const onRequest: MiddlewareHandler = (context, next) => {
  const auth = createAuthService({
    sessions: new D1SessionRepo(env.DB),
    throttles: new D1ThrottleRepo(env.DB),
    adminUsername: env.ADMIN_USERNAME ?? "",
    adminPasswordHash: env.ADMIN_PASSWORD_HASH ?? "",
  });
  return createAuthMiddleware({ getSession: auth.getSession, siteOrigin: env.SITE_ORIGIN })(context, next);
};
