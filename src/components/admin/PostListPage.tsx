// 文章列表页（admin-post-list.md，US-07）：首屏数据由页面 SSR 传入；筛选同步到 URL，之后的数据经接口拉取
// 加载中：无数据时骨架，有旧数据时保留并降低不透明度；失败显示"加载失败 / 重试"
// 空：没有任何文章时显示 EmptyState 并隐藏筛选行；筛选无结果时写明条件并提供"清除筛选"
// 删除（US-09，"删除与撤销"）：行折叠后本地移除，6 秒撤销期后才发删除请求（见 lib/admin/pending-delete）
import { useCallback, useEffect, useRef, useState } from "react";
import type { ListStatus } from "../../domains/post/repo";
import type { PostListItem as PostListItemData, PostListResult } from "../../domains/post/service";
import { buildListQuery, DEFAULT_LIST_QUERY, parseListQuery, type ListQueryState } from "../../lib/admin/list-query";
import { createPendingDelete, type PendingDelete } from "../../lib/admin/pending-delete";
import { useHydrated } from "../../lib/dom/hydration";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Pagination } from "../ui/Pagination";
import { SearchInput } from "../ui/SearchInput";
import { SegmentedControl } from "../ui/SegmentedControl";
import { ToastProvider, useToast } from "../ui/Toast";
import { PageHeader } from "./PageHeader";
import { PostList } from "./PostList";

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

const STATUS_NOUN: Record<ListStatus, string> = { all: "文章", draft: "草稿文章", published: "已发布文章" };

// 筛选无结果的说明：有关键字时写明关键字，只有状态筛选时写明状态
function noResultText({ status, q }: ListQueryState): string {
  return q ? `没有标题包含“${q}”的${STATUS_NOUN[status]}` : `还没有${STATUS_NOUN[status]}`;
}

const goToNewPost = () => window.location.assign("/admin/posts/new");

interface LoadState {
  data: PostListResult | null;
  loadedFor: string; // data 对应的查询（列表入场动画的 key：新数据到了才整页重新入场）
  loading: boolean;
  error: boolean;
}

// 本地移除一行：总数与对应状态的计数同步减 1
function withoutPost(data: PostListResult, post: PostListItemData): PostListResult {
  if (!data.items.some((item) => item.id === post.id)) return data;
  const counts = { ...data.counts, all: data.counts.all - 1, [post.status]: data.counts[post.status] - 1 };
  return { ...data, items: data.items.filter((item) => item.id !== post.id), total: data.total - 1, counts };
}

// 撤销 / 删除失败：按原下标插回，数量加回
function withPost(data: PostListResult, post: PostListItemData, index: number): PostListResult {
  if (data.items.some((item) => item.id === post.id)) return data;
  const counts = { ...data.counts, all: data.counts.all + 1, [post.status]: data.counts[post.status] + 1 };
  const items = [...data.items];
  items.splice(Math.min(index, items.length), 0, post);
  return { ...data, items, total: data.total + 1, counts };
}

interface Removed {
  post: PostListItemData;
  index: number; // 删除前在当前页的位置
  toastId: number;
}

const postName = (post: PostListItemData) => `《${post.title.trim() || "无标题"}》`;

