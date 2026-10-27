// MediaEntryForm（admin-media.md §二，US-01）：书影音录入 / 编辑表单。桌面收在卡片里（头部 → 识别 → 条目信息 → 我的记录 → 操作），
// 手机去掉卡片、底部固定操作栏。前端只拦标题空白与年份位数（不发请求、聚焦第一个出错字段）；保存为 multipart（字段 + 封面）。
// 成功后整页回列表并带跨页提示；有未保存改动时离开要确认（beforeunload / "取消" / "← 书影音" / 识别重复时"去编辑"）。
// 识别（任务 6）：只填条目字段，被填入的输入框高亮 1.5 秒；缺失的作者 / 年份标警告直到修改；识别封面以 data: 预览、保存时转为文件
// 游戏（ADR-013，设计稿 11g）：平台下拉 + IGDB 封面链接，不上传封面；两组值切换分类时保留，只提交当前分类适用的那组
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { creatorLabel, platformLabel, SHELF_PLATFORMS, SHELF_TYPES, statusLabel, TYPE_LABELS, type ShelfPlatform, type ShelfType } from "../../../domains/shelf/entry";
import { setFlash } from "../../../lib/admin/flash";
import { applyRecognized, dataUrlToFile, type FilledField, type MissingField, type RecognizedFields } from "../../../lib/admin/recognize";
import { createEntry, deleteEntry, ShelfApiError, updateEntry, type CoverChange, type ShelfEntryView } from "../../../lib/admin/shelf-client";
import { FORM_MESSAGES, formDefaults, localToday, toEntryFields, validateForm, type EntryForm, type FormErrors } from "../../../lib/admin/shelf-form";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { Field } from "../../ui/Field";
import { ICONS } from "../../ui/icons";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { StarRating } from "../../ui/StarRating";
import { ToastProvider, useToast } from "../../ui/Toast";
import { IgdbCoverField } from "./IgdbCoverField";
import { RecognizeBox } from "./RecognizeBox";
import { ShelfCoverField } from "./ShelfCoverField";

const COMMENT_MAX = 1000;
const MISSING_HINT = "未识别，请手动填写";

export interface MediaEntryFormProps {
  mode: "new" | "edit";
  initial?: EntryForm; // 编辑页：条目回填
  defaultType?: ShelfType; // 新增页：入口分类；标记日期默认今天（浏览器本地日期，所以页面用 client:only 挂载）
  entry?: ShelfEntryView; // 编辑页：条目 ID 与现有封面
  listHref: string; // 不含分类参数的列表地址
}

const listOf = (listHref: string, type: ShelfType) => `${listHref}?type=${type}`;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-meta font-semibold text-ink-muted">
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
    </h2>
  );
}

