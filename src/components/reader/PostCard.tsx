// PostCard（components.md"读者端区块"、reader-post-list.md"文章卡片"）：1px 虚线外框；标题链接用伪元素把可点区域扩到整卡，
// 标签链接叠在其上（不嵌套）；active（由 PostCardList 的选中行传入）时显示 PostCard/Hover 双层错位，卡片自身不响应 :hover
import type { CardModel } from "../../lib/reader/types";

export interface PostCardProps {
  card: CardModel;
  active?: boolean;
}

const FRAME = "rounded-[12px] border border-dashed border-line-strong bg-bg transition-transform duration-300 ease-out motion-reduce:transition-none";

export function PostCard({ card, active = false }: PostCardProps) {
  return (
    <article className="relative" data-active={active || undefined}>
      <div aria-hidden="true" data-layer="bottom" className={`absolute inset-0 ${FRAME}${active ? " translate-x-1 translate-y-1 motion-reduce:translate-0" : ""}`} />
      <div data-layer="top" className={`relative flex gap-6 p-7 max-md:px-5 max-md:py-4 ${FRAME}${active ? " -translate-x-1 -translate-y-1 motion-reduce:translate-0 motion-reduce:border-ink-faint" : ""}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-title-sm text-ink max-md:text-[18px]">
            <a href={`/posts/${card.slug}`} className="line-clamp-2 after:absolute after:inset-0 after:rounded-[12px]">
              {card.title}
            </a>
          </h2>
          {card.excerpt && (
            <p data-excerpt className="line-clamp-3 text-ui text-ink-muted">
              {card.excerpt}
            </p>
          )}
          <p className="flex flex-wrap items-center gap-x-2 text-caption text-ink-faint">
            <time dateTime={card.publishedAt} className="tabular-nums">
              {card.publishedAt}
            </time>
            {card.tags.map((tag) => (
              <a key={tag.slug} href={`/tags/${tag.slug}`} className="relative z-10 font-mono decoration-dashed underline-offset-4 hover:text-ink hover:underline">
                #{tag.name}
              </a>
            ))}
          </p>
        </div>
      </div>
    </article>
  );
}
