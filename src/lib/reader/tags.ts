// 标签地址与分组（reader module-spec §2、ADR-007 验证结果④）
import type { ReaderPost, TagGroup } from "./types";

// 小写、非字母数字的连续字符换成 -，中文保留
export function tagSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tag";
}

export const tagHref = (slug: string): string => `/tags/${slug}`;

// FNV-1a 32 位取前 6 位十六进制：同步可用（构建时在 workerd 中运行，crypto.subtle 只有异步接口）
function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").slice(0, 6);
}

// posts 须已按 sortPublished 排序（新 → 旧）。大小写不同的写法合并为一组；显示名取出现最多的写法，
// 平手取最早发布文章中的写法；不同标签得到同一地址时，除篇数最多（平手按名称）的组外追加短哈希
export function groupTags(posts: readonly ReaderPost[]): TagGroup[] {
  const groups = new Map<string, { posts: ReaderPost[]; spellings: Map<string, { count: number; oldest: number }> }>();
  posts.forEach((post, order) => {
    const seen = new Set<string>();
    for (const tag of post.tags) {
      const key = tag.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key) ?? { posts: [], spellings: new Map() };
      groups.set(key, group);
      group.posts.push(post);
      const spelling = group.spellings.get(tag) ?? { count: 0, oldest: order };
      spelling.count += 1;
      spelling.oldest = Math.max(spelling.oldest, order);
      group.spellings.set(tag, spelling);
    }
  });

  const result = [...groups.entries()].map(([key, group]) => {
    const [name] = [...group.spellings.entries()].sort((a, b) => b[1].count - a[1].count || b[1].oldest - a[1].oldest)[0];
    return { key, slug: tagSlug(name), name, count: group.posts.length, posts: group.posts };
  });
  result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh"));

  const taken = new Set<string>();
  return result.map(({ key, slug, name, count, posts: members }) => {
    const unique = taken.has(slug) ? `${slug}-${shortHash(key)}` : slug;
    taken.add(unique);
    return { slug: unique, name, count, posts: members };
  });
}

// 小写标签名 → 地址：卡片、标题区的标签链接与标签页使用同一份映射（显示名小写即分组键）
export function tagSlugMap(groups: readonly TagGroup[]): (name: string) => string {
  const map = new Map(groups.map((group) => [group.name.trim().toLowerCase(), group.slug]));
  return (name) => map.get(name.trim().toLowerCase()) ?? tagSlug(name);
}
