// 自描述图片 URL（ADR-005，markdown module-spec §1）：文件名带宽高与主色，片段带排版标记。
// 纯函数，编辑器的图片菜单也会用到
const IMAGE_KEY = /^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_(\d+)x(\d+)_([0-9a-f]{6})\.(?:png|jpg|webp|gif)$/;
const MAX_DIMENSION = 20000;
const KNOWN_MARKS = ["wide", "live", "accordion"] as const;

export type ImageMark = (typeof KNOWN_MARKS)[number];
export type ImageMarks = Record<ImageMark, boolean>;

export const stripFragment = (url: string) => url.split("#")[0];

const fragmentOf = (url: string) => {
  const i = url.indexOf("#");
  return i < 0 ? "" : url.slice(i + 1);
};

const validDimension = (n: number) => n >= 1 && n <= MAX_DIMENSION;

export function parseImageKey(url: string): { w: number; h: number; rgb: string } | null {
  const match = IMAGE_KEY.exec(stripFragment(url));
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  return validDimension(w) && validDimension(h) ? { w, h, rgb: match[3] } : null;
}

// 只认小写的已知标记，其余忽略（"#wide,foo" → wide）
export function parseMarks(url: string): ImageMarks {
  const parts = new Set(fragmentOf(url).split(","));
  return Object.fromEntries(KNOWN_MARKS.map((mark) => [mark, parts.has(mark)])) as ImageMarks;
}
