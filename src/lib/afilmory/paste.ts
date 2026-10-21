// 粘贴识别（US-13 BH-01 ~ BH-04，editor module-spec §1"粘贴 Afilmory 照片"）：粘贴的整段文本是登记站点的
// 单张 / 多张分享代码或照片页链接 → 照片 id 列表；按标签的分享代码 → tag（不插入）；其余（其他站点、夹带文字、非法 id）→ null，照常粘贴
export type AfilmoryPaste = { kind: "photos"; ids: string[] } | { kind: "tag" } | null;

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const PHOTO_PATH = /^\/photos\/([A-Za-z0-9_-]{1,64})\/?$/;
const SCRIPT_TAG = /^<script\b([^>]*)>\s*<\/script>$/i;
const ATTRIBUTE = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const EMBED_PATH = "/share/embed.js";

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function attributesOf(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  return attributes;
}

const photos = (ids: string[]): AfilmoryPaste => (ids.length > 0 && ids.every((id) => ID.test(id)) ? { kind: "photos", ids } : null);

export function parseAfilmoryPaste(text: string, site: string | undefined): AfilmoryPaste {
  if (!site) return null;
  const trimmed = text.trim();

  const link = parseUrl(trimmed);
  if (link && /^https?:$/.test(link.protocol)) {
    const match = link.origin === site ? PHOTO_PATH.exec(link.pathname) : null;
    return match ? { kind: "photos", ids: [match[1]] } : null;
  }

  const script = SCRIPT_TAG.exec(trimmed);
  if (!script) return null;
  const attributes = attributesOf(script[1]);
  const src = parseUrl(attributes.get("src") ?? "");
  if (!src || src.origin !== site || src.pathname !== EMBED_PATH) return null;
  if (attributes.has("data-afilmory-tag")) return { kind: "tag" };
  const single = attributes.get("data-afilmory-photo");
  if (single !== undefined) return photos([single.trim()]);
  const many = attributes.get("data-afilmory-photos");
  if (many !== undefined) {
    return photos(
      many
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
  }
  return null;
}
