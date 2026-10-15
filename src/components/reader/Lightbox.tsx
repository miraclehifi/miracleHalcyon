// Lightbox（components.md"文章图片"`Lightbox`、reader-post-detail.md"图片与灯箱"）：scrim 底、计数、关闭、图注、下滑关闭；
// 中间内容区为 React Bits DepthCarousel（参数见 components.md"灯箱层叠参数"）。由 ArticleImagesIsland 首次打开时动态加载
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import DepthCarousel, { type DepthCarouselApi, type DepthCarouselItem } from "../vendor/react-bits/DepthCarousel";
import { OverlayButton } from "../ui/OverlayButton";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  live?: { videoSrc: string };
}

export interface LightboxProps {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
}

const PHONE_MAX = 767;
const SCRIM_BASE = "#0D0D0D"; // scrim 底色：退远卡片的着色
const SWIPE_CLOSE_PX = 120;
const SWIPE_CLOSE_SPEED = 0.5; // px/ms

function useViewport() {
  const read = () => ({ w: typeof window === "undefined" ? 1440 : window.innerWidth, h: typeof window === "undefined" ? 900 : window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

// 打开期间锁定背景滚动，补偿滚动条宽度避免页面横跳；关闭后恢复原值
function useScrollLock() {
  useLayoutEffect(() => {
    const { style } = document.body;
    const prev = { overflow: style.overflow, paddingRight: style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    style.overflow = "hidden";
    if (scrollbar > 0) style.paddingRight = `${scrollbar}px`;
    return () => {
      style.overflow = prev.overflow;
      style.paddingRight = prev.paddingRight;
    };
  }, []);
}

export function Lightbox({ images, index, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(index);
  const { w, h } = useViewport();
  const phone = w <= PHONE_MAX;
  const closeRef = useRef<HTMLButtonElement>(null);
  const apiRef = useRef<DepthCarouselApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; t: number; dy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useScrollLock();

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // 当前图：桌面高 = 视口高 − 180（最高 760），手机宽 = 屏宽 − 60；每张按原图比例定宽，看完整原图
  const maxH = phone ? Math.max(200, h - 200) : Math.min(h - 180, 760);
  const maxW = phone ? w - 60 : Math.max(320, w - 2 * (120 + 90));
  const items: DepthCarouselItem[] = images.map((image) => {
    const ratio = image.width && image.height ? image.width / image.height : 3 / 4;
    const width = Math.round(Math.min(maxW, maxH * ratio));
    return { image: image.src, alt: image.alt, width, height: Math.round(width / ratio) };
  });
  const cardWidth = phone ? w - 60 : Math.max(...items.map((item) => item.width ?? 540));

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      apiRef.current?.navigateBy(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  // 下滑关闭：纵向位移超过阈值或速度足够且纵向大于横向；横向拖动交给 DepthCarousel
  const onPointerDown = (event: PointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY, t: event.timeStamp, dy: 0, moved: false };
  };
  const onPointerMove = (event: PointerEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) s.moved = true;
    if (dy > 0 && dy > Math.abs(dx)) {
      s.dy = dy;
      if (stageRef.current) stageRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    suppressClick.current = s.moved;
    if (stageRef.current) stageRef.current.style.transform = "";
    const speed = s.dy / Math.max(event.timeStamp - s.t, 1);
    if (s.dy > SWIPE_CLOSE_PX || (s.dy > 30 && speed > SWIPE_CLOSE_SPEED)) onClose();
  };

  // 点在卡片、按钮以外的区域（遮罩）关闭；拖动后的那次点击不算
  const onStageClick = (event: MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!(event.target as HTMLElement).closest("[data-carousel-card], button")) onClose();
  };

  const caption = images[current]?.caption;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图片查看"
      data-lightbox-backdrop=""
      className="fixed inset-0 z-50 flex flex-col bg-scrim text-overlay-ink"
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 max-md:px-4 max-md:py-3">
        <p data-lightbox-counter="" aria-live="polite" className="text-ui text-overlay-ink-muted tabular-nums">
          {`${current + 1} / ${images.length}`}
        </p>
        <OverlayButton ref={closeRef} icon="x" size={phone ? 44 : 48} aria-label="关闭" onClick={onClose} />
      </div>
      <div
        ref={stageRef}
        data-lightbox-stage=""
        className="relative min-h-0 flex-1 transition-transform duration-200 ease-out"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onStageClick}
      >
        <DepthCarousel
          items={items}
          initialIndex={index}
          cardWidth={cardWidth}
          cardHeight={maxH}
          edgePadding={phone ? 16 : 120}
          radius={8}
          tint={SCRIM_BASE}
          depth={phone ? 160 : 220}
          spread={phone ? 12 : 90}
          loop={false}
          autoplay={false}
          showControls={!phone && images.length > 1}
          showIndicators={false}
          apiRef={apiRef}
          ariaLabel="文中图片"
          onChange={(i) => setCurrent(i)}
        />
      </div>
      <p className="min-h-14 px-6 py-4 text-center font-prose text-meta text-overlay-ink-muted italic">{caption}</p>
    </div>,
    document.body,
  );
}

export default Lightbox;
