import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEdit, applyFormat, type Edit, type FormatCommand } from "../../../src/lib/editor/format-commands";
import { matchShortcut, type ShortcutEvent } from "../../../src/lib/editor/shortcuts";

// 测试数据写法（同 TC-US10-01/02）：‸ 光标，⟦ ⟧ 选区
function parse(marked: string): { text: string; sel: [number, number] } {
  const caret = marked.indexOf("‸");
  if (caret >= 0) return { text: marked.replace("‸", ""), sel: [caret, caret] };
  const start = marked.indexOf("⟦");
  const end = marked.indexOf("⟧") - 1;
  return { text: marked.replace("⟦", "").replace("⟧", ""), sel: [start, end] };
}

function render(text: string, edit: Edit): string {
  const next = text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  const [start, end] = edit.select ?? [edit.from + edit.insert.length, edit.from + edit.insert.length];
  if (start === end) return next.slice(0, start) + "‸" + next.slice(start);
  return next.slice(0, start) + "⟦" + next.slice(start, end) + "⟧" + next.slice(end);
}

function run(command: FormatCommand, input: string): string {
  const { text, sel } = parse(input);
  return render(text, applyFormat(text, sel, command));
}

// [SC-TOOLBAR-01][SC-TOOLBAR-02] TC-US10-01 / UT-117：行内命令
describe("applyFormat 行内命令", () => {
  it.each<[FormatCommand, string, string]>([
    ["bold", "写作是⟦思考⟧", "写作是**⟦思考⟧**"],
    ["bold", "写作是**⟦思考⟧**", "写作是⟦思考⟧"],
    ["bold", "写作是‸", "写作是**‸**"],
    ["italic", "⟦思考⟧", "*⟦思考⟧*"],
    ["italic", "*⟦思考⟧*", "⟦思考⟧"],
    ["code", "⟦npm i⟧", "`⟦npm i⟧`"],
    ["link", "⟦思考⟧", "[思考](⟦url⟧)"],
    ["link", "‸", "[‸](url)"],
  ])("%s：%s → %s", (command, input, output) => {
    expect(run(command, input)).toBe(output);
  });

  it("斜体不会把加粗当成斜体去掉", () => {
    expect(run("italic", "**⟦思考⟧**")).toBe("***⟦思考⟧***");
  });
});

// [SC-TOOLBAR-03] TC-US10-02 / UT-118：行级命令作用于选区覆盖的每一行，选区覆盖改写后的这些行
describe("applyFormat 行级命令", () => {
  it.each<[FormatCommand, string, string]>([
    ["heading2", "标‸题", "⟦## 标题⟧"],
    ["heading2", "⟦## 标题⟧", "⟦标题⟧"],
    ["list", "苹⟦果\n香⟧蕉", "⟦- 苹果\n- 香蕉⟧"],
    ["list", "⟦- 苹果\n- 香蕉⟧", "⟦苹果\n香蕉⟧"],
    ["list", "⟦苹果\n- 香蕉⟧", "⟦- 苹果\n- 香蕉⟧"],
    ["task", "⟦买菜⟧", "⟦- [ ] 买菜⟧"],
    ["task", "⟦- [ ] 买菜⟧", "⟦买菜⟧"],
    ["list", "⟦- [ ] 买菜⟧", "⟦- 买菜⟧"],
    ["quote", "⟦- 苹果⟧", "⟦> 苹果⟧"],
  ])("%s：%j → %j", (command, input, output) => {
    expect(run(command, input)).toBe(output);
  });

  it("只改选区覆盖的行，前后行不变", () => {
    expect(run("quote", "第一行\n第⟦二⟧行\n第三行")).toBe("第一行\n⟦> 第二行⟧\n第三行");
  });
});

// [SC-TOOLBAR-04][SC-TOOLBAR-05] UT-119：快捷键映射
describe("matchShortcut", () => {
  const event = (init: Partial<ShortcutEvent>): ShortcutEvent => ({
    key: "",
    code: "",
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    isComposing: false,
    ...init,
  });

  it("Mac 用 ⌘，其他平台用 Ctrl", () => {
    expect({
      macMeta: matchShortcut(event({ key: "b", code: "KeyB", metaKey: true }), true),
      macCtrl: matchShortcut(event({ key: "b", code: "KeyB", ctrlKey: true }), true),
      winCtrl: matchShortcut(event({ key: "b", code: "KeyB", ctrlKey: true }), false),
      winMeta: matchShortcut(event({ key: "b", code: "KeyB", metaKey: true }), false),
    }).toEqual({ macMeta: "bold", macCtrl: null, winCtrl: "bold", winMeta: null });
  });

  it("六个快捷键；带 Shift 的按 code 判断", () => {
    const ctrl = (init: Partial<ShortcutEvent>) => matchShortcut(event({ ctrlKey: true, ...init }), false);
    expect([
      ctrl({ key: "i", code: "KeyI" }),
      ctrl({ key: "k", code: "KeyK" }),
      ctrl({ key: "e", code: "KeyE" }),
      ctrl({ key: "*", code: "Digit8", shiftKey: true }),
      ctrl({ key: ">", code: "Period", shiftKey: true }),
      ctrl({ key: "B", code: "KeyB", shiftKey: true }),
      ctrl({ key: "b", code: "KeyB", altKey: true }),
      ctrl({ key: "s", code: "KeyS" }),
    ]).toEqual(["italic", "link", "code", "list", "quote", null, null, null]);
  });

  it("输入法组字期间不触发", () => {
    expect(matchShortcut(event({ key: "b", code: "KeyB", ctrlKey: true, isComposing: true }), false)).toBeNull();
  });
});

// [SC-TOOLBAR-06] ED-UT-01：execCommand 不可用时退回 setRangeText，派发一次 input
describe("applyEdit", () => {
  afterEach(() => vi.restoreAllMocks());

  it("execCommand 返回 false 时用 setRangeText 写入并设置选区", () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.value = "写作是思考";
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    const inputs = vi.fn();
    textarea.addEventListener("input", inputs);

    applyEdit(textarea, { from: 3, to: 5, insert: "**思考**", select: [5, 7] });

    expect({
      called: execCommand.mock.calls.length,
      value: textarea.value,
      selection: [textarea.selectionStart, textarea.selectionEnd],
      inputs: inputs.mock.calls.length,
    }).toEqual({ called: 1, value: "写作是**思考**", selection: [5, 7], inputs: 1 });
    textarea.remove();
  });
});
