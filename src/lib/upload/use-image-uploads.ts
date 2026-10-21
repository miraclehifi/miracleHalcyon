// 编辑器中的图片上传（editor module-spec §1、media-upload module-spec §1）：一批文件在光标处一次插入"处理中…"占位，
// 压缩、解码算出主色与宽高后改为"上传中…"并随请求上报；进行中的任务按占位出现顺序排成有序列表；完成时替换对应占位
// （保留作者选区、可撤销）。失败时占位改为"上传失败"、卡片进入 error（带原因，不弹提示），可重试（从压缩重跑）或移除（删掉整行占位）。每个任务对外是一张进度卡片的数据（UploadView：阶段、进度、缩略图），
// 压缩 / 视频阶段没有真实进度按时间趋近，上传阶段按字节；成功后先淡出 fadeOutMs 再替换占位。缩略图 blob URL 在任务结束或卸载时回收。每项经 uploadItem 处理（实况项另处理视频、同一请求上传），警示与错误带文件名。
// 占位槽位（editor module-spec §1）：源码中的占位按出现顺序对应一个槽位，槽位绑定一个任务或为空（孤立占位：刷新后已有的、
// 撤销"移除"或粘贴带回的），空槽位的卡片为"上传已中断"、只能移除。作者删掉占位时按改动区间找出对应槽位移出（任务完成后
// 不再插入），新出现的占位插入空槽位；判断不了时全部转为空槽位、不改写源码。上传前校验类型与大小，被拒的不插占位、不上传。
// Afilmory 照片（US-13，insertAfilmoryPhotos）：任务来源为照片 id，同样占位与卡片；fetching 阶段请求照片信息后生成外链引用，不进上传队列
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { site } from "../../config/site";
import { fetchAfilmoryPhoto } from "../afilmory/client";
import { afilmoryMarkdown, type AfilmoryPhotoInfo } from "../afilmory/markdown";
import {
  applyEdit,
  countPlaceholders,
  type Edit,
  insertPlaceholders,
  markFailed,
  markProcessing,
  markUploading,
  PLACEHOLDER_PROCESSING,
  placeholderEdit,
  placeholdersBefore,
  removePlaceholderLine,
  replacePlaceholder,
} from "../editor/format-commands";
import { compressImage } from "./compress-image";
import { measureImage, type ImageMeta } from "./dominant-color";
import { extractMotionPhoto } from "./extract-motion-photo";
import { processVideo as processVideoDefault, type ProcessedVideo } from "./process-video";
import { uploadImage, UploadError, type UploadedImage, type UploadExtras, type UploadOptions } from "./upload-client";
import { creep, stageProgress, type UploadStage } from "./progress";
import { uploadItem, type UploadItem } from "./upload-item";
import { createLimiter, UPLOAD_CONCURRENCY } from "./upload-queue";
import { MESSAGE_FAILED, validateImageFile, withFileName } from "./validate-file";

interface UploadTask {
  id: string;
  name: string; // 卡片与提示里的名称：文件名，或"Afilmory {id}"
  file?: File; // 文件上传任务
  afilmoryId?: string; // Afilmory 照片任务（无文件、无缩略图）
  batchSize: number;
  thumbUrl?: string;
  stage: UploadStage | "error";
  error?: string; // 失败原因（stage = error）
  ratio: number; // 当前阶段内的完成比例
  progress: number; // 0–100，只增不减
  live: boolean; // 正在 / 已经处理实况视频（上传阶段从 40% 起）
  liveEnabled: boolean; // 创建时的实况开关快照：之后切换开关不影响已有任务
  abort?: AbortController; // 本次处理的视频中止（"仅转为静态图"），每次运行新建
  leaving: boolean;
  timer?: ReturnType<typeof setInterval>;
  actions?: { retry(): void; remove(): void; stillOnly(): void }; // 卡片按钮（创建任务时挂上）
}

// 空槽位：占位没有对应的任务
interface EmptySlot {
  id: string;
  empty: true;
}

type Slot = UploadTask | EmptySlot;
const isTask = (slot: Slot): slot is UploadTask => !("empty" in slot);

