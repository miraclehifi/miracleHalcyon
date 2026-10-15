// PostCard（components.md"读者端区块"、reader-post-list.md"文章卡片"）：1px 虚线外框；标题链接用伪元素把可点区域扩到整卡，
// 标签链接叠在其上（不嵌套）。active（由 PostCardList 的选中行传入）时显示 PostCard/Hover 双层错位——只在可悬停设备上
// 生效（触屏点按不错位），减弱动效时不移动、上层边框换成 ink-faint。有封面时右侧 128×128（手机 72，与标题同行）
import type { CardModel } from "../../lib/reader/types";

export interface PostCardProps {
  card: CardModel;
  active?: boolean;
}

const FRAME = "rounded-[12px] border border-dashed border-line-strong bg-bg transition-transform duration-300 ease-out motion-reduce:transition-none";
// 只在可悬停且未开启减弱动效时错位（两个条件合成一条媒体查询，避免变体先后顺序互相覆盖）
const SHIFT_BOTTOM = "[@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:translate-x-1 [@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:translate-y-1";
const SHIFT_TOP =
  "[@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:-translate-x-1 [@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:-translate-y-1 motion-reduce:border-ink-faint";

export function PostCard({ card, active = false }: PostCardProps) {
  const hasCover = card.cover !== null;
  return (
    <article className="relative" data-active={active || undefined}>
      <div aria-hidden="true" data-layer="bottom" className={`absolute inset-0 ${FRAME}${active ? ` ${SHIFT_BOTTOM}` : ""}`} />
      <div
        data-layer="top"
        className={`relative grid gap-y-2 p-7 max-md:px-5 max-md:py-4 ${hasCover ? "grid-cols-[minmax(0,1fr)_auto] gap-x-6 max-md:gap-x-4" : "grid-cols-1"} ${FRAME}${active ? ` ${SHIFT_TOP}` : ""}`}
      >
        <h2 className="col-start-1 row-start-1 text-title-sm text-ink max-md:self-center max-md:text-[18px]">
          <a href={`/posts/${card.slug}`} className="line-clamp-2 after:absolute after:inset-0 after:rounded-[12px]">
            {card.title}
          </a>
        </h2>
        {hasCover && (
          <img
            src={card.cover!}
            alt=""
            width={128}
            height={128}
            loading="lazy"
            decoding="async"
            className="col-start-2 row-start-1 size-32 self-start rounded-control bg-surface-sunken object-cover md:row-span-3 max-md:size-[72px]"
          />
        )}
        {card.excerpt && (
          <p data-excerpt className="col-start-1 line-clamp-3 text-ui text-ink-muted max-md:col-span-2">
            {card.excerpt}
          </p>
        )}
        <p className="col-start-1 flex flex-wrap items-center gap-x-2 text-caption text-ink-faint max-md:col-span-2">
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
    </article>
  );
}
