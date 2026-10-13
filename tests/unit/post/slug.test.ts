import { describe, expect, it } from "vitest";
import { isValidSlug, SLUG_MAX_LENGTH, slugify } from "../../../src/domains/post/slug";

// [POST-UT-01] slugify（post domain-model §3）
const LONG_TITLE = "Building a Personal Blog with Astro and Cloudflare Workers from Scratch to Production Deployment Guide";

describe("slugify", () => {
  it("[POST-UT-01] 5 个输入的输出；结果都是合法 slug 或空串", () => {
    const long = slugify(LONG_TITLE);
    const outputs = [slugify("Hello Astro"), slugify("Café  Déjà-vu!"), slugify("你好世界"), slugify("Astro 5 入门")];

    expect({
      outputs,
      long: { withinMax: long.length <= SLUG_MAX_LENGTH, endsWithDash: long.endsWith("-"), valid: isValidSlug(long) },
      allValid: outputs.filter(Boolean).every(isValidSlug),
      rejects: ["Hello_World", "-a", "a--b", "", "a".repeat(81)].map(isValidSlug),
    }).toEqual({
      outputs: ["hello-astro", "cafe-deja-vu", "", "astro-5"],
      long: { withinMax: true, endsWithDash: false, valid: true },
      allValid: true,
      rejects: [false, false, false, false, false],
    });
  });
});
