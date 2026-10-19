import { describe, expect, it } from "vitest";
import {
  applyEdit,
  countPlaceholders,
  insertPlaceholders,
  markFailed,
  markProcessing,
  PLACEHOLDER_FAILED,
  PLACEHOLDER_UPLOADING,
  placeholderEdit,
  placeholdersBefore,
  removePlaceholder,
  removePlaceholderLine,
  replacePlaceholder,
  type Edit,
} from "../../../src/lib/editor/format-commands";
import { altFromFileName, imageMarkdown } from "../../../src/lib/upload/upload-client";

const apply = (text: string, edit: Edit | null) => (edit ? text.slice(0, edit.from) + edit.insert + text.slice(edit.to) : text);
const P = PLACEHOLDER_UPLOADING;

// [SC-IMAGE-01] UT-87：光标处插入占位，返回插入后的光标；多张时每张一行
describe("insertPlaceholders", () => {
  it("单张插在光标处，光标落在占位之后；三张各占一行", () => {
    const one = insertPlaceholders(4, 1);
    const three = insertPlaceholders(1, 3);
    expect({ one: [apply("第一段\n", one), one.select], three: apply("ab", three) }).toEqual({
      one: [`第一段\n${P}`, [4 + P.length, 4 + P.length]],
      three: `a${P}\n${P}\n${P}b`,
    });
  });

  it("统计占位数与某位置之前的占位数（任务按出现顺序对应占位）", () => {
    const text = `x${P}y![处理中…]()z${P}`;
    expect([countPlaceholders(text), placeholdersBefore(text, 0), placeholdersBefore(text, text.indexOf("y")), placeholdersBefore(text, text.length)]).toEqual([3, 0, 1, 3]);
  });
});

// [SC-IMAGE-01][SC-IMAGE-09] UT-88 / ED-UT-03：按出现顺序定位，占位前插入了新文字仍替换正确位置
describe("replacePlaceholder", () => {
  it("3 个占位，第 1 个前插入 1000 字后第 2 个先完成：只替换第 2 个", () => {
    const original = `${P}\n${P}\n${P}`;
    const typed = "字".repeat(1000) + original;
    const md = "![b](/img/2026/10/aaaaaaaaaa_1x1_808080.png)";
    expect(apply(typed, replacePlaceholder(typed, 1, md))).toBe(`${"字".repeat(1000)}${P}\n${md}\n${P}`);
  });

  it("占位已被作者删掉（序号越界）→ null，不改写", () => {
    expect(replacePlaceholder(`a${P}`, 1, "![x](/x.png)")).toBeNull();
  });
});

// [SC-IMAGE-07] UT-89：只移除该占位，其他内容（含其他占位）不变
describe("removePlaceholder", () => {
  it("移除第 2 个占位", () => {
    const text = `开头\n${P}\n${P}\n结尾`;
    expect(apply(text, removePlaceholder(text, 1))).toBe(`开头\n${P}\n\n结尾`);
  });
});

// [SC-IMAGE-07][SC-IMAGE-11] UT-89（2026-10-16）："上传失败"占位参与按顺序定位；失败改写与整行移除
describe("失败占位", () => {
  it("上传失败也算占位；markFailed 改写；removePlaceholderLine 独占一行时连同换行一起删", () => {
    const F = PLACEHOLDER_FAILED;
    const text = `段落A\n${P}\n${F}\n段落B`;
    expect({
      count: countPlaceholders(text),
      failed: apply(text, markFailed(text, 0)),
      retry: apply(text, markProcessing(text, 1)),
      middle: apply(text, removePlaceholderLine(text, 1)),
      last: apply(`段落A\n${F}`, removePlaceholderLine(`段落A\n${F}`, 0)),
      only: apply(F, removePlaceholderLine(F, 0)),
      inline: apply(`前文 ${F} 后文`, removePlaceholderLine(`前文 ${F} 后文`, 0)),
    }).toEqual({
      count: 2,
      failed: `段落A\n${F}\n${F}\n段落B`,
      retry: `段落A\n${P}\n![处理中…]()\n段落B`,
      middle: `段落A\n${P}\n段落B`,
      last: "段落A",
      only: "",
      inline: "前文  后文",
    });
  });
});

