// 豆瓣 Rexxar 客户端（shelf domain-model §2.2，ADR-011）：只请求白名单主机，不跟随跳转（3xx 视为失败），封面读取有大小上限
import { COVER_MAX_BYTES } from "../entry";
import { DoubanFetchError, DoubanForbiddenError, DoubanParseError, DoubanUserNotFoundError } from "../errors";
import { isValidDoubanUid, type ImportKind, type ImportStatus } from "./import";
import { isDoubanImageHost, isSafeUrl, type SubjectRef } from "./link";

export interface InterestQuery {
  uid: string;
  kind: ImportKind;
  status: ImportStatus;
  start: number;
  count: number;
}

export interface DoubanClient {
  fetchSubject(ref: SubjectRef, signal: AbortSignal): Promise<unknown>;
  fetchBookTags(id: string, signal: AbortSignal): Promise<string[]>;
  fetchCover(url: string, signal: AbortSignal): Promise<Uint8Array>;
  fetchInterests(query: InterestQuery, signal: AbortSignal): Promise<unknown>; // US-04：用户标记列表一页
}

export const REXXAR_ORIGIN = "https://m.douban.com/rexxar/api/v2/";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const HEADERS = { Referer: "https://m.douban.com/", "User-Agent": MOBILE_UA };

export function createDoubanClient(fetchImpl: typeof fetch = fetch): DoubanClient {
  async function get(url: string, signal: AbortSignal): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: HEADERS, redirect: "manual", signal });
    } catch (error) {
      throw new DoubanFetchError((error as Error)?.name ?? "network");
    }
    if (response.status < 200 || response.status >= 300) {
      await response.body?.cancel();
      throw new DoubanFetchError(String(response.status));
    }
    return response;
  }

  async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
    const text = await (await get(REXXAR_ORIGIN + path, signal)).text();
    try {
      return JSON.parse(text);
    } catch {
      throw new DoubanParseError("返回内容不是 JSON");
    }
  }

  // 标记列表：404 用户不存在；403 或返回体要求登录（code 1000 / need_login）→ 无权限；其余同 get
  async function fetchInterests({ uid, kind, status, start, count }: InterestQuery, signal: AbortSignal): Promise<unknown> {
    if (!isValidDoubanUid(uid)) throw new DoubanUserNotFoundError("用户 ID 不合法");
    const query = new URLSearchParams({ type: kind, status, start: String(start), count: String(count) });
    const url = `${REXXAR_ORIGIN}user/${encodeURIComponent(uid)}/interests?${query}`;
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: HEADERS, redirect: "manual", signal });
    } catch (error) {
      throw new DoubanFetchError((error as Error)?.name ?? "network");
    }
    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw new DoubanFetchError((error as Error)?.name ?? "network");
    }
    let json: unknown = undefined;
    try {
      json = JSON.parse(text);
    } catch {
      // 非 JSON：2xx → 解析失败，其余按状态码
    }
    const body = json && typeof json === "object" ? (json as { code?: unknown; msg?: unknown }) : {};
    const needLogin = body.code === 1000 || (typeof body.msg === "string" && body.msg.includes("need_login"));
    if (response.status === 404) throw new DoubanUserNotFoundError("404");
    if (response.status === 403 || needLogin) throw new DoubanForbiddenError(String(response.status));
    if (response.status < 200 || response.status >= 300) throw new DoubanFetchError(String(response.status));
    if (json === undefined) throw new DoubanParseError("返回内容不是 JSON");
    return json;
  }

  return {
    fetchInterests,

    fetchSubject: (ref, signal) => getJson(`${ref.kind}/${ref.id}`, signal),

    async fetchBookTags(id, signal) {
      const json = (await getJson(`book/${id}/tags`, signal)) as { tags?: unknown };
      return Array.isArray(json?.tags) ? json.tags.filter((t): t is string => typeof t === "string") : [];
    },

    async fetchCover(url, signal) {
      const parsed = new URL(url);
      if (!isSafeUrl(parsed) || !isDoubanImageHost(parsed.hostname)) throw new DoubanFetchError("封面地址不在白名单");
      const response = await get(parsed.href, signal);
      const reader = response.body?.getReader();
      if (!reader) throw new DoubanFetchError("封面为空");
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > COVER_MAX_BYTES) {
          await reader.cancel();
          throw new DoubanFetchError("封面超过 5 MB");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return bytes;
    },
  };
}
