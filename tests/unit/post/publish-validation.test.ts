import { describe, expect, it } from "vitest";
import { UNTITLED, type PostContent } from "../../../src/domains/post/content";
import { validateForPublish } from "../../../src/domains/post/post";

// [POST-UT-05] validateForPublish 决策表（post domain-model 不变量 2）：标题 × slug × 正文
const BASE: PostContent = { title: "Hello", slug: "hello", tags: [], summary: "", body: "正文", publishedAt: null };

describe("validateForPublish", () => {
  it("[POST-UT-05] 8 种组合中只有全部满足才通过；缺失字段按 title、slug、body 顺序", () => {
    const rows: Record<string, unknown> = {};
    for (const title of ["Hello", UNTITLED]) {
      for (const slug of ["hello", ""]) {
        for (const body of ["正文", " \n\t "]) {
          rows[`${title}|${slug || "空"}|${body.trim() ? "有" : "空白"}`] = validateForPublish({ ...BASE, title, slug, body });
        }
      }
    }

    expect(rows).toEqual({
      "Hello|hello|有": { ok: true },
      "Hello|hello|空白": { ok: false, missing: ["body"] },
      "Hello|空|有": { ok: false, missing: ["slug"] },
      "Hello|空|空白": { ok: false, missing: ["slug", "body"] },
      [`${UNTITLED}|hello|有`]: { ok: false, missing: ["title"] },
      [`${UNTITLED}|hello|空白`]: { ok: false, missing: ["title", "body"] },
      [`${UNTITLED}|空|有`]: { ok: false, missing: ["title", "slug"] },
      [`${UNTITLED}|空|空白`]: { ok: false, missing: ["title", "slug", "body"] },
    });
  });
});
