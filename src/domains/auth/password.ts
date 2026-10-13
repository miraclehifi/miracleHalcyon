// PasswordHash 值对象（auth domain-model §3）：pbkdf2$<iterations>$<saltB64>$<hashB64>
const ALGORITHM = "pbkdf2";
const ITERATIONS = 100_000; // Cloudflare Workers 的 PBKDF2 上限
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export type PasswordHash = string;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, HASH_BYTES * 8);
  return new Uint8Array(bits);
}

// 常量时间比较：耗时只取决于长度，不取决于第几个字节不同
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(SALT_BYTES))): Promise<PasswordHash> {
  const hash = await derive(password, salt, ITERATIONS);
  return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(hash)].join("$");
}

// 格式不合法、iterations 超出 Workers 上限、base64 损坏一律返回 false，不抛错
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const [algorithm, iterationsText, saltB64, hashB64, ...rest] = stored.split("$");
  if (algorithm !== ALGORITHM || rest.length > 0 || !/^\d+$/.test(iterationsText ?? "")) return false;
  const iterations = Number(iterationsText);
  if (iterations < 1 || iterations > ITERATIONS) return false;
  try {
    const expected = fromBase64(hashB64);
    const actual = await derive(password, fromBase64(saltB64), iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
