import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { D1ImageReferenceQuery, keyStem } from "../../../src/domains/post/image-reference-query";
import { clearAll, imageKey, seedPosts, videoKeyOf } from "../media/storage-fixtures";

// [POST-UT-15][POST-UT-16] ImageReferenceQuery（post domain-model §6.1、ADR-009）
const query = new D1ImageReferenceQuery(env.DB);
const image = (key: string, live = false) => ({ key, videoKey: live ? videoKeyOf(key) : null });

afterEach(clearAll);

describe("keyStem", () => {
  it("[POST-UT-15] 去掉扩展名、保留点；无扩展名原样", () => {
    expect([keyStem("img/2026/10/a_1x1_000000.jpg"), keyStem("img/2026/10/a_1x1_000000.webp"), keyStem("img/2026/10/a")]).toEqual([
      "img/2026/10/a_1x1_000000.",
      "img/2026/10/a_1x1_000000.",
      "img/2026/10/a",
    ]);
  });
});

describe("ImageReferenceQuery.classify", () => {
  it("[POST-UT-16][TC-US01-02][SC-DETECT-02][SC-DETECT-03][SC-DETECT-04] 四列任一出现即被引用", async () => {
    const [a, b, c1, c2, o] = [1, 2, 3, 4, 5].map((n) => imageKey(n));
    await seedPosts([
      { body: `![a](/${a})` }, // 草稿正文
      { body: "工作稿已删掉 B", pubBody: `![b](/${b})` }, // 只在已发布快照
      { cover: `/${c1}` },
      { pubBody: "正文", pubCover: `/${c2}`, cover: null },
    ]);
    const refs = await query.classify([a, b, c1, c2, o].map((k) => image(k)));

    expect([a, b, c1, c2, o].map((k) => refs.get(k)?.referenced)).toEqual([true, true, true, true, false]);
  });

  it("[POST-UT-16][TC-US01-03][SC-DETECT-05] 任何写法都算引用：图片语法 + title + 片段、链接、HTML、完整地址、代码块", async () => {
    const keys = [1, 2, 3, 4, 5].map((n) => imageKey(n));
    await seedPosts([
      { body: `![a](/${keys[0]}#wide,accordion "图注")` },
      { body: `[原图](/${keys[1]})` },
      { body: `<img src="/${keys[2]}">` },
      { body: `https://miracle-halcyon.example/${keys[3]}` },
      { body: "```\n/" + keys[4] + "\n```" },
    ]);
    const refs = await query.classify(keys.map((k) => image(k)));

    expect(keys.map((k) => refs.get(k)?.referenced)).toEqual([true, true, true, true, true]);
  });

  it("[POST-UT-16][TC-US01-07][SC-DETECT-05] key 匹配不误判：尺寸不同、月份不同、_ 不作通配不算；只出现视频地址算", async () => {
    const target = "img/2026/10/abcdefghij_800x600_112233.jpg";
    const viaVideo = "img/2026/10/bbcdefghij_800x600_112233.jpg";
    await seedPosts([
      { body: "/img/2026/10/abcdefghij_801x600_112233.jpg /img/2026/09/abcdefghij_800x600_112233.jpg /img/2026/10/abcdefghijX800x600_112233.jpg" },
      { body: `/${videoKeyOf(viaVideo)}` },
    ]);
    const refs = await query.classify([image(target), image(viaVideo)]);

    expect([refs.get(target)?.referenced, refs.get(viaVideo)?.referenced]).toEqual([false, true]);
  });

  it("[POST-UT-16][TC-US01-05][SC-DETECT-07][SC-DETECT-08] 实况引用决策表（保守判定）", async () => {
    const k = [1, 2, 3, 4, 5, 6, 7].map((n) => imageKey(n));
    await seedPosts([
      { body: `/${k[1]}\n![x](/${k[1]}#wide)` }, // #2 引用都不带 live
      { body: `![x](/${k[2]})`, pubBody: `![x](/${k[2]}#wide,live)` }, // #3 另一篇快照带 live
      { body: `![x](/${k[3]}#live)` }, // #4
      { body: `![x](/${k[4]}#LIVE)` }, // #5 大小写：保守视为带
      { body: `![x](/${k[5]}#wide) 后面另一段提到 live 这个词` }, // #6 片段只有 wide：与预览一致，不算带实况
      { body: `<video src="/${videoKeyOf(k[6])}">` }, // #8 直接引用视频
      { cover: `/${k[0]}` }, // 封面不参与实况判定
    ]);
    const refs = await query.classify(k.map((key) => image(key, true)));

    expect(k.map((key) => [refs.get(key)?.referenced, refs.get(key)?.liveReferenced])).toEqual([
      [true, false],
      [true, false],
      [true, true],
      [true, true],
      [true, true],
      [true, false],
      [true, true],
    ]);
  });

  it("[POST-UT-16] 没有视频的图片 liveReferenced 恒为 false；空列表不查询返回空", async () => {
    const plain = imageKey(9);
    await seedPosts([{ body: `![x](/${plain}#live)` }]);
    const refs = await query.classify([image(plain)]);

    expect({ plain: refs.get(plain), empty: (await query.classify([])).size }).toEqual({ plain: { referenced: true, liveReferenced: false }, empty: 0 });
  });
});