// 一张上传进度卡片的数据（UploadCard），按占位出现顺序排列
export interface UploadView {
  id: string;
  name: string;
  state: "waiting" | "compressing" | "processing-live" | "fetching" | "uploading" | "error" | "interrupted";
  progress: number;
  thumbUrl?: string;
  error?: string;
  leaving: boolean;
  retry?: () => void; // 只有失败的任务可重试
  remove: () => void; // 删掉该槽位的占位（失败 / 已中断卡片的"移除"）
  stillOnly?: () => void; // 只有处理实况视频阶段可用：放弃本张视频，按静态图上传
  // 刚结束（成功或移除）的任务：源码里的占位已经没了，但预览要等下一次渲染才去掉它；
  // 这段时间保留在原位置，预览按占位数判断要不要算上它（不渲染任何内容），避免后面的卡片错位或闪出空卡片
  ghost?: boolean;
}

const CREEP_INTERVAL_MS = 100;
const GHOST_MS = 1500;
const FADE_OUT_MS = 200;

// 减弱动效（或环境没有 matchMedia）时不淡出
export const defaultFadeOutMs = () =>
  typeof matchMedia === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches ? FADE_OUT_MS : 0;

// 卡片上显示的失败原因：网络中断、超时、服务端给出的文案；其余统一为"上传失败，请重试"
export function failureReason(error: unknown): string {
  return error instanceof UploadError && error.message ? error.message : MESSAGE_FAILED;
}

let nextTaskId = 0;
const emptySlot = (): EmptySlot => ({ id: `slot-${++nextTaskId}`, empty: true });
// 缩略图失败（环境不支持）时卡片照常显示，只是没有底图
function createThumb(file: File): string | undefined {
  try {
    return URL.createObjectURL(file);
  } catch {
    return undefined;
  }
}

export interface UseImageUploadsOptions {
  onTasksChange?: (tasks: UploadView[]) => void; // 进行中任务（按占位顺序），供预览挂载进度卡片
  upload?: (file: File, extras: UploadExtras, options?: UploadOptions) => Promise<UploadedImage>;
  compress?: (file: File) => Promise<File>; // 浏览器端压缩（media-upload-experience 模块 2）
  measure?: (file: Blob) => Promise<ImageMeta | null>;
  processVideo?: (video: Blob, options?: { signal?: AbortSignal }) => Promise<ProcessedVideo>;
  toItem?: (file: File) => Promise<UploadItem>; // 文件 → 上传项（安卓动态照片展开为实况项，add-motion-photo-detection）
  onError?: (message: string) => void; // 被拒或上传失败的提示文案（一批多张时带文件名）
  onWarning?: (message: string) => void; // 做成了但打了折扣（实况视频被丢弃 / 只在部分浏览器播放），带文件名规则同上
  fadeOutMs?: number; // 成功后卡片淡出的时长，之后才替换占位；缺省按减弱动效设置
  onUnauthenticated?: () => void; // 上传返回 401：会话过期处理（暂存、跳登录），占位已改为"上传失败"
  liveEnabled?: boolean; // 实况照片开关（缺省关闭）：关闭时动态照片只传静态图
  fetchPhoto?: (id: string) => Promise<AfilmoryPhotoInfo>; // Afilmory 照片信息（US-13）
  photoStorage?: string; // 登记的照片存储前缀（site.afilmory.storage）
}

// JPEG 内嵌视频（安卓动态照片）展开为实况项；其余按普通图片
export async function fileToItem(file: File): Promise<UploadItem> {
  if (file.type !== "image/jpeg") return { kind: "image", file };
  const motion = extractMotionPhoto(await file.arrayBuffer());
  return motion ? { kind: "live", name: file.name, ...motion } : { kind: "image", file };
}

// 任务结束（或被移出、组件卸载）：停计时器、回收缩略图；可重复调用
function release(task: UploadTask) {
  clearInterval(task.timer);
  task.timer = undefined;
  if (task.thumbUrl) URL.revokeObjectURL(task.thumbUrl);
  task.thumbUrl = undefined;
}