// [SC-IMAGE-01][SC-IMAGE-02] UT-91：文件名 → alt
describe("altFromFileName / imageMarkdown", () => {
  it("去扩展名；剪贴板无名图片为 image；[ ] 转义", () => {
    expect([altFromFileName("photo.jpg"), altFromFileName(""), altFromFileName("image.png"), altFromFileName("a[1].v2.png"), imageMarkdown("x", "/img/a.png")]).toEqual([
      "photo",
      "image",
      "image",
      "a\\[1\\].v2",
      "![x](/img/a.png)",
    ]);
  });
});

// [SC-IMAGE-09] 后台写入（上传完成替换占位）不打乱作者的光标：编辑点之后的选区按长度差平移；源码区不在焦点时不抢焦点
describe("applyEdit 保留作者选区", () => {
  it("焦点在源码区：选区在编辑点之后时随之平移；不在焦点时不抢焦点", () => {
    const body = document.createElement("textarea");
    const other = document.createElement("input");
    document.body.appendChild(body);
    document.body.appendChild(other);
    body.value = `开头\n${P}\n结尾`;
    body.focus();
    body.setSelectionRange(body.value.length, body.value.length); // 作者在末尾输入
    applyEdit(body, { from: 3, to: 3 + P.length, insert: "![image](/img/x.png)" }, { preserveSelection: true });
    const caret = [body.selectionStart, body.value.length];

    other.focus();
    body.value = `${P}`;
    applyEdit(body, { from: 0, to: P.length, insert: "" }, { preserveSelection: true });

    expect({ caret, value: body.value, focus: document.activeElement === other }).toEqual({
      caret: ["开头\n![image](/img/x.png)\n结尾".length, "开头\n![image](/img/x.png)\n结尾".length],
      value: "",
      focus: true,
    });
    body.remove();
    other.remove();
  });
});

// [SC-IMAGE-09][SC-IMAGE-19] ED-UT-03（扩展，2026-10-16）：占位槽位——一次编辑删掉了哪些占位（旧序号）、新出现了哪些（新序号）
describe("placeholderEdit", () => {
  const F = PLACEHOLDER_FAILED;
  it("占位数不变 → 无变化；纯删除按光标定位（相邻相同占位也分得清）", () => {
    const prev = `${P}\n${P}\n${P}`;
    expect([
      placeholderEdit("a", "ab", 2),
      placeholderEdit(prev, `${P}\n${P}`, P.length), // 删掉第 2 个占位连同它前面的换行：光标停在第 1 个之后
      placeholderEdit(prev, `${P}\n${P}\n`, 2 * P.length + 2),
    ]).toEqual([
      { removed: [], inserted: [] },
      { removed: [1], inserted: [] },
      { removed: [2], inserted: [] },
    ]);
  });

  it("撤销 / 粘贴带回占位：按插入区间识别为新占位", () => {
    const prev = `开头\n${P}\n结尾`;
    const pasted = `开头\n${F}\n${P}\n结尾`;
    expect([placeholderEdit(prev, pasted, 3 + F.length + 1), placeholderEdit(prev, pasted, 0)]).toEqual([
      { removed: [], inserted: [0] }, // 纯插入：按光标定位
      { removed: [], inserted: [0] }, // 光标不对时退回公共前后缀
    ]);
  });

  it("替换：删一个、出现一个；改坏占位文本算删除", () => {
    const prev = `${P}\nx\n${P}`;
    expect([placeholderEdit(prev, `${P}\n${F}\n${P}`, 0), placeholderEdit(prev, `![上传中…](\nx\n${P}`, 0)]).toEqual([
      { removed: [], inserted: [1] },
      { removed: [0], inserted: [] },
    ]);
  });
});
