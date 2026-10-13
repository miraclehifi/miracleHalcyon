// 文章列表页（admin-post-list.md，US-07）：首屏数据由页面 SSR 传入；加载中骨架、加载失败"重试"
// 筛选、搜索、分页、空状态由后续任务接入
import { useState } from "react";
import type { PostListResult } from "../../domains/post/service";
import { useHydrated } from "../../lib/dom/hydration";
import { Button } from "../ui/Button";
import { PageHeader } from "./PageHeader";
import { PostListItem } from "./PostListItem";

export interface PostListPageProps {
  initial: PostListResult | null; // null：SSR 读取失败
  renderedAt: string; // SSR 时刻，首次渲染（含水合）的相对时间基准
}

// 首次渲染与 SSR 用同一基准与时区，避免水合不一致；挂载后换成当前时间与浏览器时区
const RENDER_TIME_ZONE = "Asia/Shanghai";
const SKELETON_ROWS = 5;

type LoadState = { kind: "ready"; data: PostListResult } | { kind: "loading" } | { kind: "error" };

async function fetchPosts(): Promise<PostListResult> {
  const response = await fetch("/api/admin/posts", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as PostListResult;
}

export function PostListPage({ initial, renderedAt }: PostListPageProps) {
  const [state, setState] = useState<LoadState>(initial ? { kind: "ready", data: initial } : { kind: "error" });
  const hydrated = useHydrated();
  const [mountedAt] = useState(() => new Date());
  const clock = hydrated ? { now: mountedAt } : { now: new Date(renderedAt), timeZone: RENDER_TIME_ZONE };

  const reload = async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", data: await fetchPosts() });
    } catch {
      setState({ kind: "error" });
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[896px] flex-col gap-6 px-0 py-10 max-lg:max-w-[calc(100%-64px)] max-md:max-w-none max-md:px-4 max-md:py-6">
      <PageHeader
        title="文章"
        meta={state.kind === "ready" ? `共 ${state.data.total} 篇` : undefined}
        action={
          <Button icon="pen-line" onClick={() => window.location.assign("/admin/posts/new")}>
            新建文章
          </Button>
        }
      />
      {state.kind === "ready" && (
        <ul className="flex flex-col gap-5">
          {state.data.items.map((post) => (
            <li key={post.id}>
              <PostListItem post={post} now={clock.now} timeZone={clock.timeZone} />
            </li>
          ))}
        </ul>
      )}
      {state.kind === "loading" && (
        <ul aria-busy="true" aria-label="正在加载文章" className="flex flex-col gap-5">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <li key={index} className="h-24 animate-pulse rounded-[12px] border border-dashed border-line-strong bg-surface-sunken motion-reduce:animate-none max-md:h-[85px]" />
          ))}
        </ul>
      )}
      {state.kind === "error" && (
        <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-ui text-ink-muted">加载失败</p>
          <Button variant="secondary" onClick={reload}>
            重试
          </Button>
        </div>
      )}
    </main>
  );
}
