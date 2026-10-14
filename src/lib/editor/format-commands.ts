// 源码写入（editor module-spec §1，ADR-004）：所有改写源码的操作都算出一个 Edit，再经 applyEdit 写入 textarea，
// 走 execCommand('insertText') 进入浏览器原生撤销栈；不支持时退回 setRangeText（失去原生撤销）

export interface Edit {
  from: number;
  to: number;
  insert: string;
  select?: [number, number]; // 写入后的选区；不给则光标放在插入内容之后
}

export type InlineCommand = "bold" | "italic" | "code" | "link";
export type LineCommand = "heading2" | "list" | "task" | "quote";
export type FormatCommand = InlineCommand | LineCommand;

const WRAP: Record<Exclude<InlineCommand, "link">, string> = { bold: "**", italic: "*", code: "`" };
const PREFIX: Record<LineCommand, string> = { heading2: "## ", list: "- ", task: "- [ ] ", quote: "> " };
// 行首已有的块级前缀（任务列表要排在列表前面，否则会被认成"- "）
const ANY_PREFIX = /^(## |- \[[ xX]\] |- |> )/;

export function applyFormat(text: string, [start, end]: [number, number], command: FormatCommand): Edit {
  if (command === "link") return link(text, start, end);
  if (command in WRAP) return wrap(text, start, end, WRAP[command as keyof typeof WRAP]);
  return prefixLines(text, start, end, PREFIX[command as LineCommand]);
}

// 选区两侧正好是这对标记时去掉，否则包上；斜体的 "*" 不能是加粗 "**" 的一半
function wrap(text: string, start: number, end: number, mark: string): Edit {
  const before = text.slice(start - mark.length, start);
  const after = text.slice(end, end + mark.length);
  const partOfLonger = text[start - mark.length - 1] === mark[0] || text[end + mark.length] === mark[0];
  const selected = text.slice(start, end);
  if (start >= mark.length && before === mark && after === mark && !partOfLonger) {
    return { from: start - mark.length, to: end + mark.length, insert: selected, select: [start - mark.length, end - mark.length] };
  }
  return { from: start, to: end, insert: mark + selected + mark, select: [start + mark.length, end + mark.length] };
}

// 有选中文字：[文字](url) 并选中 url；没有：[](url)，光标在方括号内
function link(text: string, start: number, end: number): Edit {
  const selected = text.slice(start, end);
  if (!selected) return { from: start, to: end, insert: "[](url)", select: [start + 1, start + 1] };
  const urlStart = start + selected.length + 3;
  return { from: start, to: end, insert: `[${selected}](url)`, select: [urlStart, urlStart + 3] };
}

// 每一行都已有该前缀时去掉；否则每行换成该前缀（先去掉其他块级前缀）
function prefixLines(text: string, start: number, end: number, prefix: string): Edit {
  const from = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end);
  const to = lineEnd === -1 ? text.length : lineEnd;
  const lines = text.slice(from, to).split("\n");
  const allHave = lines.every((line) => line.match(ANY_PREFIX)?.[0] === prefix);
  const next = lines.map((line) => (allHave ? line.slice(prefix.length) : prefix + line.replace(ANY_PREFIX, ""))).join("\n");
  return { from, to, insert: next, select: [from, from + next.length] };
}

export function applyEdit(textarea: HTMLTextAreaElement, edit: Edit): void {
  textarea.focus();
  textarea.setSelectionRange(edit.from, edit.to);
  const exec = typeof document.execCommand === "function" ? document.execCommand.bind(document) : null;
  const done = exec ? (edit.insert ? exec("insertText", false, edit.insert) : exec("delete")) : false;
  if (!done) {
    textarea.setRangeText(edit.insert, edit.from, edit.to, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const caret = edit.from + edit.insert.length;
  const [selStart, selEnd] = edit.select ?? [caret, caret];
  textarea.setSelectionRange(selStart, selEnd);
}
