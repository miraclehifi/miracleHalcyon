// PostListItem（components.md"文章列表"，admin-post-list.md"列表行""行操作"）：后台文章列表的一行卡片
// 外框与读者端 PostCard 一致；active（由 PostList 传入）时显示 PostCard/Hover 双层错位，卡片自身不响应 :hover。
// 底层为 React Bits SwipeRow：向左拖露出"编辑 / 删除"抽屉，拖过 60% 行宽松手即删除；拖动或抽屉打开时双层错位收回
import { SquarePen, Trash2 } from "lucide-react";
import type { PostListItem as PostListItemData } from "../../domains/post/service";
import { formatRelativeTime } from "../../lib/format/relative-time";
import { badgeStatus, StatusBadge } from "../ui/StatusBadge";
import SwipeRow from "../vendor/react-bits/SwipeRow";

export interface PostListItemProps {
  post: PostListItemData;
  active?: boolean;
  open?: boolean; // 抽屉开合，由 PostList 控制（同一时间只开一行）
  onOpenChange?: (open: boolean) => void;
  onDelete?: () => void; // 行折叠完成后调用
  now?: Date; // 相对时间基准，测试注入
  timeZone?: string; // 缺省为浏览器时区
}

const FRAME = "rounded-[12px] border border-dashed border-line-strong bg-bg transition-transform duration-200 ease-out motion-reduce:transition-none";
// 拖动、回弹或抽屉打开时双层错位收回（SwipeRow 根节点的 data-*）
const SETTLED = "group-data-[shifted]:translate-0 group-data-[dragging]:translate-0 group-data-[open]:translate-0";

export function PostListItem({ post, active = false, open, onOpenChange, onDelete, now = new Date(), timeZone }: PostListItemProps) {
  const title = post.title.trim();
  const name = `《${title || "无标题"}》`;

  return (
    <SwipeRow
      label={name}
      toggleLabel={`${name}的操作`}
      active={active}
      open={open}
      onOpenChange={onOpenChange}
      onCommit={(action) => action.id === "delete" && onDelete?.()}
      actions={[
        { id: "delete", label: "删除", icon: <Trash2 size={20} aria-hidden="true" /> },
        {
          id: "edit",
          label: "编辑",
          icon: <SquarePen size={20} aria-hidden="true" />,
          href: `/admin/posts/${post.id}`,
          color: "var(--color-surface-sunken)",
          ink: "var(--color-ink)",
        },
      ]}
      direction="left"
      actionWidth={80}
      radius={12}
      actionColor="var(--color-danger)"
      actionInk="var(--color-danger-ink)"
      drawerColor="var(--color-surface-sunken)"
      drawerInk="var(--color-ink)"
      rowColor="transparent"
      textColor="var(--color-ink)"
      commitAt={0.6}
      fullSwipe
      snapBounce={0.2}
      resistance={0.55}
      collapseMs={200}
      closeOnAction
      haptic
      className="[--sr-h:96px] max-md:[--sr-h:85px]"
    >
      <article className="relative h-full" data-active={active || undefined}>
        <div aria-hidden="true" className={`absolute inset-0 ${FRAME}${active ? ` translate-x-1 translate-y-1 ${SETTLED}` : ""}`} />
        <div className={`relative flex h-24 items-center py-5 pr-14 pl-7 max-md:h-[85px] max-md:py-4 max-md:pr-12 max-md:pl-5 ${FRAME}${active ? ` -translate-x-1 -translate-y-1 ${SETTLED}` : ""}`}>
          <div className="min-w-0 flex-1">
            {/* 伪元素把链接的可点区域扩到整张卡片；不可拖拽（避免拖动卡片时出现链接残影） */}
            <a
              href={`/admin/posts/${post.id}`}
              draggable={false}
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
    </SwipeRow>
  );
}
