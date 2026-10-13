// SafeNext 值对象（auth domain-model §3）：登录后回跳地址，只允许站内 /admin 路径
export const DEFAULT_NEXT = "/admin";

// /admin 本身，或其后紧跟 / ? #；以 / 开头且不是 // 也就不可能带协议
const SAFE_NEXT = /^\/admin(?:[/?#]|$)/;
// 反斜杠与控制字符：浏览器会把 \ 当 /、丢弃制表符和换行，可能拼出 //host
// eslint-disable-next-line no-control-regex -- 就是要匹配控制字符
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

export function sanitizeNext(next: string | null): string {
  if (next == null || !SAFE_NEXT.test(next) || UNSAFE_CHARS.test(next)) return DEFAULT_NEXT;
  return next;
}
