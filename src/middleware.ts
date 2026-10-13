// 认证与 Origin 校验（auth domain-model §7）
import type { MiddlewareHandler } from "astro";
import { env } from "cloudflare:workers";
import { sanitizeNext } from "./domains/auth/next";
import { createAuthService } from "./domains/auth/service";
import type { AdminSession } from "./domains/auth/session-repo";
import { D1SessionRepo } from "./domains/auth/session-repo";
import { D1ThrottleRepo } from "./domains/auth/throttle-repo";
import { forbiddenOrigin, serverMisconfigured, unauthenticated } from "./lib/api/errors";

export const SESSION_COOKIE = "mh_session";
const LOGIN_PAGE = "/admin/login";
const LOGIN_API = "/api/admin/login";
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export interface AuthMiddlewareDeps {
  getSession(token: string | undefined, now: Date): Promise<AdminSession | null>;
  siteOrigin: string | undefined;
  now?: () => Date;
}

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

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
      if (!deps.siteOrigin) return serverMisconfigured(); // 无法校验来源时拒绝写操作
      if (requestOrigin(context.request) !== deps.siteOrigin) return forbiddenOrigin();
    }
    if (pathname === LOGIN_API) return next();

    const session = await deps.getSession(context.cookies.get(SESSION_COOKIE)?.value, now());
    context.locals.session = session;

    if (pathname === LOGIN_PAGE) return session ? redirect(sanitizeNext(searchParams.get("next"))) : next();
    if (session) return next();
    return isApi ? unauthenticated() : redirect(`${LOGIN_PAGE}?next=${encodeURIComponent(pathname + search)}`);
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
