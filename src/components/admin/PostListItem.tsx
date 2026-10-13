// PostListItem（components.md"文章列表"，admin-post-list.md"列表行"）：后台文章列表的一行卡片
// 外框与读者端 PostCard 一致；active（由 PostList 传入）时显示 PostCard/Hover 双层错位，卡片自身不响应 :hover。
// 左滑抽屉与"更多操作"按钮在 Sprint 2（US-09 删除）接入
import type { PostListItem as PostListItemData } from "../../domains/post/service";
import { formatRelativeTime } from "../../lib/format/relative-time";
import { badgeStatus, StatusBadge } from "../ui/StatusBadge";

export interface PostListItemProps {
  post: PostListItemData;
  active?: boolean;
  now?: Date; // 相对时间基准，测试注入
  timeZone?: string; // 缺省为浏览器时区
}

const FRAME = "rounded-[12px] border border-dashed border-line-strong bg-bg transition-transform duration-200 ease-out motion-reduce:transition-none";

export function PostListItem({ post, active = false, now = new Date(), timeZone }: PostListItemProps) {
  const title = post.title.trim();

  return (
    <article className="relative" data-active={active || undefined}>
      <div aria-hidden="true" className={`absolute inset-0 ${FRAME}${active ? " translate-x-1 translate-y-1" : ""}`} />
      <div className={`relative flex h-24 items-center px-7 py-5 max-md:h-[85px] max-md:px-5 max-md:py-4 ${FRAME}${active ? " -translate-x-1 -translate-y-1" : ""}`}>
        <div className="min-w-0 flex-1">
          {/* 伪元素把链接的可点区域扩到整张卡片 */}
          <a
            href={`/admin/posts/${post.id}`}
            className="block truncate text-title-sm text-ink after:absolute after:inset-0 after:rounded-[12px] max-md:text-[18px]"
          >
            {title || <em className="font-normal text-ink-faint">无标题</em>}
          </a>
          <div className="mt-1.5 flex items-center gap-2">
            <StatusBadge status={badgeStatus(post.status, post.hasUnpublishedChanges)} />
            <span className="truncate text-caption text-ink-faint">更新于 {formatRelativeTime(new Date(post.updatedAt), now, timeZone)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
