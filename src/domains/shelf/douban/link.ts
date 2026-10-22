// 豆瓣链接提取与白名单（shelf domain-model §2.1，ADR-011）：纯函数。App 分享链接即 dispatch 条目链接，不做短链跳转
import type { DoubanKind } from "../entry";

export interface SubjectRef {
  kind: DoubanKind;
  id: string;
}

export type ExtractedLink = { kind: "subject"; ref: SubjectRef } | { kind: "not_subject" };

export const isDoubanHost = (host: string) => {
  const h = host.toLowerCase();
  return h === "douban.com" || h.endsWith(".douban.com");
};

export const isDoubanImageHost = (host: string) => host.toLowerCase().endsWith(".doubanio.com");

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function isSafeUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password || url.port) return false;
  return !IPV4.test(url.hostname) && !url.hostname.startsWith("[");
}

const ID = "(\\d{1,12})";
const SUBJECT_PATTERNS: { host: (h: string) => boolean; path: RegExp; kind?: DoubanKind }[] = [
  { host: (h) => h === "book.douban.com", path: new RegExp(`^/subject/${ID}/?$`), kind: "book" },
  { host: (h) => h === "movie.douban.com", path: new RegExp(`^/subject/${ID}/?$`), kind: "movie" },
  { host: (h) => h === "m.douban.com", path: new RegExp(`^/(book|movie|game)/subject/${ID}/?$`) },
  { host: (h) => h === "www.douban.com" || h === "douban.com", path: new RegExp(`^/game/${ID}/?$`), kind: "game" },
  { host: (h) => h === "www.douban.com" || h === "douban.com", path: new RegExp(`^/doubanapp/dispatch/(book|movie|game)/${ID}/?$`) },
];

export function parseSubjectUrl(url: URL): SubjectRef | null {
  const host = url.hostname.toLowerCase();
  for (const pattern of SUBJECT_PATTERNS) {
    if (!pattern.host(host)) continue;
    const match = pattern.path.exec(url.pathname);
    if (!match) continue;
    return pattern.kind ? { kind: pattern.kind, id: match[1] } : { kind: match[1] as DoubanKind, id: match[2] };
  }
  return null;
}

// 链接遇空白、中文标点、引号或尖括号截断
const LINK = /https?:\/\/[^\s，。！？；：、“”‘’（）【】《》<>"']+/gi;

// 按出现顺序取第一个安全且主机为豆瓣的链接；是条目则返回条目，否则 not_subject；没有豆瓣链接 → null
export function extractDoubanLink(text: string): ExtractedLink | null {
  for (const [candidate] of text.matchAll(LINK)) {
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      continue;
    }
    if (!isSafeUrl(url) || !isDoubanHost(url.hostname)) continue;
    const ref = parseSubjectUrl(url);
    return ref ? { kind: "subject", ref } : { kind: "not_subject" };
  }
  return null;
}
