// Slug 值对象与 slugify（post domain-model §3），前后端共用的纯函数
export const SLUG_MAX_LENGTH = 80;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return value.length >= 1 && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

// NFKD → 去组合附加符号 → 小写 → 非 [a-z0-9] 换成 - → 合并、去首尾 - → 截断到 80（不以 - 结尾）
// 结果为空（如纯中文标题）返回 ''，前端提示"请填写英文 slug"
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
}
