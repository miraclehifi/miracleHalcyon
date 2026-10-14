// MarkdownEditor（components.md，admin-post-editor.md"编辑区"，ADR-004 textarea 编辑器）：标题 + 源码区 + 底栏
// 标题是无边框大号输入（自动增高、不含换行），回车把光标移到正文；工具栏按钮与快捷键改写源码（US-10，可撤销）
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { applyEdit, applyFormat, type FormatCommand } from "../../../lib/editor/format-commands";
import { isMacPlatform, matchShortcut } from "../../../lib/editor/shortcuts";
import { EditorToolbar } from "./EditorToolbar";

export interface MarkdownEditorProps {
  title: string;
  body: string;
  titleInvalid?: boolean; // 发布时缺少该项
  bodyInvalid?: boolean;
  onTitleChange(title: string): void;
  onBodyChange(body: string): void;
}

const countFormat = new Intl.NumberFormat("en-US");

// 底栏字数：不计空白的字符数（按码位，emoji 记 1）
export function countChars(text: string): number {
  let count = 0;
  for (const char of text) if (!/\s/.test(char)) count++;
  return count;
}

export function MarkdownEditor({ title, body, titleInvalid, bodyInvalid, onTitleChange, onBodyChange }: MarkdownEditorProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // 标题随内容增高（长标题换行显示，与设计稿一致）
  useLayoutEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [title]);

  const onTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return; // 输入法组字时的回车是确认候选词
    event.preventDefault();
    bodyRef.current?.focus();
  };

  const runCommand = (command: FormatCommand) => {
    const element = bodyRef.current;
    if (!element) return;
    applyEdit(element, applyFormat(element.value, [element.selectionStart, element.selectionEnd], command));
  };

  // 快捷键只在源码区生效（标题框不响应）
  const onBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const command = matchShortcut(event.nativeEvent, isMacPlatform());
    if (!command) return;
    event.preventDefault();
    runCommand(command);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[18px]">
      <textarea
        ref={titleRef}
        id="post-title"
        aria-label="标题"
        aria-invalid={titleInvalid || undefined}
        placeholder="无标题"
        rows={1}
        value={title}
        onChange={(event) => onTitleChange(event.target.value.replace(/[\r\n]+/g, ""))}
        onKeyDown={onTitleKeyDown}
        className="w-full resize-none overflow-hidden bg-transparent text-display font-semibold text-ink outline-none placeholder:text-ink-faint max-md:text-[26px]"
      />
      <EditorToolbar onCommand={runCommand} />
      <textarea
        ref={bodyRef}
        id="post-body"
        aria-label="正文"
        aria-invalid={bodyInvalid || undefined}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={onBodyKeyDown}
        spellCheck={false}
        className="min-h-0 w-full flex-1 resize-none bg-transparent font-mono text-ui leading-[1.5] text-ink outline-none max-md:text-base"
      />
      <footer className="flex items-center justify-between border-t border-line py-2.5 text-caption text-ink-faint max-md:hidden">
        <span>Markdown (GFM)</span>
        <span className="tabular-nums">{countFormat.format(countChars(body))} 字</span>
      </footer>
    </div>
  );
}