function FormContent({ mode, initial: given, defaultType = "book", entry, listHref }: MediaEntryFormProps) {
  const id = useId();
  const toast = useToast();
  const [initial] = useState(() => given ?? formDefaults(defaultType, localToday()));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [cover, setCover] = useState<CoverChange>(undefined);
  const [preview, setPreview] = useState<string | null>(entry?.cover ?? null);
  const [saving, setSaving] = useState(false);
  const [leave, setLeave] = useState<{ href: string; title: string; confirmLabel: string } | null>(null);
  const [highlight, setHighlight] = useState<ReadonlySet<FilledField>>(new Set());
  const [warn, setWarn] = useState<ReadonlySet<"creator" | "year">>(new Set());
  const [coverFromDouban, setCoverFromDouban] = useState(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [focusTick, setFocusTick] = useState(0); // 递增：渲染出错误态后聚焦第一个出错字段
  const leaving = useRef(false);

  const dirty = cover !== undefined || JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  const set = <K extends keyof EntryForm>(key: K, value: EntryForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === "creator" || key === "year") setWarn((w) => new Set([...w].filter((field) => field !== key)));
  };

  useEffect(() => () => void (highlightTimer.current && clearTimeout(highlightTimer.current)), []);

  // 识别结果合并：只覆盖条目字段，返回被填入的字段（RecognizeBox 据此写"已识别"）
  const applyResult = (fields: RecognizedFields, missing: MissingField[]): FilledField[] => {
    const { filled } = applyRecognized(form, fields);
    setForm((f) => applyRecognized(f, fields).form);
    if (fields.coverData) {
      const file = dataUrlToFile(fields.coverData);
      if (file) {
        setCover(file);
        setPreview(fields.coverData);
        setCoverFromDouban(true);
      }
    }
    setErrors({});
    setWarn(new Set(missing.filter((field): field is "creator" | "year" => field !== "cover")));
    setHighlight(new Set(filled));
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(new Set()), 1500);
    return filled;
  };

  const go = (href: string) => {
    leaving.current = true;
    window.location.assign(href);
  };
  const leaveTo = (href: string, title = "放弃未保存的改动？", confirmLabel = "放弃") => (dirty ? setLeave({ href, title, confirmLabel }) : go(href));

  const showErrors = (next: FormErrors) => {
    setErrors(next);
    setFocusTick((n) => n + 1);
  };

  // Field 给出错控件标 aria-invalid；按 DOM 顺序取第一个（封面错误聚焦文件输入）
  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-cover-invalid] input[type="file"]')?.focus();
  }, [focusTick]);

  const submit = async () => {
    if (saving) return;
    const invalid = validateForm(form);
    if (Object.keys(invalid).length > 0) {
      showErrors(invalid);
      return;
    }
    setSaving(true);
    try {
      const fields = toEntryFields(form);
      const coverChange = form.type === "game" ? undefined : cover; // 游戏不接受上传封面
      const saved = mode === "edit" && entry ? await updateEntry(entry.id, fields, coverChange) : await createEntry(fields, coverChange);
      setFlash({ tone: "success", message: "已保存，读者页将在重建后更新" });
      go(listOf(listHref, saved.type));
    } catch (error) {
      setSaving(false);
      if (error instanceof ShelfApiError && error.code === "COVER_LINK_UNREACHABLE") return showErrors({ coverUrl: FORM_MESSAGES.coverLinkUnreachable });
      if (error instanceof ShelfApiError && error.status === 400) {
        if (error.code === "COVER_TYPE_INVALID" || error.code === "COVER_TOO_LARGE") return showErrors({ cover: FORM_MESSAGES.cover });
        const fields = ((error.body as { error?: { fields?: string[] } } | null)?.error?.fields ?? []) as string[];
        if (fields.length > 0) {
          const next: FormErrors = {};
          for (const field of fields) {
            if (field === "title") next.title = FORM_MESSAGES.title;
            else if (field === "year") next.year = FORM_MESSAGES.year;
            else if (field === "coverUrl") next.coverUrl = FORM_MESSAGES.coverUrl;
            else if (field === "creator" || field === "markedOn" || field === "comment") next[field] = FORM_MESSAGES.invalid;
          }
          // 出错字段在表单上没有对应控件（如 doubanUrl、rating）时，用服务端说明提示，不能毫无反馈
          if (Object.keys(next).length > 0) return showErrors(next);
          const message = (error.body as { error?: { message?: string } } | null)?.error?.message;
          toast.show({ tone: "error", message: message ? `保存失败：${message}` : "保存失败，请检查填写内容" });
          return;
        }
      }
      if (error instanceof ShelfApiError && error.status === 409) {
        toast.show({ tone: "error", message: "这条已经录入过" });
        return;
      }
      toast.show({ tone: "error", message: "保存失败，请重试" });
    }
  };

  const removeEntry = async () => {
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      setFlash({ tone: "success", message: `已删除《${entry.title}》` });
      go(listOf(listHref, entry.type));
    } catch {
      setConfirmDelete(false);
      toast.show({ tone: "error", message: "删除失败，请重试" });
    }
  };

  const Library = ICONS.library;
  const ArrowLeft = ICONS["arrow-left"];
  const Link2 = ICONS["link-2"];
  const back = listOf(listHref, initial.type);

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pt-10 pb-20 max-md:px-4 max-md:pt-5 max-md:pb-28">
      <a
        href={back}
        onClick={(e) => {
          e.preventDefault();
          leaveTo(back);
        }}
        className="inline-flex w-fit items-center gap-1 text-meta text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        书影音
      </a>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-7 md:rounded-[20px] md:border md:border-line md:bg-bg md:p-8 md:shadow-[0_12px_40px_rgb(0_0_0/0.06)]"
      >
        <header className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-ink text-bg max-md:size-10 max-md:rounded-xl">
            <Library size={24} className="max-md:size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] leading-tight font-semibold text-ink max-md:text-title-sm">{mode === "edit" ? "编辑条目" : "新增条目"}</h1>
            <p className="text-meta text-ink-muted">
              <span className="max-md:hidden">粘贴豆瓣链接可自动填好条目信息；状态、评分、日期、短评由你填写</span>
              <span className="md:hidden">粘贴豆瓣链接自动填好条目信息</span>
            </p>
          </div>
        </header>

        <RecognizeBox
          excludeId={entry?.id}
          onRecognized={applyResult}
          onDuplicate={(found) => leaveTo(`/admin/media/${found.id}`, "放弃当前填写的内容？", "放弃并前往")}
        />

        <section className="flex flex-col gap-5" aria-labelledby={`${id}-info`}>
          <span id={`${id}-info`} className="contents">
            <SectionTitle>条目信息</SectionTitle>
          </span>
          <div className="flex gap-6 max-md:flex-col max-md:gap-5">
            {form.type === "game" ? (
              <IgdbCoverField url={form.coverUrl} />
            ) : (
            <ShelfCoverField
              preview={preview}
              fromDouban={coverFromDouban}
              error={errors.cover}
              onSelect={(file) => {
                setCover(file);
                setCoverFromDouban(false);
                setPreview(URL.createObjectURL(file));
                setErrors((e) => ({ ...e, cover: undefined }));
              }}
              onReject={() => setErrors((e) => ({ ...e, cover: FORM_MESSAGES.cover }))}
              onRemove={() => {
                setCover(entry?.cover ? "remove" : undefined);
                setCoverFromDouban(false);
                setPreview(null);
              }}
            />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex gap-4 max-md:flex-col">
                <div className="w-[140px] shrink-0 max-md:w-full">
                  <Field label="分类" highlight={highlight.has("type")}>
                    <select value={form.type} onChange={(e) => set("type", e.target.value as ShelfType)}>
                      {SHELF_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="min-w-0 flex-1">
                  <Field label="标题" error={errors.title} highlight={highlight.has("title")}>
                    <input value={form.title} maxLength={200} aria-required="true" onChange={(e) => set("title", e.target.value)} />
                  </Field>
                </div>
              </div>
              <div className="flex gap-4 max-md:flex-col">
                <div className="min-w-0 flex-1">
                  <Field label={creatorLabel(form.type)} error={errors.creator} warning={warn.has("creator") ? MISSING_HINT : undefined} highlight={highlight.has("creator")}>
                    <input value={form.creator} maxLength={200} onChange={(e) => set("creator", e.target.value)} />
                  </Field>
                </div>
                {form.type === "game" && (
                  <div className="w-[140px] shrink-0 max-md:w-full">
                    <Field label="平台">
                      <select value={form.platform} aria-required="true" onChange={(e) => set("platform", e.target.value as ShelfPlatform)}>
                        {SHELF_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {platformLabel(platform)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
                <div className="w-[140px] shrink-0 max-md:w-full">
                  <Field label="年份" error={errors.year} warning={warn.has("year") ? MISSING_HINT : undefined} highlight={highlight.has("year")}>
                    <input value={form.year} inputMode="numeric" placeholder="如 2018" onChange={(e) => set("year", e.target.value)} />
                  </Field>
                </div>
              </div>
              {form.type === "game" && (
                <Field label="封面链接（IGDB）" hint="保存时换成 t_1080p 大图并读取宽高" error={errors.coverUrl}>
                  <input type="url" value={form.coverUrl} placeholder="粘贴 igdb.com 游戏页封面的图片地址" onChange={(e) => set("coverUrl", e.target.value)} />
                </Field>
              )}
              {form.doubanUrl && (
                <div className="flex flex-col gap-2">
                  <span className="text-meta font-medium text-ink">豆瓣链接</span>
                  <div className="flex items-center gap-2 rounded-control bg-surface-sunken px-3 py-2">
                    <Link2 size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-mono text-meta text-ink-muted">{form.doubanUrl}</span>
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer text-meta text-accent hover:underline"
                      onClick={() => setForm((f) => ({ ...f, doubanUrl: null, doubanId: null }))}
                    >
                      清除
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5" aria-labelledby={`${id}-record`}>
          <span id={`${id}-record`} className="contents">
            <SectionTitle>我的记录</SectionTitle>
          </span>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className="flex flex-col gap-2">
              <span id={`${id}-status`} className="text-meta font-medium text-ink">
                状态
              </span>
              <SegmentedControl
                aria-label="状态"
                value={form.status}
                onChange={(value) => set("status", value as EntryForm["status"])}
                className="flex w-full rounded-[10px] p-1 [&>button]:flex-1 max-md:[&>button]:h-10"
              >
                <SegmentedControl.Item value="completed">{statusLabel(form.type, "completed")}</SegmentedControl.Item>
                <SegmentedControl.Item value="in_progress">{statusLabel(form.type, "in_progress")}</SegmentedControl.Item>
              </SegmentedControl>
            </div>
            <Field label={form.status === "in_progress" ? "标记日期（开始日期）" : "标记日期"} error={errors.markedOn}>
              <input type="date" value={form.markedOn} onChange={(e) => set("markedOn", e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-meta font-medium text-ink" aria-hidden="true">
              我的评分
            </span>
            <StarRating value={form.rating} onChange={(value) => set("rating", value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Field label="短评" error={errors.comment}>
              <textarea value={form.comment} maxLength={COMMENT_MAX} rows={4} className="min-h-24 resize-y" onChange={(e) => set("comment", e.target.value)} />
            </Field>
            <span className="self-end font-mono text-caption text-ink-faint tabular-nums">
              {[...form.comment].length} / {COMMENT_MAX}
            </span>
          </div>
        </section>

        <footer className="flex items-center gap-3 pt-6 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:border-t max-md:border-line max-md:bg-bg max-md:px-4 max-md:py-3 md:relative md:before:absolute md:before:inset-x-0 md:before:top-0 md:before:h-px md:before:bg-gradient-to-r md:before:from-transparent md:before:via-line-strong md:before:to-transparent">
          {mode === "edit" && (
            <Button variant="ghost-danger" icon="trash-2" onClick={() => setConfirmDelete(true)}>
              删除
            </Button>
          )}
          <span className="flex-1 max-md:hidden" />
          <Button variant="outline" onClick={() => leaveTo(back)}>
            取消
          </Button>
          <Button type="submit" variant="primary" icon={saving ? "loader" : undefined} disabled={saving} aria-busy={saving || undefined} className="max-md:flex-1">
            保存
          </Button>
        </footer>
      </form>
      <ConfirmDialog
        open={leave !== null}
        tone="default"
        icon="circle-alert"
        title={leave?.title ?? ""}
        description="离开后，本次填写的内容不会保存。"
        confirmLabel={leave?.confirmLabel ?? "放弃"}
        cancelLabel="继续填写"
        onConfirm={() => {
          if (leave) go(leave.href);
        }}
        onCancel={() => setLeave(null)}
      />
      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        icon="trash-2"
        title={`删除「${entry?.title ?? ""}」？`}
        description="此操作不可撤销，封面一并删除。读者页将在重建后不再显示。"
        confirmLabel="删除"
        onConfirm={removeEntry}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}

export function MediaEntryForm(props: MediaEntryFormProps) {
  return (
    <ToastProvider>
      <FormContent {...props} />
    </ToastProvider>
  );
}
