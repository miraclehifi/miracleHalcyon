// TagInput（admin-post-editor.md"设置抽屉"）：回车加入标签块，块上 × 删除；输入时下拉显示已有标签（combobox + listbox）
// 规则与服务端一致：去首尾空白、不区分大小写去重、最多 10 个、每个不超过 32 字、不含逗号（输入逗号视为确认）
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FIELD_CONTROL_CLASS } from "../../ui/Field";
import { TagChip } from "../../ui/TagChip";

export interface TagInputProps {
  tags: string[];
  onChange(tags: string[]): void;
}

const TAGS_MAX = 10;
const TAG_MAX_LENGTH = 32;
const SUGGEST_DEBOUNCE_MS = 200;

const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

async function fetchSuggestions(q: string): Promise<string[]> {
  const response = await fetch(`/api/admin/tags?q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const data = (await response.json()) as { tags?: { name: string }[] };
  return Array.isArray(data.tags) ? data.tags.map((tag) => tag.name) : [];
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);
  const full = tags.length >= TAGS_MAX;
  const options = suggestions.filter((name) => !tags.some((tag) => sameTag(tag, name)));
  const expanded = open && options.length > 0;

  // 停止输入 200ms 后请求补全；只采用最新一次请求的结果
  useEffect(() => {
    const q = text.trim();
    if (!q) return;
    const seq = ++latest.current;
    const timer = window.setTimeout(async () => {
      const names = await fetchSuggestions(q).catch(() => []);
      if (seq !== latest.current) return;
      setSuggestions(names);
      setActive(-1);
      setOpen(true);
    }, SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, TAG_MAX_LENGTH);
    if (tag && !full && !tags.some((existing) => sameTag(existing, tag))) onChange([...tags, tag]);
    setText("");
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(expanded && active >= 0 ? options[active] : text);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!expanded) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && text === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-input`} className="text-meta font-medium text-ink-muted">
        标签
      </label>
      <div className="relative">
        <div className={`${FIELD_CONTROL_CLASS} flex flex-wrap items-center gap-1.5 px-2 py-[7px] md:py-[7px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus`}>
          <ul role="list" aria-label="已添加的标签" className="contents">
            {tags.map((tag) => (
              <li key={tag.toLowerCase()} className="max-w-full">
                <TagChip label={tag} onRemove={() => onChange(tags.filter((existing) => existing !== tag))} />
              </li>
            ))}
          </ul>
          <input
            id={`${id}-input`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={`${id}-listbox`}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            aria-describedby={full ? `${id}-note` : undefined}
            value={text}
            disabled={full}
            maxLength={TAG_MAX_LENGTH}
            placeholder={full ? "" : "输入后回车"}
            onChange={(event) => {
              setText(event.target.value);
              if (!event.target.value.trim()) setOpen(false);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
            className="min-w-24 flex-1 bg-transparent px-1 text-base leading-5 text-ink outline-none placeholder:text-ink-faint md:text-meta"
          />
        </div>
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label="已有标签"
          hidden={!expanded}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-control border border-line bg-surface py-1 shadow-lg"
        >
          {options.map((name, index) => (
            <li
              key={name}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()} // 不让输入框失焦
              onClick={() => add(name)}
              className={`cursor-pointer px-3 py-1.5 font-mono text-meta text-ink ${index === active ? "bg-surface-sunken" : "hover:bg-surface-sunken"}`}
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
      {full && (
        <p id={`${id}-note`} className="text-caption text-ink-faint">
          最多 {TAGS_MAX} 个标签
        </p>
      )}
    </div>
  );
}
