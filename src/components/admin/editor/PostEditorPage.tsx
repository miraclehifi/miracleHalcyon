// 写文章页（admin-post-editor.md，US-03 / US-06）：状态容器 + 布局。文章由页面 SSR 传入（新建为 null）
// 桌面三栏：编辑 | 预览 | 设置抽屉（340px）；< 1024px 抽屉浮在内容上方
// 视图：≥ 768px 顶栏分段控件 编辑 / 并排 / 预览，< 768px 顶栏下方 Tab（useEditorView）；隐藏的一栏只加 hidden，不卸载
// 任何字段变化都交给自动保存（停止输入 2 秒后保存；Ctrl / ⌘ + S 立即保存）；预览在 Web Worker 中渲染（MarkdownPreview）；
// 发布见 PublishActions：缺少必填项时标出字段并聚焦第一个；删除：暂停自动保存 → DELETE → 不弹离开确认，回到列表
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DraftInput } from "../../../domains/post/content";
import type { PostStatus } from "../../../domains/post/post";
import { slugify } from "../../../domains/post/slug";
import type { PostView } from "../../../domains/post/service";
import type { AutosaveState } from "../../../lib/autosave/controller";
import { clearLocalDraft, compareLocalStash, readLocalDraft, writeLocalDraft } from "../../../lib/autosave/local-draft";
import { logout } from "../../../lib/admin/logout";
import { useAutosave } from "../../../lib/autosave/useAutosave";
import { applyEdit, type Edit } from "../../../lib/editor/format-commands";
import { useScrollSync } from "../../../lib/editor/scroll-sync";
import { useEditorView, type NarrowTab, type ViewMode } from "../../../lib/editor/view-mode";
import { useHydrated } from "../../../lib/dom/hydration";
import { navigate } from "../../../lib/dom/navigate";
import { localDate } from "../../../lib/format/local-date";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { RestoreBanner } from "../../ui/RestoreBanner";
import { SaveIndicator, type SaveState } from "../../ui/SaveIndicator";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { badgeStatus } from "../../ui/StatusBadge";
import { Tabs } from "../../ui/Tabs";
import { ToastProvider } from "../../ui/Toast";
import { EditorTopBar } from "./EditorTopBar";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { PostSettingsDrawer } from "./PostSettingsDrawer";
import { DeletePostAction, PublishActions, UnpublishAction, type RequiredField } from "./PublishActions";
import { TagInput } from "./TagInput";

// 发布缺少必填项时聚焦的输入框
const FIELD_INPUT_IDS: Record<RequiredField, string> = { title: "post-title", slug: "post-slug", body: "post-body" };

export interface PostEditorPageProps {
  initial: PostView | null; // null：新建
}

export interface DraftState {
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  body: string;
  publishedAt: string | null; // null：新建未选择，按今天
}

interface ServerState {
  status: PostStatus;
  hasUnpublishedChanges: boolean;
}

function initialDraft(post: PostView | null): DraftState {
  if (!post) return { title: "", slug: "", tags: [], summary: "", body: "", publishedAt: null };
  const { title, slug, tags, summary, body, publishedAt } = post;
  return { title, slug, tags, summary, body, publishedAt };
}

// 自动保存状态 → 顶栏保存状态（idle：新建未保存过，不显示）。冲突 / 校验错误显示在字段上，这里只显示"未保存"
function saveIndicatorState({ status, error }: AutosaveState): SaveState | null {
  if (status === "idle") return null;
  if (status === "failed") return error?.kind === "network" || error?.kind === "server" ? "failed" : "unsaved";
  return status === "dirty" ? "unsaved" : status;
}

const EDITOR_PANE_ID = "editor-pane";
const PREVIEW_PANE_ID = "preview-pane";

