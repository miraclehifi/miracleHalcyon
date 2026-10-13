// 文章列表的 URL 状态（admin-post-list.md 路由 `/admin?status=&q=&page=`）：
// 解析时容错（非法值回默认），生成时省略默认值，使默认视图的地址就是 `/admin`
import type { ListStatus } from "../../domains/post/repo";

export interface ListQueryState {
  status: ListStatus;
  q: string;
  page: number;
}

export const DEFAULT_LIST_QUERY: ListQueryState = { status: "all", q: "", page: 1 };

const STATUSES: readonly ListStatus[] = ["all", "draft", "published"];

// 列表页码：正整数，≤ 9 位（接口校验共用，见 lib/api/http.ts）
export const isPageParam = (text: string) => /^[1-9]\d{0,8}$/.test(text);

export function parseListQuery(search: string | URLSearchParams): ListQueryState {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const status = params.get("status") as ListStatus | null;
  const pageText = params.get("page") ?? "";
  return {
    status: status && STATUSES.includes(status) ? status : DEFAULT_LIST_QUERY.status,
    q: (params.get("q") ?? "").trim(),
    page: isPageParam(pageText) ? Number(pageText) : DEFAULT_LIST_QUERY.page,
  };
}

// 返回带 "?" 的查询串；全为默认值时返回空串
export function buildListQuery({ status, q, page }: ListQueryState): string {
  const params = new URLSearchParams();
  if (status !== DEFAULT_LIST_QUERY.status) params.set("status", status);
  if (q) params.set("q", q);
  if (page !== DEFAULT_LIST_QUERY.page) params.set("page", String(page));
  const text = params.toString();
  return text ? `?${text}` : "";
}
