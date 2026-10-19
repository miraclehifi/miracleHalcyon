// F-006 存储清理测试造数据（US-01-tests"测试数据"）：直接写 D1 images / posts 与 R2，created_at 按"现在"偏移
import { env } from "cloudflare:workers";

export const NOW = new Date("2026-10-16T06:00:00.000Z");
const HOUR = 3_600_000;
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

// 第 n 张图片的 key：10 位 base32 id，可选扩展名
export function imageKey(n: number, ext = "jpg"): string {
  let id = "";
  for (let rest = n, i = 0; i < 10; i++, rest = Math.floor(rest / 32)) id = BASE32[rest % 32] + id;
  return `img/2026/10/${id}_800x600_112233.${ext}`;
}

export const videoKeyOf = (key: string) => key.replace(/\.[a-z]+$/, ".live.mp4");

export interface SeedImage {
  key: string;
  size?: number;
  videoSize?: number;
  ageHours?: number;
  r2?: boolean; // 同时写 R2 对象（清理测试需要）
}

export async function seedImages(images: SeedImage[]): Promise<void> {
  const statements = images.map(({ key, size = 1000, videoSize, ageHours = 48 }) =>
    env.DB.prepare("INSERT INTO images (key, mime, size, width, height, rgb, video_key, video_size, original_name, created_at) VALUES (?, 'image/jpeg', ?, 800, 600, '112233', ?, ?, 'x.jpg', ?)").bind(
      key,
      size,
      videoSize === undefined ? null : videoKeyOf(key),
      videoSize ?? null,
      new Date(NOW.getTime() - ageHours * HOUR).toISOString(),
    ),
  );
  for (let i = 0; i < statements.length; i += 500) await env.DB.batch(statements.slice(i, i + 500));
  for (const image of images.filter((i) => i.r2)) {
    await env.MEDIA.put(image.key, new Uint8Array([1]));
    if (image.videoSize !== undefined) await env.MEDIA.put(videoKeyOf(image.key), new Uint8Array([2]));
  }
}

export interface SeedPost {
  body?: string;
  cover?: string | null;
  pubBody?: string | null; // 非 null 即已发布（同时写 pub_hash / pub_slug / pub_title，满足 CHECK）
  pubCover?: string | null;
}

let postSeq = 0;
export async function seedPosts(posts: SeedPost[]): Promise<void> {
  const statements = posts.map(({ body = "", cover = null, pubBody = null, pubCover = null }) => {
    const n = ++postSeq;
    const published = pubBody !== null;
    return env.DB.prepare(
      "INSERT INTO posts (title, slug, body, cover, draft_hash, pub_title, pub_slug, pub_body, pub_cover, pub_hash, created_at, updated_at) VALUES ('t', ?, ?, ?, 'h', ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      `p-${n}`,
      body,
      cover,
      published ? "t" : null,
      published ? `p-${n}` : null,
      pubBody,
      pubCover,
      published ? "h" : null,
      NOW.toISOString(),
      NOW.toISOString(),
    );
  });
  for (let i = 0; i < statements.length; i += 200) await env.DB.batch(statements.slice(i, i + 200));
}

export async function clearAll(): Promise<void> {
  await env.DB.batch([env.DB.prepare("DELETE FROM posts"), env.DB.prepare("DELETE FROM images")]);
  const listed = await env.MEDIA.list({ prefix: "img/" });
  if (listed.objects.length > 0) await env.MEDIA.delete(listed.objects.map((o) => o.key));
}
