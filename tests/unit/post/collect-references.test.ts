import { describe, expect, it } from "vitest";
import { parseMarks } from "../../../src/lib/markdown/plugins/image-key";
import { collectReferences } from "../../../src/domains/post/image-reference-query";

// [TC-US01-05][SC-DETECT-08] 引用查询的实况判定不能比 markdown 窄：parseMarks 判为 live 的地址，collectReferences 一定也判为 live
const KEY = "img/2026/10/abcdefghij_800x600_112233.jpg";
const STEM = "img/2026/10/abcdefghij_800x600_112233.";
const FRAGMENTS = ["", "#wide", "#live", "#wide,live", "#live,wide", "#accordion,wide,live", "#LIVE", "#lively", "#x,live", "#wide,,live", "#wide%20live"];

describe("collectReferences", () => {
  it.each(FRAGMENTS)("[TC-US01-05] 片段 %j：markdown 判为 live 时引用查询也判为 live", (fragment) => {
    const url = `/${KEY}${fragment}`;
    const { stems, liveStems } = collectReferences([{ kind: "b", snippet: `${KEY}${fragment}) 后文` }]);
    expect(stems.has(STEM)).toBe(true);
    if (parseMarks(url).live) expect(liveStems.has(STEM)).toBe(true);
  });

  it("[TC-US01-05] 封面（c）不参与实况判定；视频地址算带实况；不合格式的片段忽略", () => {
    const { stems, liveStems } = collectReferences([
      { kind: "c", snippet: `${KEY}#live` },
      { kind: "b", snippet: "img/2026/10/bbcdefghij_800x600_112233.live.mp4\" controls>" },
      { kind: "b", snippet: "img/not-a-key.png" },
    ]);
    expect({ stems: [...stems], live: [...liveStems] }).toEqual({
      stems: [STEM, "img/2026/10/bbcdefghij_800x600_112233."],
      live: ["img/2026/10/bbcdefghij_800x600_112233."],
    });
  });
});
