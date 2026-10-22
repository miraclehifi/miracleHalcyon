// RecognizeBox（admin-media.md"RecognizeBox"，US-02）：粘贴豆瓣分享内容 → 点"识别" → 结果卡。
// 粘贴不触发识别；识别中按钮加载、表单照常可编辑；结果区 role=status（失败也用 status，不打断输入）。
// 合并到表单由调用方（MediaEntryForm）做：本组件只负责输入、请求与结果展示
import { useRef, useState } from "react";
import { statusLabel, TYPE_LABELS, type ShelfType } from "../../../domains/shelf/entry";
import { errorText, filledText, missingTexts, type DuplicateEntry, type FilledField, type MissingField, type RecognizedFields } from "../../../lib/admin/recognize";
import { recognize, ShelfApiError } from "../../../lib/admin/shelf-client";
import { FIELD_GLOW_CLASS, useFieldGlow } from "../../ui/Field";
import { IconButton } from "../../ui/IconButton";
import { ICONS, type IconName } from "../../ui/icons";
import { Button } from "../../ui/Button";

const SOURCES: { icon: IconName; label: string }[] = [
  { icon: "book-open", label: "书" },
  { icon: "book-image", label: "漫画" },
  { icon: "clapperboard", label: "电影" },
  { icon: "tv", label: "剧集" },
  { icon: "gamepad-2", label: "游戏" },
  { icon: "dices", label: "桌游" },
];

type Outcome =
  | { kind: "success"; fields: RecognizedFields; filled: FilledField[]; missing: MissingField[] }
  | { kind: "duplicate"; entry: DuplicateEntry }
  | { kind: "error"; message: string };

export interface RecognizeBoxProps {
  excludeId?: string;
  // 返回本次被填入的字段（用于"已识别"文案）
  onRecognized(fields: RecognizedFields, missing: MissingField[]): FilledField[];
  onDuplicate(entry: DuplicateEntry): void;
}

function Line({ icon, tone, children }: { icon: IconName; tone: string; children: React.ReactNode }) {
  const Icon = ICONS[icon];
  return (
    <p className="flex items-start gap-2 text-meta text-ink">
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function Preview({ title, meta, cover }: { title: string; meta: string; cover?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {cover ? (
        <img src={cover} alt="" className="h-12 w-8 shrink-0 rounded-[3px] object-cover" />
      ) : (
        <span aria-hidden="true" className="h-12 w-8 shrink-0 rounded-[3px] bg-surface-sunken" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-ui font-semibold text-ink">{title}</span>
        <span className="truncate text-caption text-ink-faint">{meta}</span>
      </div>
    </div>
  );
}

export function RecognizeBox({ excludeId, onRecognized, onDuplicate }: RecognizeBoxProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const glow = useFieldGlow();
  const blank = text.trim() === "";
  const ScanText = ICONS["scan-text"];

  const run = async () => {
    if (blank || loading) return;
    setLoading(true);
    try {
      const result = await recognize(text.trim(), excludeId);
      if ("duplicate" in result) setOutcome({ kind: "duplicate", entry: result.duplicate });
      else setOutcome({ kind: "success", fields: result.fields, missing: result.missing, filled: onRecognized(result.fields, result.missing) });
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof ShelfApiError && error.status === 422 ? errorText(error.code) : errorText("") });
    } finally {
      setLoading(false);
    }
  };

  const metaOf = (type: ShelfType, ...rest: (string | number | null)[]) => [TYPE_LABELS[type], ...rest].filter((v) => v !== null && v !== "").join(" · ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="recognize-text" className="text-meta font-semibold text-ink">
        豆瓣分享内容
      </label>
      <div className={`${FIELD_GLOW_CLASS} rounded-[14px]`} {...glow}>
        <div className="relative rounded-xl border border-input-border bg-bg shadow-[0_2px_3px_-1px_rgb(0_0_0/0.1),0_1px_0_rgb(0_0_0/0.02)] focus-within:ring-2 focus-within:ring-focus">
          <textarea
            ref={input}
            id="recognize-text"
            rows={2}
            value={text}
            placeholder="粘贴豆瓣分享链接或分享文字，自动识别条目信息"
            onChange={(e) => setText(e.target.value)}
            className="block w-full resize-none rounded-xl bg-transparent px-3.5 pt-3 pb-12 text-base leading-6 text-ink outline-none placeholder:text-ink-faint md:text-ui"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {text !== "" && (
              <IconButton
                icon="x"
                aria-label="清空"
                className="max-md:size-11"
                onClick={() => {
                  setText("");
                  input.current?.focus();
                }}
              />
            )}
            <Button
              variant="secondary"
              icon={loading ? "loader-circle" : undefined}
              disabled={blank || loading}
              aria-busy={loading || undefined}
              onClick={() => void run()}
              className={loading ? "[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none" : ""}
            >
              {!loading && <ScanText size={16} aria-hidden="true" className="-ml-0.5" />}
              {loading ? "识别中…" : "识别"}
            </Button>
          </div>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 max-md:hidden" aria-label="可识别的类型">
        {SOURCES.map(({ icon, label }) => {
          const Icon = ICONS[icon];
          return (
            <li key={label} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-caption text-ink-muted">
              <Icon size={13} className="text-ink-faint" aria-hidden="true" />
              {label}
            </li>
          );
        })}
      </ul>
      <div role="status" className="empty:hidden">
        {outcome && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3">
            {outcome.kind === "success" && (
              <>
                <Preview title={outcome.fields.title} meta={metaOf(outcome.fields.type, outcome.fields.creator, outcome.fields.year)} cover={outcome.fields.coverData} />
                <Line icon="circle-check" tone="text-ok">
                  {filledText(outcome.filled, outcome.fields.type)}
                </Line>
                {missingTexts(outcome.missing, outcome.fields.type).map((line) => (
                  <Line key={line} icon="circle-alert" tone="text-warn">
                    {line}
                  </Line>
                ))}
              </>
            )}
            {outcome.kind === "duplicate" && (
              <>
                <Preview title={outcome.entry.title} meta={metaOf(outcome.entry.type, "已录入")} />
                <Line icon="copy" tone="text-warn">
                  这条已经录入过：《{outcome.entry.title}》 · {statusLabel(outcome.entry.type, outcome.entry.status)} {outcome.entry.markedOn}
                </Line>
                <button type="button" className="w-fit cursor-pointer pl-6 text-meta text-accent hover:underline" onClick={() => onDuplicate(outcome.entry)}>
                  去编辑 →
                </button>
              </>
            )}
            {outcome.kind === "error" && (
              <Line icon="circle-x" tone="text-danger">
                {outcome.message}
              </Line>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
