/*
 * DepthCarousel — React Bits（https://github.com/DavidHDev/react-bits，src/ts-tailwind/Components/DepthCarousel）
 * Copyright (c) 2026 David Haz，MIT + Commons Clause License Condition v1.0
 *
 * 本项目改动（components.md"灯箱层叠参数"）：
 * 1. 新增 initialIndex：首次渲染直接定位到该张、不播放动画（上游固定从第 0 张开始）
 * 2. items 每项可带 width / height：该卡片按此尺寸显示（灯箱看完整原图，上游所有卡片同尺寸 + object-cover 裁切）
 * 3. 新增 renderOverlay(item, index, focused)：在卡片内、图片之上渲染额外内容（实况照片 LiveBadge 与播放层）
 * 4. aria-label / aria-roledescription / 按钮文案改为中文，容器名称由 ariaLabel 传入
 * 5. prefers-reduced-motion 在挂载时读取并订阅变化（useReducedMotion）；上游只在 autoplay 的 effect 里读一次
 * 6. 缩放余量 120 改为 edgePadding prop（默认 120），手机传 16，当前图不再被缩到屏宽的 60%
 * 7. 不循环时第一张 / 最后一张对应方向的按钮 disabled
 * 8. 新增 apiRef：暴露 navigateBy / goTo，供 Lightbox 在对话框层面处理 ← / → 键
 * 9. 去掉 'use client' 与演示用 DEFAULT_ITEMS（items 默认为空）
 * 11. 新增 onImageError(index)：卡片图片加载失败时通知外层（灯箱显示失败与重试）
 * 10. 白色类名改为 overlay-ink 令牌或 rgb 任意值（本项目移除了 Tailwind 默认色板）；拖动速度采样用事件 timeStamp
 * 其余逻辑（gsap 补间、拖动 / 滚轮切换、景深与倾斜、亮度与模糊衰减）与上游一致，仅供 Lightbox 使用。
 */

import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { useReducedMotion } from "../../../lib/dom/theme";

export interface DepthCarouselItem {
  image: string;
  alt?: string;
  width?: number; // 改动 2：该卡片的显示尺寸
  height?: number;
}
type TiltDirection = "left" | "right";

export interface DepthCarouselApi {
  navigateBy(step: number): void;
  goTo(index: number): void;
}

export interface DepthCarouselProps {
  items?: DepthCarouselItem[];
  initialIndex?: number;
  cardWidth?: number;
  cardHeight?: number;
  edgePadding?: number;
  radius?: number;
  tint?: string;
  depth?: number;
  spread?: number;
  tilt?: number;
  tiltDirection?: TiltDirection;
  perspective?: number;
  visibleCards?: number;
  falloff?: number;
  blur?: number;
  duration?: number;
  ease?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  onChange?: (index: number, item: DepthCarouselItem) => void;
  renderOverlay?: (item: DepthCarouselItem, index: number, focused: boolean) => ReactNode;
  onImageError?: (index: number) => void;
  apiRef?: RefObject<DepthCarouselApi | null>;
  ariaLabel?: string;
  className?: string;
}

interface CarouselConfig {
  count: number;
  depth: number;
  spread: number;
  tilt: number;
  tiltDirection: TiltDirection;
  visibleCards: number;
  falloff: number;
  blur: number;
  duration: number;
  ease: string;
  loop: boolean;
  cardWidth: number;
  edgePadding: number;
  autoplayDelay: number;
}

