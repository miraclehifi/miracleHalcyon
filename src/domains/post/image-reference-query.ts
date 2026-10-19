// 图片引用查询（post domain-model §6.1、ADR-009）：供 media 存储清理判定图片是否仍被文章使用。只读工作稿与快照四列。
// D1 内用递归 CTE 把每列正文扫一遍，取出每处 "img/" 之后的短片段（去重）；Worker 只解析这些片段，
// CPU 与正文总量无关（Workers 免费版每请求 10ms）。逐图 × 逐文 instr 的写法 300 篇 / 3,000 张要 30s+，已弃用
export interface ImageReference {
  referenced: boolean; // key 主干出现在 body / cover / pub_body / pub_cover 任一列
  liveReferenced: boolean; // 有视频的图片：body / pub_body 中有带 live 片段（不区分大小写）的引用，或直接出现视频地址——偏保守，宁可少删
}

export interface ImageReferenceQuery {
  classify(images: { key: string; videoKey: string | null }[]): Promise<Map<string, ImageReference>>;
}

// 去掉扩展名、保留点："img/…_112233.jpg" → "img/…_112233."（同时匹配图片与 .live.mp4 地址）
export function keyStem(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot > key.lastIndexOf("/") ? key.slice(0, dot + 1) : key;
}

const SNIPPET_CHARS = 120; // key 最长约 50 字符 + 片段（#wide,accordion,live）
const SNIPPETS_SQL = `
WITH RECURSIVE
src(kind, t) AS (
  SELECT 'b', body FROM posts WHERE instr(body, 'img/') > 0
  UNION ALL SELECT 'b', pub_body FROM posts WHERE instr(ifnull(pub_body, ''), 'img/') > 0
  UNION ALL SELECT 'c', cover FROM posts WHERE instr(ifnull(cover, ''), 'img/') > 0
  UNION ALL SELECT 'c', pub_cover FROM posts WHERE instr(ifnull(pub_cover, ''), 'img/') > 0
),
hit(kind, rest, snippet) AS (
  SELECT kind, t, NULL FROM src
  UNION ALL
  SELECT kind, substr(rest, instr(rest, 'img/') + 4), substr(rest, instr(rest, 'img/'), ${SNIPPET_CHARS}) FROM hit WHERE instr(rest, 'img/') > 0
)
SELECT DISTINCT kind, snippet FROM hit WHERE snippet IS NOT NULL`;

// 片段开头的 key 主干 + 扩展名 + 可选 URL 片段（到空白、引号、括号、尖括号为止）
const SNIPPET_PATTERN = /^(img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.)(live\.mp4|[a-z0-9]+)(#[^\s"'()<>[\]]*)?/;

export function collectReferences(rows: { kind: string; snippet: string }[]): { stems: Set<string>; liveStems: Set<string> } {
  const stems = new Set<string>();
  const liveStems = new Set<string>();
  for (const { kind, snippet } of rows) {
    const match = SNIPPET_PATTERN.exec(snippet);
    if (!match) continue;
    const [, stem, ext, fragment] = match;
    stems.add(stem);
    if (kind === "b" && (ext === "live.mp4" || fragment?.toLowerCase().includes("live"))) liveStems.add(stem); // 封面不播放实况
  }
  return { stems, liveStems };
}

export class D1ImageReferenceQuery implements ImageReferenceQuery {
  constructor(private readonly db: D1Database) {}

  async classify(images: { key: string; videoKey: string | null }[]): Promise<Map<string, ImageReference>> {
    const refs = new Map<string, ImageReference>();
    if (images.length === 0) return refs;
    const { results } = await this.db.prepare(SNIPPETS_SQL).all<{ kind: string; snippet: string }>();
    const { stems, liveStems } = collectReferences(results);
    for (const image of images) {
      const stem = keyStem(image.key);
      refs.set(image.key, { referenced: stems.has(stem), liveReferenced: image.videoKey !== null && liveStems.has(stem) });
    }
    return refs;
  }
}
