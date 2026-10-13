import { describe, expect, it } from "vitest";
import { normalizeContent, type DraftInput } from "../../../src/domains/post/content";
import { ValidationError } from "../../../src/domains/post/errors";

// [POST-UT-02] normalizeContent（post domain-model §2.2）
const BASE: DraftInput = { title: "Hello Astro", slug: "hello-astro", tags: [], summary: "", body: "正文", publishedAt: "2026-10-13" };

function failedFields(input: DraftInput): string[] | "ok" {
  try {
    normalizeContent(input);
    return "ok";
  } catch (error) {
    return error instanceof ValidationError ? error.fields : ["<非 ValidationError>"];
  }
}

describe("normalizeContent", () => {
  it("[POST-UT-02] 空白标题 → 无标题、标签去重；超长摘要 / 11 个标签 / 非法 slug 报 VALIDATION_FAILED 并带字段名", () => {
    const normalized = normalizeContent({ ...BASE, title: "  ", tags: ["Astro", "astro", " TS "], summary: "  摘要  " });
    const elevenTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);

    expect({
      title: normalized.title,
      tags: normalized.tags,
      summary: normalized.summary,
      longSummary: failedFields({ ...BASE, summary: "字".repeat(201) }),
      maxSummary: failedFields({ ...BASE, summary: "字".repeat(200) }),
      elevenTags: failedFields({ ...BASE, tags: elevenTags }),
      badSlug: failedFields({ ...BASE, slug: "Hello_World" }),
      emptySlug: failedFields({ ...BASE, slug: "" }),
      several: failedFields({ ...BASE, slug: "Hello_World", summary: "字".repeat(201), publishedAt: "2026-02-30" }),
    }).toEqual({
      title: "无标题",
      tags: ["Astro", "TS"],
      summary: "摘要",
      longSummary: ["summary"],
      maxSummary: "ok",
      elevenTags: ["tags"],
      badSlug: ["slug"],
      emptySlug: "ok",
      several: ["slug", "summary", "publishedAt"],
    });
  });
});
