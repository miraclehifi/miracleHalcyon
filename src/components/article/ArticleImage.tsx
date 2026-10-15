// ArticleImage（components.md"文章图片""图片加载参数"）：正文单图，读者端与后台预览共用。外层 RefineFrame 负责
// 加载中占位（按宽高比预留空间）、马赛克渐显与失败重试；wide 时向两侧扩出 --article-bleed（版心所在容器的内边距），
// 图注仍对齐正文。渲染期不依赖 window，可在构建时预渲染
import RefineFrame from "../vendor/react-bits/RefineFrame";
import { IMAGE_RADIUS, LOAD_LABELS, STAGE_MS, useImageLoad } from "./image-load";

export interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string; // Markdown title
  width?: number; // 原图尺寸，用来预留宽高比；外链等解析不出尺寸时不传
  height?: number;
  wide?: boolean;
}

export function ArticleImage({ src, alt, caption, width, height, wide = false }: ArticleImageProps) {
  const { status, url, imgRef, onLoad, onError, onRetry } = useImageLoad(src);

  return (
    <figure
      data-article-image=""
      data-wide={wide ? "" : undefined}
      data-loading={status === "generating" ? "" : undefined}
      className="group/article-image not-prose my-8 data-[wide]:-mx-(--article-bleed)"
    >
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
          src={url}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={onLoad}
          onError={onError}
        />
      </RefineFrame>
      {caption && (
        <figcaption className="mt-3 text-center font-prose text-meta text-ink-faint italic group-data-[wide]/article-image:px-(--article-bleed)">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
