// contentHash（post domain-model §2.2）：判断"有未发布修改"用内容哈希而不是时间
import { sha256Hex } from "../../lib/crypto";
import type { PostContent } from "./content";

// 固定字段顺序，与对象的键顺序无关；标签顺序有意义，原样保留。封面（F-002）只在非空时追加为第 7 项：
// 迁移 0003 之前存下的 draft_hash / pub_hash 保持有效，旧文章不会因迁移变成"有未发布修改"
function canonicalJson(content: Omit<PostContent, "cover"> & { cover?: string | null }): string {
  const fields: unknown[] = [content.title, content.slug, content.tags, content.summary, content.body, content.publishedAt];
  if (content.cover) fields.push(content.cover);
  return JSON.stringify(fields);
}

export function contentHash(content: Omit<PostContent, "cover"> & { cover?: string | null }): Promise<string> {
  return sha256Hex(canonicalJson(content));
}
