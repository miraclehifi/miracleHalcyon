// ArticleImage（components.md"文章图片""图片加载参数"）：正文单图，读者端与后台预览共用。外层 RefineFrame 负责
// 加载中占位（按宽高比预留空间）、马赛克渐显与失败重试；wide 时向两侧扩出 --article-bleed（版心所在容器的内边距），
// 图注仍对齐正文。渲染期不依赖 window，可在构建时预渲染
import { useEffect, useRef, useState } from "react";
import RefineFrame from "../vendor/react-bits/RefineFrame";

export interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string; // Markdown title
  width?: number; // 原图尺寸，用来预留宽高比；外链等解析不出尺寸时不传
  height?: number;
  wide?: boolean;
}

type LoadStatus = "generating" | "complete" | "error";

const LABELS = { generating: "加载中", complete: "已加载", error: "加载失败" };
const STAGE_MS = 120; // 马赛克 9 层，约 1 秒变清晰
const RADIUS = 8; // radius 令牌

const withRetry = (src: string, n: number) => (n === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}retry=${n}`);

export function ArticleImage({ src, alt, caption, width, height, wide = false }: ArticleImageProps) {
  const [status, setStatus] = useState<LoadStatus>("generating");
  const [retry, setRetry] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState(src);
  if (loadedSrc !== src) {
    setLoadedSrc(src);
    setStatus("generating");
    setRetry(0);
  }
  const url = withRetry(src, retry);
  const imgRef = useRef<HTMLImageElement>(null);

  // 读者页预渲染：脚本挂载前图片可能已加载完成，load 事件不会再触发
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setStatus("complete");
  }, [url]);

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
        radius={RADIUS}
        background="var(--color-surface-sunken)"
        color="var(--color-ink)"
        stageDuration={STAGE_MS}
        labels={LABELS}
        retryLabel="重试"
        onRetry={() => {
          setRetry((n) => n + 1);
          setStatus("generating");
        }}
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
          onLoad={() => setStatus("complete")}
          onError={() => setStatus("error")}
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
