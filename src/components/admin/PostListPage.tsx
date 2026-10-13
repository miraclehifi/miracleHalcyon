// 文章列表页（admin-post-list.md，US-07）：首屏数据由页面 SSR 传入；筛选同步到 URL，之后的数据经接口拉取
// 加载中：无数据时骨架，有旧数据时保留并降低不透明度；失败显示"加载失败 / 重试"。分页、空状态由后续任务接入
import { useCallback, useEffect, useRef, useState } from "react";
import type { ListStatus } from "../../domains/post/repo";
import type { PostListResult } from "../../domains/post/service";
import { buildListQuery, parseListQuery, type ListQueryState } from "../../lib/admin/list-query";
import { useHydrated } from "../../lib/dom/hydration";
import { Button } from "../ui/Button";
import { SearchInput } from "../ui/SearchInput";
import { SegmentedControl } from "../ui/SegmentedControl";
import { PageHeader } from "./PageHeader";
import { PostListItem } from "./PostListItem";

export interface PostListPageProps {
  initial: PostListResult | null; // null：SSR 读取失败
  query: ListQueryState; // SSR 解析的 URL 状态
  renderedAt: string; // SSR 时刻，首次渲染（含水合）的相对时间基准
}

// 首次渲染与 SSR 用同一基准与时区，避免水合不一致；水合后换成当前时间与浏览器时区
const RENDER_TIME_ZONE = "Asia/Shanghai";
const SKELETON_ROWS = 5;
const SEARCH_DEBOUNCE_MS = 300;
const STATUS_TABS: { value: ListStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
];

interface LoadState {
  data: PostListResult | null;
  loading: boolean;
  error: boolean;
}

async function fetchPosts(query: ListQueryState): Promise<PostListResult> {
  const response = await fetch(`/api/admin/posts${buildListQuery(query)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as PostListResult;
}

export function PostListPage({ initial, query: initialQuery, renderedAt }: PostListPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchText, setSearchText] = useState(initialQuery.q);
  const [state, setState] = useState<LoadState>({ data: initial, loading: false, error: initial === null });
  const latest = useRef(0); // 只采用最新一次请求的结果
  const hydrated = useHydrated();
  const [mountedAt] = useState(() => new Date());
  const clock = hydrated ? { now: mountedAt } : { now: new Date(renderedAt), timeZone: RENDER_TIME_ZONE };

  const load = useCallback(async (next: ListQueryState) => {
    const seq = ++latest.current;
    setState((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const data = await fetchPosts(next);
      if (seq === latest.current) setState({ data, loading: false, error: false });
    } catch {
      if (seq === latest.current) setState({ data: null, loading: false, error: true });
    }
  }, []);

  // 浏览器前进 / 后退：按地址栏恢复筛选
  useEffect(() => {
    const onPopState = () => {
      const next = parseListQuery(window.location.search);
      setQuery(next);
      setSearchText(next.q);
      void load(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [load]);

  // 搜索输入用 replaceState，避免每次停顿都留下一条历史记录
  const navigate = useCallback(
    (next: ListQueryState, { replace = false } = {}) => {
      setQuery(next);
      const url = `/admin${buildListQuery(next)}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      void load(next);
    },
    [load],
  );

  // 停止输入 300ms 后按标题搜索，回到第 1 页
  useEffect(() => {
    const q = searchText.trim();
    if (q === query.q) return;
    const timer = window.setTimeout(() => navigate({ ...query, q, page: 1 }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, query, navigate]);

  const { data, loading, error } = state;
  const counts = data?.counts;

  return (
    <main className="mx-auto flex w-full max-w-[896px] flex-col gap-6 py-10 max-lg:max-w-[calc(100%-64px)] max-md:max-w-none max-md:px-4 max-md:py-6">
      <PageHeader
        title="文章"
        meta={counts ? `共 ${counts.all} 篇` : undefined}
        action={
          <Button icon="pen-line" onClick={() => window.location.assign("/admin/posts/new")}>
            新建文章
          </Button>
        }
      />
      <div className="flex items-center justify-between gap-3 max-md:flex-col max-md:items-stretch">
        <SegmentedControl aria-label="按状态筛选" value={query.status} onChange={(status) => navigate({ ...query, status: status as ListStatus, page: 1 })}>
          {STATUS_TABS.map(({ value, label }) => (
            <SegmentedControl.Item key={value} value={value} count={counts?.[value]}>
              {label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
        <SearchInput placeholder="搜索标题" value={searchText} onChange={setSearchText} maxLength={100} className="w-[280px] max-md:w-full" />
      </div>
      {error && (
        <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-ui text-ink-muted">加载失败</p>
          <Button variant="secondary" onClick={() => void load(query)}>
            重试
          </Button>
        </div>
      )}
      {!error && data && (
        <ul aria-busy={loading || undefined} className={`flex flex-col gap-5 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
          {data.items.map((post) => (
            <li key={post.id}>
              <PostListItem post={post} now={clock.now} timeZone={clock.timeZone} />
            </li>
          ))}
        </ul>
      )}
      {!error && !data && loading && (
        <ul aria-busy="true" aria-label="正在加载文章" className="flex flex-col gap-5">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <li key={index} className="h-24 animate-pulse rounded-[12px] border border-dashed border-line-strong bg-surface-sunken motion-reduce:animate-none max-md:h-[85px]" />
          ))}
        </ul>
      )}
    </main>
  );
}
