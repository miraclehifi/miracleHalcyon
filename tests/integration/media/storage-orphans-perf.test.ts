import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { D1ImageReferenceQuery } from "../../../src/domains/post/image-reference-query";
import { D1ImageRepo, R2MediaStore } from "../../../src/domains/media/repo";
import { createStorageService } from "../../../src/domains/media/storage";
import { imageKey, NOW, seedImages, seedPosts } from "./storage-fixtures";

// [TC-US01-11][SC-DETECT-01] ADR-009 性能基线：300 篇（工作稿、快照各约 10 KB、各 10 张引用）/ 3,000 张（600 张未引用）< 2s
const POSTS = 300;
const IMAGES = 3000;
const ORPHANS = 600;
const FILLER = "正文段落，用来把文章撑到约 10 KB。".repeat(300);

beforeAll(async () => {
  await seedImages(Array.from({ length: IMAGES }, (_, i) => ({ key: imageKey(i) })));
  const referenced = IMAGES - ORPHANS; // 前 2,400 张被引用，每篇 8 张不同图片 + 2 张重复
  await seedPosts(
    Array.from({ length: POSTS }, (_, p) => {
      const refs = Array.from({ length: 10 }, (_, j) => `![x](/${imageKey((p * 8 + j) % referenced)})`).join("\n");
      return { body: `${FILLER}\n${refs}`, pubBody: `${refs}\n${FILLER}` };
    }),
  );
}, 120_000);

describe("存储检测性能", () => {
  it("[TC-US01-11] 300 篇 / 3,000 张：检测 < 2s，结果正确", async () => {
    const service = createStorageService({
      imageRepo: new D1ImageRepo(env.DB),
      mediaStore: new R2MediaStore(env.MEDIA),
      references: new D1ImageReferenceQuery(env.DB),
    });
    const started = performance.now();
    const summary = await service.detectOrphans(NOW);
    const elapsed = performance.now() - started;
    console.log(`orphan detection: ${elapsed.toFixed(0)} ms`);

    expect({ count: summary.orphanImageCount, fast: elapsed < 2000 }).toEqual({ count: ORPHANS, fast: true });
  }, 60_000);
});
