// POST /api/admin/logout（auth api-contract）：删除当前会话并清 Cookie，始终 204（无会话或已失效也成功，登出幂等）；
// GET 405，不改变会话（防 <img> 式触发）。Origin 已由 middleware 校验；middleware 对本接口不要求会话
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAuthService } from "../../../domains/auth/service";
import { D1SessionRepo } from "../../../domains/auth/session-repo";
import { D1ThrottleRepo } from "../../../domains/auth/throttle-repo";
import { methodNotAllowed } from "../../../lib/api/errors";
import { clearedSessionCookie, SESSION_COOKIE } from "../../../lib/api/session-cookie";

export const prerender = false;

export function createLogoutHandlers({ db }: { db: D1Database }): { POST: APIRoute; GET: APIRoute } {
  // 登出只用到会话仓储，账号配置不参与
  const auth = createAuthService({ sessions: new D1SessionRepo(db), throttles: new D1ThrottleRepo(db), adminUsername: "", adminPasswordHash: "" });
  return {
    async POST({ cookies, url }) {
      await auth.logout(cookies.get(SESSION_COOKIE)?.value);
      return new Response(null, { status: 204, headers: { "Set-Cookie": clearedSessionCookie(url) } });
    },
    GET: () => methodNotAllowed("POST"),
  };
}

export const POST: APIRoute = (context) => createLogoutHandlers({ db: env.DB }).POST(context);
export const GET: APIRoute = (context) => createLogoutHandlers({ db: env.DB }).GET(context);