const isSaveShortcut = (event: KeyboardEvent) => (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "s";

export function PostEditorPage({ initial }: PostEditorPageProps) {
  const [draft, setDraft] = useState(() => initialDraft(initial));
  const [server, setServer] = useState<ServerState>(() => ({
    status: initial?.status ?? "draft",
    hasUnpublishedChanges: initial?.hasUnpublishedChanges ?? false,
  }));
  // slug 跟随标题，直到作者手动改过（editor module-spec §4）；已有文章 slug ≠ slugify(标题) 即视为改过；不持久化
  const [slugTouched, setSlugTouched] = useState(() => initial !== null && initial.slug !== slugify(initial.title));
  // 抽屉默认：新建时打开（方便填信息），编辑已有文章时关闭；不跨文章记忆
  const [settingsOpen, setSettingsOpen] = useState(initial === null);
  const [uploadNames, setUploadNames] = useState<string[]>([]);
  const [slugError, setSlugError] = useState<string | undefined>(); // 服务端 409 SLUG_TAKEN，改 slug 后清除
  const [missing, setMissing] = useState<RequiredField[]>([]); // 发布时缺少的必填项，改了对应字段后清除
  const [focusRequest, setFocusRequest] = useState<{ field: RequiredField } | null>(null);
  // 文章 id：新建文章首次保存后才有。ref 供发布时（flush 之后）读取最新值，state 供渲染
  const postIdRef = useRef(initial?.id ?? null);
  const [postId, setPostId] = useState(initial?.id ?? null);
  const leavingRef = useRef(false); // 删除成功后跳转：不再拦截离开
  const hydrated = useHydrated();
  const view = useEditorView();
  // 并排时两栏同步滚动（editor module-spec §3）
  const previewRef = useRef<HTMLElement>(null);
  const getBody = useCallback(() => document.getElementById(FIELD_INPUT_IDS.body) as HTMLTextAreaElement | null, []);
  const getPreview = useCallback(() => previewRef.current, []);
  useScrollSync(getBody, getPreview, view.mode === "split");
  // 预览图片菜单改写源码：与工具栏同一套写入（applyEdit，可撤销），作者原来的选区按长度差平移保留
  const onSourceEdit = useCallback(
    (compute: (source: string) => Edit | null) => {
      const element = getBody();
      const edit = element && compute(element.value);
      if (!element || !edit) return false;
      const delta = edit.insert.length - (edit.to - edit.from);
      const shift = (pos: number) => (pos <= edit.from ? pos : pos >= edit.to ? pos + delta : edit.from + edit.insert.length);
      applyEdit(element, { ...edit, select: [shift(element.selectionStart), shift(element.selectionEnd)] });
      return true;
    },
    [getBody],
  );
  // 发布日期默认浏览器本地的今天；服务端不知道作者时区，水合前留空
  const publishedAt = draft.publishedAt ?? (hydrated ? localDate(new Date()) : "");
  // 保存、发布、撤回的响应都带最新状态：更新徽标与主按钮
  const syncServer = (post: PostView) => setServer({ status: post.status, hasUnpublishedChanges: post.hasUnpublishedChanges });

  const getContent = (): DraftInput => ({ ...draft, publishedAt: publishedAt || null });
  // 会话过期（保存或发布返回 401，UI 决定 #3）：先暂存当前内容，再跳登录页；登录后回到这里，由恢复横幅找回
  const onSessionExpired = () => {
    if (leavingRef.current) return;
    writeLocalDraft(postIdRef.current, getContent());
    leavingRef.current = true;
    navigate(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
  };

  const autosave = useAutosave({
    postId: initial?.id ?? null,
    getContent,
    onCreated: (id) => {
      postIdRef.current = id;
      setPostId(id);
      window.history.replaceState(null, "", `/admin/posts/${id}`); // 不刷新，光标与内容保留
    },
    onSaved: syncServer,
    onError: (error) => {
      if (error.kind === "unauthenticated") return onSessionExpired();
      if (error.code !== "SLUG_TAKEN") return;
      setSlugError(error.message ?? "slug 已存在，请换一个");
      setSettingsOpen(true); // 自动打开设置抽屉，让作者看到字段错误
    },
  });
  const { edit, flush, disable, enable, clearStash } = autosave;

  // 本地暂存恢复（editor module-spec §2"恢复判断"）：水合后读一次；比服务端新且内容不同 → 横幅，否则清掉过期暂存
  const stash = useMemo(() => (hydrated ? readLocalDraft(initial?.id ?? null) : null), [hydrated, initial]);
  const [restoreSettled, setRestoreSettled] = useState(false);
  // 服务端版本按编辑器的默认值比较：发布日期为空时编辑器显示并保存"今天"，暂存里也是今天
  const restoreDecision = useMemo(
    () =>
      compareLocalStash(
        stash,
        initial && { updatedAt: initial.updatedAt, content: { ...initialDraft(initial), publishedAt: initial.publishedAt ?? localDate(new Date()) } },
      ),
    [stash, initial],
  );
  useEffect(() => {
    if (restoreDecision === "discard") clearLocalDraft(initial?.id ?? null);
  }, [restoreDecision, initial]);
  const flushAfterRestore = useRef(false);
  useEffect(() => {
    if (!flushAfterRestore.current) return;
    flushAfterRestore.current = false;
    void flush(); // 恢复后立即保存（不等 2 秒），此时 getContent 已是恢复后的内容
  }, [draft, flush]);
  const restoreLocal = () => {
    if (!stash) return;
    const content = stash.content;
    setDraft({ title: content.title, slug: content.slug, tags: content.tags, summary: content.summary, body: content.body, publishedAt: content.publishedAt });
    setSlugTouched(content.slug !== slugify(content.title));
    setRestoreSettled(true);
    flushAfterRestore.current = true;
    edit();
  };
  const discardLocal = () => {
    clearLocalDraft(initial?.id ?? null);
    setRestoreSettled(true);
  };
  const unsaved = autosave.status === "dirty" || autosave.status === "saving" || autosave.status === "failed";

  // 有未保存修改时离开页面 → 浏览器原生离开确认
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!leavingRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) return;
      event.preventDefault(); // 不弹浏览器"另存为"
      void flush();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flush]);

  // 等抽屉渲染出 slug 输入框后再聚焦
  useEffect(() => {
    if (focusRequest) document.getElementById(FIELD_INPUT_IDS[focusRequest.field])?.focus();
  }, [focusRequest]);

  const update = (patch: Partial<DraftState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setMissing((fields) => fields.filter((field) => !(field in patch)));
    edit();
  };
  const onMissingFields = (fields: RequiredField[]) => {
    setMissing(fields);
    if (fields.includes("slug")) setSettingsOpen(true);
    setFocusRequest({ field: fields[0] });
  };
  const onSlugTaken = (message: string) => {
    setSlugError(message);
    setSettingsOpen(true);
  };
  // 登出（US-02）：有未保存修改先确认；确认后把当前内容写入本地暂存（下次打开由恢复横幅找回），放行离开拦截再登出
  const [confirmLogout, setConfirmLogout] = useState(false);
  const logoutNow = () => {
    if (unsaved) writeLocalDraft(postIdRef.current, getContent());
    leavingRef.current = true;
    return logout();
  };
  const onLogout = () => {
    if (unsaved) setConfirmLogout(true);
    else void logoutNow();
  };

  const onDeleted = () => {
    leavingRef.current = true;
    clearStash();
    navigate("/admin");
  };
  const onTitleChange = (title: string) => update(slugTouched ? { title } : { title, slug: slugify(title) });
  const onSlugChange = (slug: string) => {
    setSlugTouched(true);
    setSlugError(undefined);
    update({ slug });
  };

  const status = badgeStatus(server.status, server.hasUnpublishedChanges);
  const indicator = saveIndicatorState(autosave);

  return (
    <ToastProvider>
      {/* overflow-x-clip：顶栏右端按钮的高光画布向外伸出 24px，不能撑出横向滚动 */}
      <div className="flex h-dvh flex-col overflow-x-clip">
        <EditorTopBar
          status={status}
          saveIndicator={indicator && <SaveIndicator state={indicator} savedAt={autosave.savedAt ? new Date(autosave.savedAt) : undefined} />}
          viewSwitch={
            !view.narrow && (
              <SegmentedControl aria-label="视图" value={view.mode} onChange={(mode) => view.setWideMode(mode as ViewMode)}>
                <SegmentedControl.Item value="edit" icon="pen-line">
                  编辑
                </SegmentedControl.Item>
                <SegmentedControl.Item value="split" icon="columns-2">
                  并排
                </SegmentedControl.Item>
                <SegmentedControl.Item value="preview" icon="eye">
                  预览
                </SegmentedControl.Item>
              </SegmentedControl>
            )
          }
          onLogout={onLogout}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          primaryAction={
            <PublishActions
              status={status}
              getPostId={() => postIdRef.current}
              flush={flush}
              onPublished={syncServer}
              onMissingFields={onMissingFields}
              onSlugTaken={onSlugTaken}
              onSessionExpired={onSessionExpired}
            />
          }
        />
        {restoreDecision === "promptRestore" && !restoreSettled && stash && (
          <div className="px-5 pt-3 max-md:px-4">
            <RestoreBanner savedAt={new Date(stash.savedAt)} onRestore={restoreLocal} onDiscard={discardLocal} />
          </div>
        )}
        {view.narrow && (
          <Tabs aria-label="视图" value={view.mode} onChange={(tab) => view.setNarrowTab(tab as NarrowTab)}>
            <Tabs.Item value="edit" controls={EDITOR_PANE_ID}>
              编辑
            </Tabs.Item>
            <Tabs.Item value="preview" controls={PREVIEW_PANE_ID}>
              预览
            </Tabs.Item>
          </Tabs>
        )}
        <div className="relative flex min-h-0 flex-1">
          <section
            id={EDITOR_PANE_ID}
            aria-label="编辑"
            hidden={view.mode === "preview"}
            className={`flex min-w-0 flex-1 flex-col px-9 pt-7 max-md:px-4 max-md:pt-4 ${view.mode === "split" ? "border-r border-line" : ""}`}
          >
            <MarkdownEditor
              title={draft.title}
              body={draft.body}
              titleInvalid={missing.includes("title")}
              bodyInvalid={missing.includes("body")}
              onTitleChange={onTitleChange}
              onBodyChange={(body) => update({ body })}
              onUploadsChange={setUploadNames}
            />
          </section>
          <section
            ref={previewRef}
            id={PREVIEW_PANE_ID}
            aria-label="预览"
            hidden={view.mode === "edit"}
            className="min-w-0 flex-1 overflow-y-auto bg-surface px-10 py-7 [--article-bleed:40px] max-md:px-4 max-md:py-4 max-md:[--article-bleed:16px]"
          >
            <MarkdownPreview title={draft.title} body={draft.body} uploadNames={uploadNames} onSourceEdit={onSourceEdit} />
          </section>
          {settingsOpen && (
            <PostSettingsDrawer
              slug={draft.slug}
              slugTitleFallback={draft.title.trim() !== "" && slugify(draft.title) === ""}
              slugError={slugError ?? (missing.includes("slug") ? "请填写 slug" : undefined)}
              tagsField={<TagInput tags={draft.tags} onChange={(tags) => update({ tags })} />}
              unpublishAction={
                server.status === "published" && postId !== null && <UnpublishAction postId={postId} onUnpublished={syncServer} />
              }
              deleteAction={
                postId !== null && (
                  <DeletePostAction postId={postId} title={draft.title.trim() || "无标题"} beforeDelete={disable} onDeleted={onDeleted} onFailed={enable} />
                )
              }
              summary={draft.summary}
              publishedAt={publishedAt}
              onSlugChange={onSlugChange}
              onSummaryChange={(summary) => update({ summary })}
              onPublishedAtChange={(date) => update({ publishedAt: date || null })}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        tone="default"
        icon="log-out"
        title="有未保存的修改，确定登出吗？"
        description="未保存的内容会暂存在本机，下次打开这篇文章时可以恢复。"
        confirmLabel="登出"
        onConfirm={logoutNow}
        onCancel={() => setConfirmLogout(false)}
      />
    </ToastProvider>
  );
}
