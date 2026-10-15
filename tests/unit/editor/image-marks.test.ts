import { describe, expect, it } from "vitest";
import { setGalleryMode, toggleMark, type ImageLocation } from "../../../src/lib/editor/image-marks";

const SRC = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";

// 源码里第 n 张图片的位置（测试用：按 "![" 出现顺序）
function at(source: string, n = 0, src = SRC): ImageLocation {
  let start = -1;
  for (let i = 0; i <= n; i++) start = source.indexOf("![", start + 1);
  const end = source.indexOf(")", start) + 1;
  return { start, end, src };
}

function apply(source: string, location: ImageLocation, on: boolean): string | null {
  const edit = toggleMark(source, location, "wide", on);
  return edit && source.slice(0, edit.from) + edit.insert + source.slice(edit.to);
}

// UT-134：标记合并矩阵（TC-US12-10）；只改 range 内的 URL
describe("toggleMark", () => {
  it("开 / 关宽图的合并矩阵", () => {
    const cases: [string, boolean, string][] = [
      ["", true, "#wide"],
      ["#live", true, "#live,wide"],
      ["#live,wide", false, "#live"],
      ["#wide", false, ""],
      ["#wide,foo", false, "#foo"],
      ["#wide", true, "#wide"], // 已开再开：不改写
    ];
    const results = cases.map(([fragment, on]) => {
      const source = `前文\n\n![山](${SRC}${fragment} "图注")\n\n后文`;
      return apply(source, at(source), on) ?? source;
    });
    expect(results).toEqual(cases.map(([, , expected]) => `前文\n\n![山](${SRC}${expected} "图注")\n\n后文`));
  });

  it("不传 on 时按源码当前状态取反；连续改写时过期的 end 不影响定位", () => {
    const source = `![山](${SRC})`;
    const location = at(source);
    const once = apply(source, location, true)!;
    const edit = toggleMark(once, location, "wide"); // location.end 仍是改写前的
    expect(edit && once.slice(0, edit.from) + edit.insert + once.slice(edit.to)).toBe(source);
  });

  it("同一 URL 出现两次只改被定位的那一张；尖括号地址也能改", () => {
    const source = `![a](${SRC})\n\n![b](${SRC})`;
    const angled = `![c](<${SRC}#live>)`;
    expect([apply(source, at(source, 1), true), apply(angled, at(angled), true)]).toEqual([
      `![a](${SRC})\n\n![b](${SRC}#wide)`,
      `![c](<${SRC}#live,wide>)`,
    ]);
  });
});

// UT-135：组图形态
describe("setGalleryMode", () => {
  const IMG2 = "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg";
  const members = (source: string, srcs: string[]) => srcs.map((src, i) => at(source, i, src));
  const run = (source: string, srcs: string[], mode: "grid" | "accordion" | "split") => {
    const edit = setGalleryMode(source, members(source, srcs), mode);
    return edit && source.slice(0, edit.from) + edit.insert + source.slice(edit.to);
  };

  it("accordion 首张加 #accordion（与已有标记合并）、grid 去掉；split 图片之间换成空行，图注含括号也不受影响；其他文本不变", () => {
    const source = `前文\n\n![a](${SRC}#live "图注 (一)")\n![b](${IMG2})  ![c](${SRC})\n\n后文`;
    const srcs = [SRC, IMG2, SRC];
    const accordion = run(source, srcs, "accordion")!;
    expect({
      accordion,
      grid: run(accordion, srcs, "grid"),
      split: run(source, srcs, "split"),
    }).toEqual({
      accordion: `前文\n\n![a](${SRC}#live,accordion "图注 (一)")\n![b](${IMG2})  ![c](${SRC})\n\n后文`,
      grid: source,
      split: `前文\n\n![a](${SRC}#live "图注 (一)")\n\n![b](${IMG2})\n\n![c](${SRC})\n\n后文`,
    });
  });

  it("组内任一张定位不上、或图片之间混入文字时返回 null", () => {
    const source = `![a](${SRC})\n![b](${IMG2})`;
    const stale = members(source, [SRC, IMG2]);
    expect([
      setGalleryMode(`![a](${SRC})\n文字![b](${IMG2})`, stale, "split"),
      setGalleryMode(source, [stale[0], { ...stale[1], src: SRC }], "split"),
    ]).toEqual([null, null]);
  });
});

// UT-136：定位校验——range 内不是图片、或地址与渲染时不一致，返回 null
describe("定位校验", () => {
  it("源码被删改后返回 null", () => {
    const source = `![山](${SRC})`;
    const stale = at(source);
    expect([
      toggleMark("新内容", stale, "wide", true),
      toggleMark(`![山](/img/other.jpg)`, stale, "wide", true),
      toggleMark(`前面插入了文字 ${source}`, stale, "wide", true),
      toggleMark(source, { ...stale, src: "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg" }, "wide", true),
    ]).toEqual([null, null, null, null]);
  });
});
