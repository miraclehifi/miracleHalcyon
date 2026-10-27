// 豆瓣导入面板的纯函数（admin-media.md"从豆瓣导入"，UT-20、21）：步骤名、进度、汇总、上次同步、错误文案
import { importPlan, isValidDoubanUid, type ImportKind, type ImportStatus, type ImportStep } from "../../domains/shelf/douban/import";
import type { ShelfType } from "../../domains/shelf/entry";
import type { ImportCategoryState } from "../../domains/shelf/import-state-repo";

export { importPlan, isValidDoubanUid };

export const UID_FORMAT_MESSAGE = "用户 ID 只能包含字母、数字、下划线、点和短横线";

// 空串不提示（按钮禁用即可），格式不对才提示
export const uidError = (uid: string): string | null => (uid === "" || isValidDoubanUid(uid) ? null : UID_FORMAT_MESSAGE);

const KIND_LABELS: Record<ImportKind, string> = { movie: "影视", book: "书", game: "游戏" };
const STATUS_LABELS: Record<ImportKind, Record<ImportStatus, string>> = {
  movie: { done: "看过", doing: "在看" },
  book: { done: "读过", doing: "在读" },
  game: { done: "玩过", doing: "在玩" },
};

export const stepLabel = ({ kind, status }: ImportStep) => `${KIND_LABELS[kind]} · ${STATUS_LABELS[kind][status]}`;

// pages：全量或该步无水位，按"已处理 / 总数"；items：增量，按累计处理条数
export interface StepProgress {
  counting: "pages" | "items";
  processed: number;
  total: number;
  synced: number;
}

export const progressCount = (p: StepProgress) => (p.counting === "pages" ? `${p.processed} / ${p.total}` : `已同步 ${p.synced} 条`);

// 进度条：全量按当前步骤的已处理比例；增量按步骤序号（第 k / n 步）
export function progressRatio(p: StepProgress, stepIndex: number, stepCount: number): number {
  if (p.counting === "items") return stepCount > 0 ? (stepIndex + 1) / stepCount : 0;
  return p.total > 0 ? Math.min(1, p.processed / p.total) : 0;
}

export interface ImportTotals {
  created: number;
  updated: number;
  failed: number;
  coverFailed: number;
}

export function summaryText(t: ImportTotals, mode: "full" | "incremental", stopped: boolean): string {
  const prefix = stopped ? "已停止：" : mode === "incremental" ? "同步完成：" : "导入完成：";
  return `${prefix}新增 ${t.created}、更新 ${t.updated}、失败 ${t.failed}、封面失败 ${t.coverFailed}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

// 一个类别取看过、在看两项中较早的同步时间（本地时区）；任一为空 → 未同步
export function categorySyncLabel(categories: ImportCategoryState[], type: ShelfType): string {
  const times = categories.filter((c) => c.type === type).map((c) => c.syncedAt);
  if (times.length === 0 || times.some((t) => t === null)) return "未同步";
  const d = new Date((times as string[]).sort()[0]);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const hasAnySync = (categories: ImportCategoryState[]) => categories.some((c) => c.syncedAt !== null);

// 该步在增量模式下是否按水位截断（勾选类别该状态都有水位），决定进度显示方式
export const stepHasWatermark = (categories: ImportCategoryState[], step: ImportStep & { types: ShelfType[] }) =>
  step.types.every((type) => categories.some((c) => c.type === type && c.status === step.status && c.watermark !== null));

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "导入参数不正确，请检查用户 ID 与类别",
  DOUBAN_USER_NOT_FOUND: "豆瓣上找不到这个用户",
  DOUBAN_FORBIDDEN: "豆瓣标记未公开或需要登录，无法导入",
  FETCH_FAILED: "豆瓣暂时无法访问，已导入的条目已保存，可稍后重新导入",
  UNAUTHENTICATED: "登录已过期，请重新登录后再导入",
};

export const importErrorMessage = (code: string) => ERROR_MESSAGES[code] ?? "导入失败，请稍后重试";

export interface ImportFailureView {
  doubanId: string | null;
  title: string | null;
  reason: string;
}

const REASONS: Record<string, string> = {
  PARSE_FAILED: "解析不出条目信息",
  WRITE_FAILED: "写入失败，请重新导入",
  FETCH_FAILED: "豆瓣请求超时，请重新导入",
};

export const failureText = (f: ImportFailureView) => `${f.doubanId ? `豆瓣 ${f.doubanId}` : `《${f.title ?? "未知条目"}》`}：${REASONS[f.reason] ?? f.reason}`;

export const FAILURE_LIST_MAX = 50;
