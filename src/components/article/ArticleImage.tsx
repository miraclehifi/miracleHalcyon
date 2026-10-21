// ArticleImage（components.md"文章图片""图片加载参数"）：正文单图，读者端与后台预览共用。外层 RefineFrame 负责
// 加载中占位（按宽高比预留空间）、马赛克渐显与失败重试；wide 时向两侧扩出 --article-bleed（版心所在容器的内边距），
// 图注仍对齐正文；实况照片在图片加载完成后叠上播放层（LiveBadge、悬停 / 长按播放）。外链照片（external，ADR-010）先显示
// 缩略图，进入视口后换成主图（加载状态保持 complete，主图失败保留缩略图）。渲染期不依赖 window，可在构建时预渲染
import { useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import RefineFrame from "../vendor/react-bits/RefineFrame";
import { useInView, useMainFallback, useMainImages, type ExternalSource } from "./external-media";
import { IMAGE_RADIUS, LOAD_LABELS, STAGE_MS, useImageLoad } from "./image-load";
import { LivePhotoLayer, type LiveSource } from "./live-photo";

export interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string; // Markdown title
  width?: number; // 原图尺寸，用来预留宽高比；外链等解析不出尺寸时不传
  height?: number;
  wide?: boolean;
  live?: LiveSource; // 同名 .live.mp4；外链动态照片为原图 + 字节范围
  external?: ExternalSource; // 登记前缀下的外链照片：src 为原图，首屏显示 thumb
  actions?: ReactNode; // 图片右上角内侧 8px 的操作（后台预览的图片菜单）；悬停图片或焦点进入时显示
  onClick?: () => void; // 读者页打开灯箱（F-002）；传入时图片区为按钮，加载失败时不触发；预览中不传
}

export function ArticleImage({ src, alt, caption, width, height, wide = false, live, external, actions, onClick }: ArticleImageProps) {
  const { status, url, imgRef, onLoad, onError, onRetry } = useImageLoad(external?.thumb ?? src);
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, external !== undefined && status === "complete");
  const [main] = useMainImages([{ src, external }], inView);
  const { shown, onMainError } = useMainFallback(main);
  // 不用 <button> 包裹：图片区内还有重试按钮与实况播放层（悬停 / 长按），按钮里不能再放可交互元素
  const open = onClick && status !== "error" ? onClick : undefined;
  const clickable = onClick
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `查看大图：${alt}`,
        onClick: (event: MouseEvent) => {
          if ((event.target as HTMLElement).closest("button")) return; // 重试按钮
          open?.();
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          open?.();
        },
      }
    : {};

  return (
    <figure
      data-article-image=""
      data-wide={wide ? "" : undefined}
      data-live={live ? "" : undefined}
      data-loading={status === "generating" ? "" : undefined}
      className="group/article-image not-prose my-8 data-[wide]:-mx-(--article-bleed)"
    >
      <div ref={frameRef} className={`relative${onClick ? " cursor-zoom-in rounded-[8px]" : ""}`} {...clickable}>
        <RefineFrame
          status={status}
          aspectRatio={width && height ? `${width} / ${height}` : undefined}
          radius={IMAGE_RADIUS}
          background="var(--color-surface-sunken)"
          color="var(--color-ink)"
          stageDuration={STAGE_MS}
          labels={LOAD_LABELS}
          retryLabel="重试"
          onRetry={onRetry}
        >
          <img
            key={url}
            ref={imgRef}
            src={shown ?? url}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            onLoad={onLoad}
            onError={shown ? onMainError : onError}
          />
        </RefineFrame>
        {live && status === "complete" && <LivePhotoLayer {...live} radius={IMAGE_RADIUS} />}
        {actions && (
          <div className="absolute top-2 right-2 z-[3] opacity-0 transition-opacity duration-200 group-hover/article-image:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
            {actions}
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center font-prose text-meta text-ink-faint italic group-data-[wide]/article-image:px-(--article-bleed)">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
