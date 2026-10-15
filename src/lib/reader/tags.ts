// 标签地址（reader module-spec §2、ADR-007 验证结果④）：小写、非字母数字的连续字符换成 -，中文保留
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
