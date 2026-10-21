// 照片信息 → Markdown（US-13 BH-01、BH-06、BH-07，ADR-010 第 1、3 点）：
// ![](原图#ext=宽x高x主色[,mp=偏移+长度][,live])；缩略图与推导规则不符或原图不在登记前缀下 → 普通外链 + 提示
import type { AfilmoryPhotoInfo } from "../../domains/media/afilmory";
import { thumbnailFor } from "../markdown/plugins/external-photo";

export type { AfilmoryPhotoInfo };

export const WARNING_UNCONVENTIONAL = "这张照片的存储位置不符合约定，已按普通外链插入";

// 括号会截断 Markdown 链接，编码掉；其余字符接口已按 URL 规范编码
const markdownUrl = (url: string) => url.replace(/\(/g, "%28").replace(/\)/g, "%29");

export function afilmoryMarkdown(info: AfilmoryPhotoInfo, { storage, live }: { storage: string | undefined; live: boolean }): { markdown: string; warning?: string } {
  const url = markdownUrl(info.url);
  if (!storage || thumbnailFor(info.url, storage) !== info.thumbnail) return { markdown: `![](${url})`, warning: WARNING_UNCONVENTIONAL };
  const parts = [`ext=${info.width}x${info.height}x${info.rgb}`];
  if (info.video) {
    parts.push(`mp=${info.video.offset}+${info.video.size}`);
    if (live) parts.push("live");
  }
  return { markdown: `![](${url}#${parts.join(",")})` };
}
