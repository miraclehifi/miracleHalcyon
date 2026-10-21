import { describe, expect, it } from "vitest";
import { afilmoryMarkdown, WARNING_UNCONVENTIONAL, type AfilmoryPhotoInfo } from "../../../src/lib/afilmory/markdown";
import { parseAfilmoryPaste } from "../../../src/lib/afilmory/paste";

// US-13 粘贴识别与引用生成（UT-169、UT-170、TC-US13-14）
const SITE = "https://miraclehalcyon.afilmory.art";
const STORAGE = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
const embed = (attrs: string, src = `${SITE}/share/embed.js`) => `<script async src="${src}" ${attrs} data-width="100%"></script>`;

// [UT-169][SC-AFIL-01][SC-AFIL-02][SC-AFIL-03][SC-AFIL-04]
describe("parseAfilmoryPaste", () => {
  it("单张、多张分享代码与照片页链接 → 照片 id", () => {
    expect([
      parseAfilmoryPaste(embed('data-afilmory-photo="18369" data-aspect="3072:4096"'), SITE),
      parseAfilmoryPaste(`\n  ${embed('data-afilmory-photos="23473, 23514 ,,18382"')}\n`, SITE),
      parseAfilmoryPaste(`  ${SITE}/photos/18382\n`, SITE),
      parseAfilmoryPaste(`${SITE}/photos/18382/`, SITE),
      parseAfilmoryPaste(`${SITE}/photos/18382?from=share`, SITE),
    ]).toEqual([
      { kind: "photos", ids: ["18369"] },
      { kind: "photos", ids: ["23473", "23514", "18382"] },
      { kind: "photos", ids: ["18382"] },
      { kind: "photos", ids: ["18382"] },
      { kind: "photos", ids: ["18382"] },
    ]);
  });

  it("按标签的分享代码 → tag", () => {
    expect(parseAfilmoryPaste(embed('data-afilmory-tag="手办"'), SITE)).toEqual({ kind: "tag" });
  });

  it("其他站点、站点首页、其他网址、夹带文字、非法 id、空 ids、未登记站点 → null", () => {
    const cases = [
      embed('data-afilmory-photo="18382"', "https://other.afilmory.art/share/embed.js"),
      embed('data-afilmory-tag="手办"', "https://other.afilmory.art/share/embed.js"),
      `${SITE}/`,
      "https://example.com/photos/18382",
      `看这张：${embed('data-afilmory-photo="18382"')}`,
      embed('data-afilmory-photo="../x"'),
      embed('data-afilmory-photos=" , "'),
      embed(""),
      "普通文字",
    ];
    expect(cases.map((text) => parseAfilmoryPaste(text, SITE))).toEqual(cases.map(() => null));
    expect(parseAfilmoryPaste(`${SITE}/photos/18382`, undefined)).toBeNull();
  });
});

const info = (patch: Partial<AfilmoryPhotoInfo> = {}): AfilmoryPhotoInfo => ({
  id: "18369",
  url: `${STORAGE}18369.jpg`,
  thumbnail: `${STORAGE}.afilmory/thumbnails/18369.jpg`,
  width: 3072,
  height: 4096,
  rgb: "8c778e",
  video: { offset: 3337665, size: 14749941 },
  ...patch,
});

// [UT-170][TC-US13-14][SC-AFIL-01][SC-AFIL-06][SC-AFIL-07]
describe("afilmoryMarkdown", () => {
  it("实况开关决定 live；无视频时没有 mp 且忽略 live", () => {
    expect([
      afilmoryMarkdown(info(), { storage: STORAGE, live: true }),
      afilmoryMarkdown(info(), { storage: STORAGE, live: false }),
      afilmoryMarkdown(info({ video: undefined }), { storage: STORAGE, live: true }),
    ]).toEqual([
      { markdown: `![](${STORAGE}18369.jpg#ext=3072x4096x8c778e,mp=3337665+14749941,live)` },
      { markdown: `![](${STORAGE}18369.jpg#ext=3072x4096x8c778e,mp=3337665+14749941)` },
      { markdown: `![](${STORAGE}18369.jpg#ext=3072x4096x8c778e)` },
    ]);
  });

  it("缩略图不符或原图不在前缀下 → 普通外链 + 提示；括号编码", () => {
    expect(afilmoryMarkdown(info({ thumbnail: `${STORAGE}thumbs/18369.jpg` }), { storage: STORAGE, live: true })).toEqual({
      markdown: `![](${STORAGE}18369.jpg)`,
      warning: WARNING_UNCONVENTIONAL,
    });
    expect(afilmoryMarkdown(info({ url: "https://cdn.example.com/18369.jpg" }), { storage: STORAGE, live: false }).warning).toBe(WARNING_UNCONVENTIONAL);
    expect(afilmoryMarkdown(info({ url: `${STORAGE}a(1).jpg`, thumbnail: `${STORAGE}.afilmory/thumbnails/a(1).jpg` }), { storage: STORAGE, live: false }).markdown).toBe(
      `![](${STORAGE}a%281%29.jpg#ext=3072x4096x8c778e,mp=3337665+14749941)`,
    );
  });
});
