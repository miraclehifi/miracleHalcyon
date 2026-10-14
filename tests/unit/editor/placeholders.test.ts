import { describe, expect, it } from "vitest";
import {
  applyEdit,
  countPlaceholders,
  insertPlaceholders,
  PLACEHOLDER_UPLOADING,
  placeholdersBefore,
  removePlaceholder,
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