async function fetchPosts(query: ListQueryState): Promise<PostListResult> {
  const response = await fetch(`/api/admin/posts${buildListQuery(query)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as PostListResult;
}

export function PostListPage(props: PostListPageProps) {
  return (
    <ToastProvider>
      <PostListView {...props} />
    </ToastProvider>
  );
}

function PostListView({ initial, query: initialQuery, renderedAt }: PostListPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchText, setSearchText] = useState(initialQuery.q);
  const [state, setState] = useState<LoadState>({ data: initial, loadedFor: buildListQuery(initialQuery), loading: false, error: initial === null });
  const latest = useRef(0); // 只采用最新一次请求的结果
  const waiting = useRef<PostListItemData | null>(null); // 撤销期内的一条：重新拉取的结果里也不显示
  const pending = useRef<PendingDelete<Removed> | null>(null); // 延迟提交控制器（挂载时创建）
  const hydrated = useHydrated();
  const [mountedAt] = useState(() => new Date());
  const clock = hydrated ? { now: mountedAt } : { now: new Date(renderedAt), timeZone: RENDER_TIME_ZONE };

  const load = useCallback(async (next: ListQueryState) => {
    const seq = ++latest.current;
    setState((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const fetched = await fetchPosts(next);
      if (seq !== latest.current) return null;
      const data = waiting.current ? withoutPost(fetched, waiting.current) : fetched;
      setState({ data, loadedFor: buildListQuery(next), loading: false, error: false });
      return data;
    } catch {
      if (seq === latest.current) setState((prev) => ({ ...prev, data: null, loading: false, error: true }));
      return null;
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
      pending.current?.flush(); // 换筛选 / 翻页前先提交待删除的一条
      setQuery(next);
      const url = `/admin${buildListQuery(next)}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      void load(next);
    },
    [load],
  );
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // 停止输入 300ms 后按标题搜索，回到第 1 页
  useEffect(() => {
    const q = searchText.trim();
    if (q === query.q) return;
    const timer = window.setTimeout(() => navigate({ ...query, q, page: 1 }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, query, navigate]);

  // 删除：撤销期结束（或离开页面、再删一条）才提交；keepalive 让请求在页面卸载后照常发出。
  // 成功后重新拉取当前页补位，当前页删空时回到上一页；失败时按原位插回并常驻提示
  const toast = useToast();
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    const commit = ({ post, index, toastId }: Removed) => {
      if (waiting.current?.id === post.id) waiting.current = null;
      toast.dismiss(toastId);
      const restore = () => {
        setState((prev) => (prev.data ? { ...prev, data: withPost(prev.data, post, index) } : prev));
        toast.show({ tone: "error", message: `删除${postName(post)}失败，请重试` });
      };
      fetch(`/api/admin/posts/${post.id}`, { method: "DELETE", keepalive: true }).then(
        (response) => {
          if (!response.ok && response.status !== 404) return restore();
          const current = queryRef.current;
          void load(current).then((data) => {
            if (data && data.items.length === 0 && current.page > 1) navigateRef.current({ ...current, page: current.page - 1 }, { replace: true });
          });
        },
        () => restore(),
      );
    };
    const controller = createPendingDelete<Removed>({ commit });
    pending.current = controller;
    return () => {
      controller.dispose();
      pending.current = null;
    };
  }, [load, toast]);

  const removePost = (post: PostListItemData, index: number) => {
    setState((prev) => (prev.data ? { ...prev, data: withoutPost(prev.data, post) } : prev));
    const undo = () => {
      const removed = pending.current?.undo();
      if (!removed) return;
      waiting.current = null;
      toast.dismiss(removed.toastId);
      setState((prev) => (prev.data ? { ...prev, data: withPost(prev.data, removed.post, removed.index) } : prev));
    };
    pending.current?.flush(); // 先提交上一条，再显示这一条的提示
    const toastId = toast.show({
      tone: "success",
      message: `已删除${postName(post)}`,
      action: { label: "撤销", onClick: undo },
      onHold: (held) => pending.current?.hold(held),
    });
    waiting.current = post;
    pending.current?.schedule({ post, index, toastId });
  };

  const clearFilters = () => {
    setSearchText("");
    navigate(DEFAULT_LIST_QUERY);
  };

  const { data, loading, error } = state;
  const counts = data?.counts;
  const noPostsAtAll = !error && data !== null && counts?.all === 0 && query.q === "";
  const noResults = !error && data !== null && !noPostsAtAll && data.items.length === 0 && data.total === 0;

  return (
    <main className="mx-auto flex w-full max-w-[896px] flex-col gap-6 py-10 max-lg:max-w-[calc(100%-64px)] max-md:max-w-none max-md:px-4 max-md:py-6">
      <PageHeader
        title="文章"
        meta={counts ? `共 ${counts.all} 篇` : undefined}
        action={
          <Button icon="pen-line" onClick={goToNewPost}>
            新建文章
          </Button>
        }
      />
      <div hidden={noPostsAtAll} className="flex items-center justify-between gap-3 max-md:flex-col max-md:items-stretch">
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
      {noPostsAtAll && (
        <EmptyState
          icon="feather"
          title="还没有文章"
          description="写下第一篇，草稿会自动保存"
          action={<Button onClick={goToNewPost}>写第一篇</Button>}
        />
      )}
      {noResults && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p role="status" className="text-ui text-ink-muted">
            {noResultText(query)}
          </p>
          <button type="button" onClick={clearFilters} className="cursor-pointer text-ui text-ink underline underline-offset-4 hover:text-ink-muted">
            清除筛选
          </button>
        </div>
      )}
      {!error && data && !noPostsAtAll && !noResults && (
        <div aria-busy={loading || undefined} className={`transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
          <PostList key={state.loadedFor} posts={data.items} onDelete={removePost} now={clock.now} timeZone={clock.timeZone} />
        </div>
      )}
      {!error && data && (
        <Pagination
          page={query.page}
          pageSize={data.pageSize}
          total={data.total}
          href={(page) => `/admin${buildListQuery({ ...query, page })}`}
          onNavigate={(page) => {
            navigate({ ...query, page });
            window.scrollTo({ top: 0 });
          }}
        />
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