interface DragState {
  x: number;
  startPos: number;
  lastX: number;
  lastT: number;
  v: number;
  moved: boolean;
  id: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const DepthCarousel = ({
  items = [],
  initialIndex = 0,
  cardWidth = 300,
  cardHeight = 380,
  edgePadding = 120,
  radius = 18,
  tint = "#05060a",
  depth = 220,
  spread = 90,
  tilt = 22,
  tiltDirection = "right",
  perspective = 1400,
  visibleCards = 4,
  falloff = 0.2,
  blur = 6,
  duration = 700,
  ease = "power3.out",
  autoplay = false,
  autoplayDelay = 3200,
  loop = true,
  showControls = true,
  showIndicators = true,
  onChange,
  renderOverlay,
  onImageError,
  apiRef,
  ariaLabel = "图片",
  className = "",
}: DepthCarouselProps) => {
  const data = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const count = data.length;
  const start = clamp(initialIndex, 0, Math.max(0, count - 1));

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const posRef = useRef(start); // 改动 1
  const focusRef = useRef(start);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const scaleRef = useRef(1);
  const cfgRef = useRef<CarouselConfig>({} as CarouselConfig);
  const onChangeRef = useRef(onChange);

  const dragRef = useRef<DragState | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduced = useReducedMotion(); // 改动 5
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [active, setActive] = useState(start);

  onChangeRef.current = onChange;
  cfgRef.current = { count, depth, spread, tilt, tiltDirection, visibleCards, falloff, blur, duration, ease, loop, cardWidth, edgePadding, autoplayDelay };

  const layout = useCallback((pos: number) => {
    const cfg = cfgRef.current;
    const n = cfg.count;
    if (!n) return;
    const dir = cfg.tiltDirection === "left" ? -1 : 1;
    const sc = scaleRef.current;

    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      let d = i - pos;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }

      const back = Math.max(0, d);
      const az = Math.abs(d);
      const shown = az <= cfg.visibleCards + 0.5;

      const tz = -cfg.depth * d;
      const tx = dir * cfg.spread * d;
      const ry = dir * cfg.tilt * clamp(d, 0, 1);

      let opacity = d < 0 ? Math.max(0, 1 + d) : 1;
      if (!shown) opacity = 0;

      const brightness = Math.max(0.15, 1 - back * cfg.falloff);
      const blurPx = cfg.blur > 0 ? Math.min(cfg.blur, (back / Math.max(1, cfg.visibleCards)) * cfg.blur) : 0;
      const zi = Math.round(2000 - d * 20);

      el.style.transform = `translate(-50%, -50%) scale(${sc}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      el.style.zIndex = String(zi);
      el.style.pointerEvents = shown && opacity > 0.05 ? "auto" : "none";

      const ov = overlayRefs.current[i];
      if (ov) ov.style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  }, []);

  const notify = useCallback(
    (idx: number) => {
      setActive(idx);
      onChangeRef.current?.(idx, data[idx]);
    },
    [data],
  );

  const tweenTo = useCallback(
    (target: number, animate: boolean) => {
      tweenRef.current?.kill();
      const cfg = cfgRef.current;
      const proxy = { p: posRef.current };
      const dur = animate && !reducedRef.current ? cfg.duration / 1000 : 0;
      tweenRef.current = gsap.to(proxy, {
        p: target,
        duration: dur,
        ease: cfg.ease,
        onUpdate: () => {
          posRef.current = proxy.p;
          layout(proxy.p);
        },
        onComplete: () => {
          const n = cfg.count;
          if (n > 0 && cfg.loop) posRef.current = ((posRef.current % n) + n) % n;
          layout(posRef.current);
        },
      });
    },
    [layout],
  );

  const setFocus = useCallback(
    (rawIndex: number, animate = true) => {
      const cfg = cfgRef.current;
      const n = cfg.count;
      if (!n) return;
      const idx = cfg.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
      let delta = idx - posRef.current;
      if (cfg.loop && n > 1) {
        delta = ((delta % n) + n) % n;
        if (delta > n / 2) delta -= n;
      }
      tweenTo(posRef.current + delta, animate);
      if (idx !== focusRef.current) {
        focusRef.current = idx;
        notify(idx);
      }
    },
    [tweenTo, notify],
  );

  const navigateBy = useCallback((step: number) => setFocus(focusRef.current + step, true), [setFocus]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { navigateBy, goTo: (index) => setFocus(index, true) }; // 改动 8
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, navigateBy, setFocus]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const cfg = cfgRef.current;
      const needed = cfg.cardWidth + Math.abs(cfg.spread) * 2 + cfg.edgePadding; // 改动 6
      scaleRef.current = clamp(w / needed, 0.4, 1);
      layout(posRef.current);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [layout]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cfg = cfgRef.current;
      if (cfg.count < 2) return;
      e.preventDefault();
      tweenRef.current?.kill();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = e.deltaMode === 1 ? raw * 24 : raw;
      const step = clamp(delta / (cfg.cardWidth * 0.9), -0.6, 0.6);
      posRef.current = cfg.loop ? posRef.current + step : clamp(posRef.current + step, 0, cfg.count - 1);
      layout(posRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => setFocus(Math.round(posRef.current), true), 130);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [layout, setFocus]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const cfg = cfgRef.current;
    if (cfg.count < 2) return;
    tweenRef.current?.kill();
    dragRef.current = { x: e.clientX, startPos: posRef.current, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false, id: e.pointerId };
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cfg = cfgRef.current;
      const stepPx = Math.max(cfg.cardWidth * 0.55 * scaleRef.current, 40);
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) {
        drag.moved = true;
        rootRef.current?.setPointerCapture(drag.id);
      }
      if (!drag.moved) return;
      const dt = Math.max(e.timeStamp - drag.lastT, 1);
      drag.v = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      posRef.current = drag.startPos - dx / stepPx;
      layout(posRef.current);
    },
    [layout],
  );

  const onPointerEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    const cfg = cfgRef.current;
    const stepPx = Math.max(cfg.cardWidth * 0.55 * scaleRef.current, 40);
    const projected = posRef.current - (drag.v * 180) / stepPx;
    setFocus(Math.round(projected), true);
  }, [setFocus]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateBy(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateBy(1);
      }
    },
    [navigateBy],
  );

  const onCardClick = useCallback(
    (index: number) => {
      if (dragRef.current?.moved) return;
      setFocus(index, true);
    },
    [setFocus],
  );

  useEffect(() => {
    if (!autoplay || reduced || count < 2) return;
    const root = rootRef.current;
    let hovered = false;
    let focused = false;
    const stop = () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    };
    autoTimerRef.current = setInterval(() => {
      if (!hovered && !focused) navigateBy(1);
    }, Math.max(cfgRef.current.autoplayDelay, 600));
    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);
    const onFocusIn = () => (focused = true);
    const onFocusOut = () => (focused = false);
    root?.addEventListener("mouseenter", onEnter);
    root?.addEventListener("mouseleave", onLeave);
    root?.addEventListener("focusin", onFocusIn);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      stop();
      root?.removeEventListener("mouseenter", onEnter);
      root?.removeEventListener("mouseleave", onLeave);
      root?.removeEventListener("focusin", onFocusIn);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [autoplay, autoplayDelay, count, navigateBy, reduced]);

  useEffect(() => {
    layout(posRef.current);
  }, [layout, depth, spread, tilt, tiltDirection, visibleCards, falloff, blur, cardWidth, cardHeight, radius, count]);

  useEffect(
    () => () => {
      tweenRef.current?.kill();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    },
    [],
  );

  const control =
    "absolute top-1/2 z-[3000] grid h-[42px] w-[42px] -translate-y-1/2 place-items-center rounded-full border border-[rgb(255_255_255/0.2)] bg-[rgba(18,20,26,0.55)] text-overlay-ink backdrop-blur-md transition-[background,border-color,transform,opacity] duration-200 hover:border-[rgb(255_255_255/0.4)] hover:bg-[rgba(28,31,40,0.85)] active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div
      ref={rootRef}
      className={`relative flex h-full min-h-[320px] w-full cursor-grab touch-pan-y items-center justify-center outline-none select-none [perspective-origin:50%_50%] focus-visible:rounded-xl focus-visible:outline-2 focus-visible:[outline-offset:4px] focus-visible:outline-[rgb(255_255_255/0.5)] active:cursor-grabbing ${className}`.trim()}
      style={{ perspective: `${perspective}px` }}
      role="group"
      aria-roledescription="轮播"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0 [transform-style:preserve-3d]">
        {data.map((item, i) => (
          <div
            key={i}
            data-carousel-card={i}
            className="absolute top-1/2 left-1/2 cursor-pointer overflow-hidden bg-[#0b0d12] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65),0_8px_20px_-10px_rgba(0,0,0,0.5)] [transform:translate(-50%,-50%)] [transform-origin:center] [will-change:transform,opacity,filter]"
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            style={{ width: item.width ?? cardWidth, height: item.height ?? cardHeight, borderRadius: radius }}
            aria-roledescription="图片"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={active !== i}
            onClick={() => onCardClick(i)}
          >
            <img className="block h-full w-full object-cover select-none [-webkit-user-drag:none] [pointer-events:none]" src={item.image} alt={item.alt || ""} draggable={false} onError={() => onImageError?.(i)} />
            {renderOverlay?.(item, i, active === i)}
            <span
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-multiply"
              ref={(el) => {
                overlayRefs.current[i] = el;
              }}
              style={{ background: tint }}
            />
          </div>
        ))}
      </div>

      {showControls && count > 1 && (
        <>
          <button type="button" className={`${control} left-4`} aria-label="上一张" disabled={!loop && active === 0} onClick={() => navigateBy(-1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className={`${control} right-4`} aria-label="下一张" disabled={!loop && active === count - 1} onClick={() => navigateBy(1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {showIndicators && count > 1 && (
        <div className="absolute bottom-4 left-1/2 z-[3000] flex -translate-x-1/2 gap-2 rounded-full bg-[rgba(14,16,22,0.4)] px-3 py-2 backdrop-blur-sm" role="tablist" aria-label="图片">
          {data.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`第 ${i + 1} 张`}
              className={`h-[7px] cursor-pointer rounded-full transition-[width,background] duration-[250ms] ${active === i ? "w-5 bg-overlay-ink" : "w-[7px] bg-[rgb(255_255_255/0.3)]"}`}
              onClick={() => setFocus(i, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DepthCarousel;
