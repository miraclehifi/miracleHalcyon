// 站点配置校验（reader module-spec §2 normalizeSiteConfig、reader-home.md"内容来源"）：构建时执行，不合法则构建失败
export interface SiteConfigInput {
  name: string;
  avatar: string;
  bio: string[];
  footerTagline: string;
  github?: string;
  photo?: string;
  email?: string;
  afilmory?: AfilmoryConfig; // US-13（ADR-010）：外链照片只认登记的 Afilmory 站点与照片存储前缀
}

export interface AfilmoryConfig {
  site: string; // 站点 origin，如 https://miraclehalcyon.afilmory.art
  storage: string; // 原图存储前缀，以 / 结尾
}

export interface SiteConfig {
  name: string;
  avatar: string;
  bio: string[];
  footerTagline: string;
  github: string | undefined;
  photo: string | undefined;
  email: string | undefined;
  afilmory: AfilmoryConfig | undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(field: string, reason: string): never {
  throw new Error(`site.${field} ${reason}`);
}

function optionalUrl(field: string, value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    fail(field, `不是合法地址：${v}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") fail(field, `只允许 http / https 地址：${v}`);
  return v;
}

function httpsUrl(field: string, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail(field, `不是合法地址：${value}`);
  }
  if (url.protocol !== "https:") fail(field, `只允许 https 地址：${value}`);
  return url;
}

function afilmoryConfig(raw: AfilmoryConfig | undefined): AfilmoryConfig | undefined {
  if (!raw) return undefined;
  const site = httpsUrl("afilmory.site", raw.site.trim().replace(/\/+$/, ""));
  if (site.href !== `${site.origin}/`) fail("afilmory.site", `只能是站点根地址：${raw.site}`);
  const storage = httpsUrl("afilmory.storage", raw.storage.trim());
  if (!storage.pathname.endsWith("/") || storage.search || storage.hash) fail("afilmory.storage", `必须以 / 结尾：${raw.storage}`);
  return { site: site.origin, storage: storage.href };
}

export function normalizeSiteConfig(raw: SiteConfigInput): SiteConfig {
  if (!raw.name?.trim()) fail("name", "不能为空");
  if (!raw.avatar?.trim()) fail("avatar", "不能为空");
  if (!Array.isArray(raw.bio) || raw.bio.filter((p) => p.trim()).length === 0) fail("bio", "至少一段");
  const email = raw.email?.trim() || undefined;
  if (email && !EMAIL.test(email)) fail("email", `格式不正确：${email}`);
  return {
    name: raw.name.trim(),
    avatar: raw.avatar.trim(),
    bio: raw.bio.map((p) => p.trim()).filter(Boolean),
    footerTagline: raw.footerTagline,
    github: optionalUrl("github", raw.github),
    photo: optionalUrl("photo", raw.photo),
    email,
    afilmory: afilmoryConfig(raw.afilmory),
  };
}
