// MarkdownEditor（components.md，admin-post-editor.md"编辑区"，ADR-004 textarea 编辑器）：标题 + 源码区 + 底栏
// 标题是无边框大号输入（自动增高、不含换行），回车把光标移到正文；工具栏按钮与快捷键改写源码（US-10，可撤销）
import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { applyEdit, applyFormat, type FormatCommand } from "../../../lib/editor/format-commands";
import { isMacPlatform, matchShortcut } from "../../../lib/editor/shortcuts";
import { offsetFromPoint } from "../../../lib/editor/textarea-mirror";
import { useImageUploads } from "../../../lib/upload/use-image-uploads";
import { Popover } from "../../ui/Popover";
import { useToast } from "../../ui/Toast";
import { EditorToolbar } from "./EditorToolbar";
import { ImageSyntaxHelp } from "./ImageSyntaxHelp";

export interface MarkdownEditorProps {
  title: string;
  body: string;
  titleInvalid?: boolean; // 发布时缺少该项
  bodyInvalid?: boolean;
  onTitleChange(title: string): void;
  onBodyChange(body: string): void;
  onUploadsChange?: (names: string[]) => void; // 进行中上传的文件名（预览占位块用）
}

const countFormat = new Intl.NumberFormat("en-US");
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif"; // heic / 实况视频在 Sprint 3（US-11）放开

// 底栏"图片写法"：文字按钮打开 Popover（底栏上方、与底栏文字左对齐，admin.pen 03b）；关闭后焦点回到按钮
function SyntaxHelpEntry() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onPointerDown={(event) => event.stopPropagation()} // 不让 Popover 的"点外部关闭"先关掉，再被这次点击重新打开
        className="cursor-pointer text-ink-muted underline-offset-2 hover:text-ink hover:underline"
      >
        图片写法
      </button>
      <Popover open={open} onClose={close} title="图片写法">
        <ImageSyntaxHelp />
      </Popover>
    </>
  );
}

// 底栏字数：不计空白的字符数（按码位，emoji 记 1）
export function countChars(text: string): number {
  let count = 0;
  for (const char of text) if (!/\s/.test(char)) count++;
  return count;
}

export function MarkdownEditor({ title, body, titleInvalid, bodyInvalid, onTitleChange, onBodyChange, onUploadsChange }: MarkdownEditorProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const showUploadError = useCallback((message: string) => toast.show({ tone: "error", message }), [toast]);
  const { uploadFiles } = useImageUploads(bodyRef, { onTasksChange: onUploadsChange, onError: showUploadError });
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0); // dragenter / dragleave 在子元素间成对出现，计数归零才算离开

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

  // 粘贴图片（US-05）：剪贴板里有文件时按图片上传（不支持的类型给出提示），否则照常粘贴文字
  const onBodyPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...(event.clipboardData?.files ?? [])];
    if (files.length === 0) return;
    event.preventDefault();
    uploadFiles(files);
  };

  // 拖入图片（US-05）：只响应带文件的拖动；放到源码区按落点换算插入位置，放在标题等其他位置插在光标处
  const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes("Files");
  const onDragEnter = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    dragDepth.current++;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = [...(event.dataTransfer?.files ?? [])];
    const body = bodyRef.current;
    if (!body || files.length === 0) return;
    const at = event.target === body ? offsetFromPoint(body, event.clientX, event.clientY) : undefined;
    uploadFiles(files, at);
  };

  // "插入图片"：选择文件后插在光标处
  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = ""; // 允许再次选择同一文件
    uploadFiles(files);
    bodyRef.current?.focus();
  };

  // 快捷键只在源码区生效（标题框不响应）
  const onBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const command = matchShortcut(event.nativeEvent, isMacPlatform());
    if (!command) return;
    event.preventDefault();
    runCommand(command);
  };

  return (
    <div
      data-drop-zone
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative flex min-h-0 flex-1 flex-col gap-[18px]"
    >
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
      <EditorToolbar onCommand={runCommand} onInsertImage={() => fileInputRef.current?.click()} />
      <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={onPickFiles} />
      <textarea
        ref={bodyRef}
        id="post-body"
        aria-label="正文"
        aria-invalid={bodyInvalid || undefined}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={onBodyKeyDown}
        onPaste={onBodyPaste}
        spellCheck={false}
        className="min-h-0 w-full flex-1 resize-none bg-transparent font-mono text-ui leading-[1.5] text-ink outline-none max-md:text-base"
      />
      <footer className="flex items-center justify-between border-t border-line py-2.5 text-caption text-ink-faint max-md:hidden">
        <span className="relative flex items-center gap-1.5">
          Markdown (GFM) · 支持粘贴/拖入图片 ·
          <SyntaxHelpEntry />
        </span>
        <span className="tabular-nums">{countFormat.format(countChars(body))} 字</span>
      </footer>
      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-control border-2 border-dashed border-accent bg-bg/80 text-ui text-ink">
          松开以上传图片
        </div>
      )}
    </div>
  );
}
