// contentHash（post domain-model §2.2）：判断"有未发布修改"用内容哈希而不是时间
import { sha256Hex } from "../../lib/crypto";
import type { PostContent } from "./content";

// 固定字段顺序，与对象的键顺序无关；标签顺序有意义，原样保留
function canonicalJson(content: PostContent): string {
  return JSON.stringify([content.title, content.slug, content.tags, content.summary, content.body, content.publishedAt]);
}

export function contentHash(content: PostContent): Promise<string> {
  return sha256Hex(canonicalJson(content));
}
