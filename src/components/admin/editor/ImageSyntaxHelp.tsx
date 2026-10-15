// ImageSyntaxHelp（components.md `ImageSyntaxHelp`，admin-post-editor"图片写法说明"，admin.pen 03b）：图片写法示例，5 行，
// 每行左侧说明、右侧等宽示例 + 复制按钮（复制后图标变 ✓ 1.5 秒）。组图两行显示的是文字说明，复制的是可直接粘贴的示例。
// 桌面放在底栏"图片写法"的 Popover 里，手机在设置面板最下方展开
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../../ui/IconButton";
import { Tooltip } from "../../ui/Tooltip";

interface SyntaxRow {
  label: string;
  shown: string; // 显示的示例 / 说明
  copy: string; // 复制到剪贴板的内容
  note?: string;
}

export const SYNTAX_ROWS: readonly SyntaxRow[] = [
  { label: "宽图", shown: "![](url#wide)", copy: "![](url#wide)" },
  { label: "实况照片", shown: "![](url#live)", copy: "![](url#live)", note: "拖入安卓动态照片会自动生成" },
  { label: "图注", shown: '![](url "图注")', copy: '![](url "图注")' },
  { label: "组图网格", shown: "连续几行只放图片", copy: "![](url)\n![](url)\n![](url)" },
  { label: "手风琴", shown: "组图首张加 #accordion", copy: "![](url#accordion)\n![](url)\n![](url)" },
];

const COPIED_MS = 1500;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // 剪贴板不可用（权限、非安全上下文）：不显示已复制
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <Tooltip content={copied ? "已复制" : "复制"}>
      <IconButton icon={copied ? "check" : "copy"} aria-label={`复制${label}写法`} onClick={copy} className="max-md:size-11" />
    </Tooltip>
  );
}

export function ImageSyntaxHelp() {
  return (
    <ul className="flex flex-col gap-2.5" aria-label="写法示例">
      {SYNTAX_ROWS.map((row) => (
        <li key={row.label} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-caption text-ink-muted">{row.label}</span>
          <span className="min-w-0 flex-1">
            <code className="block font-mono text-[12px] break-all text-ink">{row.shown}</code>
            {row.note && <span className="mt-0.5 block text-caption text-ink-faint">{row.note}</span>}
          </span>
          <CopyButton text={row.copy} label={row.label} />
        </li>
      ))}
    </ul>
  );
}
