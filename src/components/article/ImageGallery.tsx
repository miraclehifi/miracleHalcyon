// ImageGallery（components.md"文章图片""组图网格参数""组图手风琴参数"）：正文组图，读者端与后台预览共用。
// grid 渲染 ChromaGrid，每个单元格用 RefineFrame 包图片（正方形裁切、马赛克渐显、失败重试）；accordion 渲染
// AccordionGallery（3–7 张，默认展开中间一张，高度按断点传入）。实况照片的播放层经 renderOverlay 叠加：网格单元格在
// 图片加载完成后、手风琴只在展开项上（不受网格聚光的灰度滤镜影响）。onImageClick 留给读者端打开 Lightbox，预览中不传。
// 渲染期不依赖 window（媒体查询、主题在服务端取默认值），可在构建时预渲染
import { useEffect, useState } from "react";
import AccordionGallery from "../vendor/react-bits/AccordionGallery";
import ChromaGrid from "../vendor/react-bits/ChromaGrid";
import RefineFrame from "../vendor/react-bits/RefineFrame";
import { NARROW_QUERY, useMediaQuery } from "../../lib/dom/media";
import { useColorScheme } from "../../lib/dom/theme";
import { IMAGE_RADIUS, LOAD_LABELS, STAGE_MS, useImageLoad } from "./image-load";
import { LivePhotoLayer, type LiveSource } from "./live-photo";

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string; // Markdown title
  width?: number;
  height?: number;
  accent?: string; // 图片主色 "#rrggbb"；无主色时卡片描边用白色
  live?: LiveSource;
}

export interface ImageGalleryProps {
  variant: "grid" | "accordion";
  images: GalleryImage[];
  caption?: string; // 组图图注；不传时由各图 title 拼成一行
  onImageClick?: (index: number) => void;
}

const ACCORDION_PHONE_QUERY = "(max-width: 520px)";
const ACCORDION_HEIGHT = { desktop: 420, phone: 640 };
const OVERLAY_INK = "#FFFFFF"; // overlay-ink：组件只收颜色字符串
const SCRIM_BASE = "#0D0D0D"; // scrim 底色

// 列数按张数：2 张 2；3 张 3；4 张 2；5–9 张 3（手机 2–4 张 2，5 张以上 3）
export function galleryColumns(count: number, narrow: boolean): number {
  if (count >= 5) return 3;
  if (narrow) return 2;
  return count === 3 ? 3 : 2;
}

function GridCell({ image, onComplete }: { image: GalleryImage; onComplete: (complete: boolean) => void }) {
  const { status, url, imgRef, onLoad, onError, onRetry } = useImageLoad(image.src);
  useEffect(() => onComplete(status === "complete"), [status, onComplete]); // 上报幂等，回调每次渲染都是新的也不会循环
  return (
    <span data-gallery-item="" data-accent={image.accent} className="block h-full w-full">
      <RefineFrame
        status={status}
        aspectRatio="1 / 1"
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
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          onLoad={onLoad}
          onError={onError}
        />
      </RefineFrame>
    </span>
  );
}

export function ImageGallery({ variant, images, caption, onImageClick }: ImageGalleryProps) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const phone = useMediaQuery(ACCORDION_PHONE_QUERY);
  const theme = useColorScheme();
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set());
  const markLoaded = (src: string, complete: boolean) =>
    setLoaded((prev) => {
      if (prev.has(src) === complete) return prev;
      const next = new Set(prev);
      if (complete) next.add(src);
      else next.delete(src);
      return next;
    });
  const groupCaption =
    caption ??
    images
      .map((image) => image.caption)
      .filter(Boolean)
      .join("；");

  if (variant === "accordion") {
    return (
      <figure data-image-gallery="accordion" data-count={images.length} className="not-prose my-8">
        <AccordionGallery
          items={images.map((image) => ({ image: image.src, label: image.caption, alt: image.alt }))}
          defaultIndex={Math.floor(images.length / 2)}
          trigger="hover"
          expandRatio={0.52}
          height={phone ? ACCORDION_HEIGHT.phone : ACCORDION_HEIGHT.desktop}
          gap={8}
          radius={IMAGE_RADIUS}
          accentColor={OVERLAY_INK}
          textColor={OVERLAY_INK}
          overlayColor={SCRIM_BASE}
          showLabels={images.some((image) => image.caption)}
          ariaLabel={groupCaption ? `组图：${groupCaption}` : "组图"}
          onActiveClick={onImageClick}
          renderOverlay={(_, index, active) => {
            const live = images[index].live;
            return active && live ? <LivePhotoLayer videoSrc={live.videoSrc} radius={IMAGE_RADIUS} /> : null;
          }}
        />
      </figure>
    );
  }

  return (
    <figure data-image-gallery="grid" data-count={images.length} className="not-prose my-8">
      <ChromaGrid
        items={images.map((image) => ({ image: image.src, alt: image.alt, accent: image.accent }))}
        columns={galleryColumns(images.length, narrow)}
        minCardWidth={100}
        gap={8}
        cardRadius={16}
        aspectRatio="1 / 1"
        reveal="spotlight"
        showInfo={false}
        frame={false}
        theme={theme}
        onItemClick={onImageClick}
        renderMedia={(_, index) => <GridCell image={images[index]} onComplete={(complete) => markLoaded(images[index].src, complete)} />}
        renderOverlay={(_, index) => {
          const { src, live } = images[index];
          return live && loaded.has(src) ? <LivePhotoLayer videoSrc={live.videoSrc} radius={IMAGE_RADIUS} /> : null;
        }}
      />
      {groupCaption && <figcaption className="mt-3 text-center font-prose text-meta text-ink-faint italic">{groupCaption}</figcaption>}
    </figure>
  );
}