export function useImageUploads(textareaRef: RefObject<HTMLTextAreaElement | null>, {
    onTasksChange,
    upload = uploadImage,
    compress = compressImage,
    measure = measureImage,
    processVideo = processVideoDefault,
    toItem = fileToItem,
    onError,
    onWarning,
    fadeOutMs,
    liveEnabled = false,
    onUnauthenticated,
    fetchPhoto = fetchAfilmoryPhoto,
    photoStorage = site.afilmory?.storage,
  }: UseImageUploadsOptions = {},
) {
  const slots = useRef<Slot[]>([]);
  const [limit] = useState(() => createLimiter(UPLOAD_CONCURRENCY));
  const toView = (slot: Slot): UploadView =>
    isTask(slot) ? taskView(slot) : { id: slot.id, name: "", state: "interrupted", progress: 0, leaving: false, remove: () => remove(slot) };
  const taskView = (task: UploadTask): UploadView => ({
    id: task.id,
    name: task.name,
    state: task.stage === "done" ? "uploading" : task.stage,
    progress: task.progress,
    thumbUrl: task.thumbUrl,
    error: task.error,
    leaving: task.leaving,
    retry: task.stage === "error" ? task.actions?.retry : undefined,
    stillOnly: task.stage === "processing-live" ? task.actions?.stillOnly : undefined,
    remove: () => task.actions?.remove(),
  });
  const ghosts = useRef<{ id: string; index: number }[]>([]);
  const notify = () => {
    const views = slots.current.map(toView);
    for (const ghost of [...ghosts.current].sort((a, b) => a.index - b.index)) {
      views.splice(Math.min(ghost.index, views.length), 0, { id: ghost.id, name: "", state: "uploading", progress: 100, leaving: true, remove: () => {}, ghost: true });
    }
    onTasksChangeRef.current?.(views);
  };

  // 槽位出列：在原位置留一个幽灵条目，GHOST_MS 后撤掉
  const dequeue = (slot: Slot) => {
    const index = slots.current.indexOf(slot);
    if (index < 0) return;
    slots.current = slots.current.filter((item) => item !== slot);
    const ghost = { id: slot.id, index };
    ghosts.current = [...ghosts.current, ghost];
    setTimeout(() => {
      ghosts.current = ghosts.current.filter((item) => item !== ghost);
      notify();
    }, GHOST_MS);
  };
  const onTasksChangeRef = useRef(onTasksChange);
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const selfEditing = useRef(false); // 本 hook 自己插入 / 改写占位时的 input 事件不算作者编辑
  const lastValue = useRef<string | null>(null); // 槽位所对应的源码

  const edit = (element: HTMLTextAreaElement, change: Edit, preserveSelection = false) => {
    selfEditing.current = true;
    try {
      applyEdit(element, change, { preserveSelection });
    } finally {
      selfEditing.current = false;
      lastValue.current = element.value;
    }
  };

  // 判断不了槽位与占位的对应（或源码被整体替换，如页面加载、恢复草稿）：全部转为空槽位，进行中的任务完成后不写回
  const resetSlots = (count: number) => {
    slots.current.filter(isTask).forEach(release);
    slots.current = Array.from({ length: count }, emptySlot);
  };

  // 槽位数与源码占位数对不上时重建；返回是否重建了
  const sync = (element: HTMLTextAreaElement) => {
    lastValue.current = element.value;
    const count = countPlaceholders(element.value);
    if (count === slots.current.length) return false;
    resetSlots(count);
    return true;
  };

  useEffect(() => {
    onTasksChangeRef.current = onTasksChange;
    onUnauthenticatedRef.current = onUnauthenticated;
  });

  // 卸载：停掉趋近计时器、回收缩略图
  useEffect(
    () => () => {
      slots.current.filter(isTask).forEach(release);
    },
    [],
  );

  // 源码不经输入事件改变（页面加载、恢复草稿等受控赋值）：每次渲染后核对一次。
  // 本 hook 自己写入时 React 会在 input 事件里同步渲染，此时槽位还没更新，跳过（作者输入的槽位已在捕获阶段更新）
  useEffect(() => {
    const element = textareaRef.current;
    if (element && !selfEditing.current && element.value !== lastValue.current && sync(element)) notify();
  });

  // 作者编辑：按改动区间移出被删占位的槽位、为新出现的占位插入空槽位。分两步，都挂在 window 上：
  // 捕获阶段（React 处理之前）只更新槽位 ref——React 会在这次 input 里同步渲染，"渲染后核对"看到的已是新槽位；
  // 冒泡阶段（React 处理完 onChange 之后）再通知卡片列表——若先于 React 触发重渲染，受控 textarea 会被写回旧值、撤销被吞掉
  useEffect(() => {
    const element = textareaRef.current;
    const win = element?.ownerDocument.defaultView;
    if (!element || !win) return;
    let changed = false;
    const reconcile = (event: Event) => {
      if (event.target !== element) return;
      const prev = lastValue.current ?? "";
      const next = element.value;
      lastValue.current = next;
      if (selfEditing.current) return;
      const before = countPlaceholders(prev);
      const count = countPlaceholders(next);
      if (before !== slots.current.length) {
        changed = sync(element) || changed;
        return;
      }
      if (count === before) return;
      const change = placeholderEdit(prev, next, element.selectionStart);
      if (!change) resetSlots(count);
      else {
        const kept = slots.current.filter((slot, i) => {
          if (!change.removed.includes(i)) return true;
          if (isTask(slot)) release(slot);
          return false;
        });
        slots.current = Array.from({ length: count }, (_, i) => (change.inserted.includes(i) ? emptySlot() : kept.shift()!));
      }
      changed = true;
    };
    const announce = (event: Event) => {
      if (event.target !== element || !changed) return;
      changed = false;
      notify();
    };
    win.addEventListener("input", reconcile, true);
    win.addEventListener("input", announce);
    return () => {
      win.removeEventListener("input", reconcile, true);
      win.removeEventListener("input", announce);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 槽位与源码都在 ref 中，sync / notify 每次渲染重建但只读写 ref
  }, [textareaRef]);

  // 改写第 task 个占位；任务已不在槽位中（作者删了它的占位）或占位数与槽位数对不上时不改写
  const rewrite = (task: UploadTask, compute: (text: string, index: number) => Edit | null) => {
    const element = textareaRef.current;
    const index = slots.current.indexOf(task);
    if (element && index >= 0 && countPlaceholders(element.value) === slots.current.length) {
      const change = compute(element.value, index);
      if (change) edit(element, change, true);
    }
  };

  const finish = (task: UploadTask, markdown: string) => {
    release(task);
    rewrite(task, (text, index) => replacePlaceholder(text, index, markdown));
    dequeue(task);
    notify();
  };

  const update = (task: UploadTask) => {
    if (task.stage === "error") return;
    task.progress = Math.max(task.progress, stageProgress(task.stage, task.ratio, { live: task.live }));
    if (slots.current.includes(task)) notify();
  };

  // 进入新阶段：压缩与视频处理没有真实进度，按时间趋近
  const enter = (task: UploadTask, stage: UploadStage | "error") => {
    clearInterval(task.timer);
    task.timer = undefined;
    task.stage = stage;
    task.ratio = 0;
    if ((stage === "compressing" || stage === "processing-live" || stage === "fetching") && slots.current.includes(task)) {
      task.timer = setInterval(() => {
        task.ratio = creep(task.ratio);
        update(task);
      }, CREEP_INTERVAL_MS);
    }
    update(task);
  };

  const succeed = (task: UploadTask, markdown: string) => {
    enter(task, "done");
    task.leaving = true;
    notify();
    const delay = fadeOutMs ?? defaultFadeOutMs();
    if (delay > 0) setTimeout(() => finish(task, markdown), delay);
    else finish(task, markdown);
  };

  // 失败：停计时器，占位改为"上传失败"，卡片显示原因；缩略图保留给重试
  const fail = (task: UploadTask, error: unknown) => {
    clearInterval(task.timer);
    task.timer = undefined;
    task.stage = "error";
    task.error = failureReason(error);
    rewrite(task, markFailed);
    notify();
    if (error instanceof UploadError && error.status === 401) onUnauthenticatedRef.current?.();
  };

  // Afilmory 照片：请求照片信息 → 生成引用；不受上传并发限制（只是一次小请求）
  const runAfilmory = (task: UploadTask, id: string) => {
    enter(task, "fetching");
    fetchPhoto(id)
      .then((info) => {
        const { markdown, warning } = afilmoryMarkdown(info, { storage: photoStorage, live: task.liveEnabled });
        if (warning) onWarning?.(withFileName(warning, task.name, task.batchSize));
        return markdown;
      })
      .then(
        (markdown) => succeed(task, markdown),
        (error: unknown) => fail(task, error),
      );
  };

  const run = (task: UploadTask) => {
    if (task.afilmoryId) return runAfilmory(task, task.afilmoryId);
    const file = task.file!;
    const abort = new AbortController();
    task.abort = abort;
    limit(async () => {
      enter(task, "compressing");
      return uploadItem(await toItem(file), { compress, measure, upload, processVideo }, {
        onProcessingLive: () => {
          task.live = true;
          enter(task, "processing-live");
        },
        onUploading: () => {
          rewrite(task, markUploading);
          enter(task, "uploading");
        },
        onUploadProgress: (loaded, total) => {
          task.ratio = total > 0 ? loaded / total : 0;
          update(task);
        },
        onWarning: (message) => onWarning?.(withFileName(message, task.name, task.batchSize)),
      }, { live: task.liveEnabled, signal: abort.signal });
    }).then(
      (markdown) => succeed(task, markdown),
      (error: unknown) => fail(task, error),
    );
  };

  // 仅转为静态图：中止本张的视频处理，按静态图进入上传；其他任务与工具栏开关不受影响
  const stillOnly = (task: UploadTask) => {
    if (task.stage !== "processing-live" || !slots.current.includes(task)) return;
    task.live = false;
    task.abort?.abort();
  };

  // 重试：从压缩重新开始（重新排队），占位改回"处理中…"，进度归零
  const retry = (task: UploadTask) => {
    if (task.stage !== "error" || !slots.current.includes(task)) return;
    task.stage = "waiting";
    task.error = undefined;
    task.progress = 0;
    task.ratio = 0;
    task.live = false;
    rewrite(task, markProcessing);
    notify();
    run(task);
  };

  // 移除：作者点了按钮，像图片菜单一样把焦点交给源码区再写入（进入原生撤销栈），保持原选区；删掉整行占位，槽位出列
  // 函数声明：空槽位的卡片视图（toView）在它之前引用它
  function remove(slot: Slot) {
    const element = textareaRef.current;
    const index = slots.current.indexOf(slot);
    const change = element && index >= 0 && countPlaceholders(element.value) === slots.current.length ? removePlaceholderLine(element.value, index) : null;
    if (element && change) {
      const delta = -(change.to - change.from);
      const shift = (pos: number) => (pos <= change.from ? pos : pos >= change.to ? pos + delta : change.from);
      edit(element, { ...change, select: [shift(element.selectionStart), shift(element.selectionEnd)] });
    }
    if (isTask(slot)) release(slot);
    dequeue(slot);
    notify();
  }


  // 一批任务在插入位置一次插入"处理中…"占位（每个一行），挂上卡片按钮并开始处理
  const start = (element: HTMLTextAreaElement, batch: UploadTask[], at?: number) => {
    const from = at ?? element.selectionStart;
    const to = at ?? element.selectionEnd;
    sync(element);
    const position = placeholdersBefore(element.value, from);
    edit(element, { ...insertPlaceholders(from, batch.length, PLACEHOLDER_PROCESSING), to });
    slots.current = [...slots.current.slice(0, position), ...batch, ...slots.current.slice(position)];
    notify();
    for (const task of batch) {
      task.actions = { retry: () => retry(task), remove: () => remove(task), stillOnly: () => stillOnly(task) };
      run(task);
    }
  };

  const uploadFiles = useCallback(
    // at：插入位置（拖放位置），缺省为当前光标 / 选区
    (files: File[], at?: number) => {
      const element = textareaRef.current;
      if (!element || files.length === 0) return;
      const batch: UploadTask[] = [];
      for (const file of files) {
        const problem = validateImageFile(file);
        if (problem) onError?.(withFileName(problem, file.name, files.length));
        else batch.push({ id: `upload-${++nextTaskId}`, name: file.name, file, batchSize: files.length, thumbUrl: createThumb(file), stage: "waiting", ratio: 0, progress: 0, live: false, liveEnabled, leaving: false });
      }
      if (batch.length > 0) start(element, batch, at);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 任务列表在 ref 中，回调只依赖 ref 与上传函数
    [textareaRef, upload, compress, measure, processVideo, toItem, onError, onWarning, limit, fadeOutMs, liveEnabled],
  );

  // Afilmory 照片（US-13）：每个 id 一个任务、一行占位，按 id 顺序
  const insertAfilmoryPhotos = useCallback(
    (ids: string[], at?: number) => {
      const element = textareaRef.current;
      if (!element || ids.length === 0) return;
      const batch = ids.map((afilmoryId): UploadTask => ({ id: `upload-${++nextTaskId}`, name: `Afilmory ${afilmoryId}`, afilmoryId, batchSize: ids.length, stage: "waiting", ratio: 0, progress: 0, live: false, liveEnabled, leaving: false }));
      start(element, batch, at);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 同 uploadFiles
    [textareaRef, fetchPhoto, photoStorage, onWarning, fadeOutMs, liveEnabled],
  );

  return { uploadFiles, insertAfilmoryPhotos };
}
