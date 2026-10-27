// MediaPoster/Front · /Hover · /Back（components.md、"海报墙参数"）：书影音海报，底层 vendor FlipCard。
// 正面只有封面（不显示状态徽标、悬停不浮出片名，poster-no-hover-title）；点击、Enter、空格翻到背面：
// 片名、评分、短评、"看过 · yyyy-MM-dd"（进行中为"在看"徽标），不显示导演。"豆瓣 ↗"是 FlipCard 的兄弟节点
// （FlipCard 根是 role="button"，里面不能嵌链接），覆盖在背面右下角，只在翻开时可点、可聚焦。
// still：服务端 / 水合前的静态网格，只渲染正面，背面详情留在 HTML 中（hidden），无 JS 时"豆瓣 ↗"由全局样式常显
// 游戏模式（ADR-013）：封面为 IGDB 原比例大图，object-fit: contain 不裁切；悬停 / 键盘聚焦时左上角淡入 PlatformBadge、
// 右下角淡入 YearBadge（仅精确指针设备，aria-hidden，平台与年份已写进翻面控件的 aria-label）；背面不显示平台
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { platformLabel, statusLabel, type ShelfPublicEntry } from "../../domains/shelf/entry";
import { useTokenColor } from "../../lib/dom/theme";
import { StarRating } from "../ui/StarRating";
import FlipCard from "../vendor/react-bits/FlipCard";
import { PlatformBadge } from "./PlatformBadge";
import { YearBadge } from "./YearBadge";

export interface MediaPosterProps {
  entry: ShelfPublicEntry;
  flipped?: boolean;
  onFlipChange?(flipped: boolean): void;
  width?: number;
  height?: number;
  still?: boolean;
}

const COMPACT_WIDTH = 190; // 手机 2 列约 167 宽：背面内边距 12、底部只显示日期

function Front({ entry }: { entry: ShelfPublicEntry }) {
  const [broken, setBroken] = useState(false);
  const missing = !entry.cover || broken;
  return (
    <div data-poster-front className="absolute inset-0 overflow-hidden rounded-[4px] bg-surface-sunken">
      {missing ? (
        <div role="img" aria-label="图片不可用" className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
          <ImageOff size={24} aria-hidden="true" className="text-ink-faint" />
          <span aria-hidden="true" className="line-clamp-2 text-meta text-ink-muted">
            {entry.title}
          </span>
        </div>
      ) : (
        <img
          src={entry.cover!}
          alt=""
          width={entry.coverWidth ?? undefined}
          height={entry.coverHeight ?? undefined}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`block h-full w-full ${entry.type === "game" ? "object-contain" : "object-cover"}`}
          onError={() => setBroken(true)}
        />
      )}
      {entry.platform && (
        <div
          data-poster-hover
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-fine:group-has-focus-visible:opacity-100"
        >
          <span data-hover-platform className="absolute top-2.5 left-2.5">
            <PlatformBadge platform={entry.platform} />
          </span>
          {entry.year && (
            <span data-hover-year className="absolute right-2.5 bottom-2.5">
              <YearBadge year={entry.year} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// 翻面控件名：游戏带平台与发售年份，"《黑神话：悟空》，PS5，2024"
function controlLabel(entry: ShelfPublicEntry): string {
  const parts = [`《${entry.title}》`];
  if (entry.type === "game" && entry.platform) parts.push(platformLabel(entry.platform));
  if (entry.type === "game" && entry.year) parts.push(String(entry.year));
  return parts.join("，");
}

// 背面底层（poster-back-filtered-cover，同 FlipCard 官网示例）：同一张封面水平镜像、灰度、30% 不透明，
// 叠 flip-surface 渐变让标题区与日期区更白、中段透出画面
function BackCover({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <>
      <img
        data-poster-back-cover
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-30 grayscale"
        onError={() => setBroken(true)}
      />
      <span aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-flip-surface/60 via-flip-surface/0 via-35% to-flip-surface/90" />
    </>
  );
}

function Back({ entry, compact }: { entry: ShelfPublicEntry; compact: boolean }) {
  const status = statusLabel(entry.type, entry.status);
  return (
    <div data-poster-back className={`relative isolate flex h-full flex-col gap-2 text-left ${compact ? "p-3" : "p-4"}`}>
      {entry.cover && (
        <div className="absolute inset-0 -z-10">
          <BackCover src={entry.cover} />
        </div>
      )}
      <p className="line-clamp-2 text-[15px] leading-[1.4] font-semibold">{entry.title}</p>
      <StarRating value={entry.rating} size="sm" readOnly />
      <p className="min-h-0 flex-1 overflow-hidden text-meta leading-[1.6] whitespace-pre-line text-ink-muted">{entry.comment}</p>
      <div className="flex h-7 shrink-0 items-center border-t border-line pt-2 pr-12">
        {entry.status === "in_progress" ? (
          <span className="rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-caption font-semibold text-accent">{status}</span>
        ) : (
          <span className="font-mono text-caption whitespace-nowrap text-ink-faint">{compact ? entry.markedOn : `${status} · ${entry.markedOn}`}</span>
        )}
      </div>
    </div>
  );
}

export function MediaPoster({ entry, flipped = false, onFlipChange, width = 200, height = 300, still = false }: MediaPosterProps) {
  const surface = useTokenColor("flip-surface", "#ffffff");
  const ink = useTokenColor("flip-ink", "#262626");
  const compact = width < COMPACT_WIDTH;
  const linkOpen = still || flipped;
  return (
    <div data-poster className="group relative h-full w-full">
      {still ? (
        <div className="relative h-full w-full">
          <Front entry={entry} />
          <div hidden aria-hidden="true">
            <Back entry={entry} compact={compact} />
          </div>
        </div>
      ) : (
        <FlipCard
          front={<Front entry={entry} />}
          back={<Back entry={entry} compact={compact} />}
          flipped={flipped}
          onFlipChange={onFlipChange}
          axis="y"
          flipOnClick
          draggable={false}
          width={width}
          height={height}
          radius={4}
          tilt
          tiltMax={8}
          hoverScale={1.02}
          glare
          glareOpacity={0.22}
          perspective={1100}
          stiffness={170}
          damping={20}
          background={surface}
          color={ink}
          shadow
          shadowColor="#000000"
          shadowOpacity={0.25}
          ariaLabel={controlLabel(entry)}
        />
      )}
      {entry.doubanUrl && (
        <a
          data-douban-link
          href={entry.doubanUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`在豆瓣查看《${entry.title}》（新标签页）`}
          aria-hidden={still ? undefined : linkOpen ? undefined : true}
          tabIndex={still || linkOpen ? 0 : -1}
          data-open={linkOpen ? "" : undefined}
          className={`absolute z-10 rounded-[4px] px-1 text-caption leading-7 text-ink-faint transition-opacity duration-200 hover:text-accent ${compact ? "right-2 bottom-2" : "right-3 bottom-3"} ${still ? "bg-flip-surface opacity-0" : flipped ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          豆瓣 ↗
        </a>
      )}
    </div>
  );
}
