/*
 * AnimatedList — React Bits（https://github.com/DavidHDev/react-bits，src/ts-tailwind/Components/AnimatedList）
 * Copyright (c) 2026 David Haz，MIT + Commons Clause License Condition v1.0
 *
 * 本项目改动（components.md"列表动效参数"）：
 * 1. 新增 bare：行不加底色、阴影、内描边和 filter，不渲染选中框（indicator / ring），也不注入主题变量；外观交给卡片
 * 2. 去掉 listbox / option / aria-activedescendant / aria-selected：容器 role="list"、行 role="listitem"，容器不再 tabIndex=0
 *    （行内有链接和按钮，选项里不能放可交互元素）
 * 3. 方向键只在焦点位于列表内时响应（去掉"鼠标悬停 + 焦点在 body"分支）；↑ / ↓ / Home / End 选中后把焦点移到该行第一个链接；
 *    去掉 Enter / 空格选择（会拦住行内链接的 Enter），也去掉内部滚动跟随（列表随页面滚动，聚焦链接时浏览器自行滚动）
 * 4. 行内元素获得焦点（focusin）时选中该行；指针离开列表且焦点不在列表内时选中清为 -1
 * 5. prefers-reduced-motion 时只渐显透明度（原 fade 仍有 4px 位移），不错开
 * 6. 删除 DEFAULT_ITEMS，items 改为必填（泛型，按 id 作 key），renderItem 必填；去掉 @hugeicons/* 依赖与内置行内容
 * 7. 引擎在没有选中框（bare）时照常运行（上游缺少选中框元素时整个效果直接退出）
 * 8. 去掉 'use client'；items 变化的同步改用 useLayoutEffect（服务端不运行）
 * 其余逻辑（入场判定、弹簧曲线、错开、首次进入视口才播放）与上游一致，仅供 src/components/admin/PostList.tsx 使用。
 */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Animation = 'pop' | 'slide' | 'fade';
type Mode = Animation | 'opacity' | 'none';
type State = 'in' | 'above' | 'below';

export interface AnimatedListProps<T extends { id: string | number }> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  initialSelectedIndex?: number;
  selectOnHover?: boolean;
  enableArrowNavigation?: boolean;
  loop?: boolean;
  animation?: Animation | 'none';
  animateOnce?: boolean;
  stagger?: number;
  showGradients?: boolean;
  fadeSize?: number;
  displayScrollbar?: boolean;
  frame?: boolean;
  bare?: boolean;
  theme?: 'dark' | 'light';
  accentColor?: string;
  radius?: number;
  gap?: number;
  width?: number | string;
  maxHeight?: number | string;
  className?: string;
  itemClassName?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

interface Engine {
  place: (snap: boolean) => void;
  syncRing: () => void;
  updateFades: () => void;
  sync: () => void;
}

const THEMES: Record<'dark' | 'light', Record<string, string>> = {
  dark: {
    '--al-frame': 'rgba(38, 35, 46, 0.66)',
    '--al-frame-edge': 'rgba(255, 255, 255, 0.08)',
    '--al-frame-highlight': 'rgba(255, 255, 255, 0.07)',
    '--al-frame-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--al-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--al-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--al-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--al-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--al-well': 'rgba(255, 255, 255, 0.08)',
    '--al-ink': '#f4f4f5',
    '--al-muted': 'rgba(244, 244, 245, 0.55)',
    '--al-thumb': 'rgba(255, 255, 255, 0.16)',
    '--al-ring': 'rgba(244, 244, 245, 0.3)',
    '--al-ring-fill': 'rgba(244, 244, 245, 0.05)',
    '--al-hover': 'brightness(1.12)',
    '--al-press': 'brightness(0.85)',
    '--al-active': 'brightness(1.16)'
  },
  light: {
    '--al-frame': 'rgba(240, 240, 243, 0.8)',
    '--al-frame-edge': 'rgba(24, 24, 27, 0.07)',
    '--al-frame-highlight': 'rgba(255, 255, 255, 0.95)',
    '--al-frame-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--al-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--al-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--al-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--al-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--al-well': 'rgba(24, 24, 27, 0.05)',
    '--al-ink': '#27272a',
    '--al-muted': 'rgba(39, 39, 42, 0.55)',
    '--al-thumb': 'rgba(24, 24, 27, 0.16)',
    '--al-ring': 'rgba(24, 24, 27, 0.28)',
    '--al-ring-fill': 'transparent',
    '--al-hover': 'brightness(0.97)',
    '--al-press': 'brightness(0.92)',
    '--al-active': 'none'
  }
};

// 隐藏态的位姿；opacity（减弱动效）不位移，只靠透明度（本项目改动 5）
const HIDDEN: Record<Exclude<Mode, 'none'>, Record<'above' | 'below', string>> = {
  pop: { above: 'translate3d(0, -12px, 0) scale(0.8)', below: 'translate3d(0, 12px, 0) scale(0.8)' },
  slide: { above: 'translate3d(0, -28px, 0) scale(0.98)', below: 'translate3d(0, 28px, 0) scale(0.98)' },
  fade: { above: 'translate3d(0, -4px, 0)', below: 'translate3d(0, 4px, 0)' },
  opacity: { above: '', below: '' }
};

const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const FADE_MASK = (() => {
  const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
  const top = steps.map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) calc(var(--al-fade-top) * ${t})`);
  const bottom = [...steps]
    .reverse()
    .map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) calc(100% - var(--al-fade-bottom) * ${t})`);
  return `linear-gradient(to bottom, ${[...top, ...bottom].join(', ')})`;
})();

const size = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

const ROOT_CLASS =
  'relative box-border w-[min(100%,var(--al-width))] min-w-0 max-w-full rounded-[calc(var(--al-radius)+12px)] text-[color:var(--al-ink)] [-webkit-tap-highlight-color:transparent]';
const FRAMED_CLASS =
  'p-[6px] [background:var(--al-frame)] [box-shadow:var(--al-frame-shadow)] backdrop-blur-[20px] backdrop-saturate-[1.6]';
const FRAME_RIM_CLASS =
  'pointer-events-none absolute inset-0 z-[3] rounded-[inherit] [box-shadow:inset_0_0_0_1px_var(--al-frame-edge),inset_0_1px_0_var(--al-frame-highlight)]';
const VIEWPORT_CLASS =
  'relative box-border overflow-x-hidden overflow-y-auto overscroll-contain rounded-[calc(var(--al-radius)+6px)] p-[6px] outline-none [--al-fade-bottom:0px] [--al-fade-top:0px]';
const BARE_VIEWPORT_CLASS = 'relative box-border outline-none';
const SCROLLBAR_CLASS =
  '[scrollbar-width:thin] [scrollbar-color:var(--al-thumb)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-[color:var(--al-thumb)]';
const BARE_CLASS = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const ITEM_CLASS =
  'relative box-border flex min-w-0 cursor-pointer items-center gap-3 rounded-[var(--al-radius)] py-[10px] pr-[14px] pl-[10px] text-[color:var(--al-ink)] select-none [background:var(--al-tile)] [box-shadow:var(--al-tile-shadow)] [[data-animated]_&:not([data-state])]:opacity-0 hover:[filter:var(--al-hover)] active:[filter:var(--al-press)] data-[selected]:not-active:[filter:var(--al-active)]';
const BARE_ITEM_CLASS = 'relative box-border min-w-0 [[data-animated]_&:not([data-state])]:opacity-0';
const RIM_CLASS =
  'pointer-events-none absolute inset-0 rounded-[inherit] [box-shadow:inset_0_0_0_1px_var(--al-tile-edge),inset_0_1px_0_var(--al-tile-highlight)]';
const INDICATOR_CLASS =
  'pointer-events-none absolute top-0 right-0 left-0 z-[2] h-0 opacity-0 transition-opacity duration-200 ease-[ease]';
const RING_CLASS =
  'absolute inset-0 rounded-[var(--al-radius)] [background:var(--al-ring-fill)] [box-shadow:inset_0_0_0_1px_var(--al-ring)]';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function AnimatedList<T extends { id: string | number }>({
  items,
  renderItem,
  onItemSelect,
  initialSelectedIndex = -1,
  selectOnHover = true,
  enableArrowNavigation = true,
  loop = false,
  animation = 'pop',
  animateOnce = false,
  stagger = 0.05,
  showGradients = true,
  fadeSize = 56,
  displayScrollbar = true,
  frame = true,
  bare = false,
  theme = 'dark',
  accentColor,
  radius = 14,
  gap = 8,
  width = 420,
  maxHeight = 440,
  className = '',
  itemClassName = '',
  style,
  'aria-label': ariaLabel
}: AnimatedListProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<Engine | null>(null);
  const keyboardRef = useRef(false);
  const navigatingRef = useRef(false);
  const [selected, setSelected] = useState(initialSelectedIndex);
  const settingsRef = useRef({ items, selected, selectOnHover, enableArrowNavigation, loop, animation, animateOnce, stagger, showGradients, fadeSize });
  useIsomorphicLayoutEffect(() => {
    settingsRef.current = { items, selected, selectOnHover, enableArrowNavigation, loop, animation, animateOnce, stagger, showGradients, fadeSize };
  });

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const indicator = indicatorRef.current; // bare 时没有选中框（本项目改动 7）
    const ring = ringRef.current;
    if (!root || !viewport || !track) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const springEase = CSS.supports?.('transition-timing-function', 'linear(0, 1)')
      ? SPRING
      : 'cubic-bezier(0.34, 1.4, 0.64, 1)';
    const transition = `transform 620ms ${springEase}, opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease`;
    const motion = { y: 0, h: 0, vy: 0, vh: 0, ty: 0, th: 0, ready: false };
    const fades = { top: '', bottom: '' };
    let boxes: (number[] | null)[] = [];
    let current: Mode | null = null;
    let entered = false;
    let raf = 0;
    let last = 0;

    const mode = (): Mode => {
      const chosen = settingsRef.current.animation;
      if (chosen === 'none' || !HIDDEN[chosen]) return 'none';
      return reduced ? 'opacity' : chosen;
    };

    const apply = (element: HTMLElement, state: State) => {
      element.dataset.state = state;
      const hidden = current !== null && current !== 'none' && state !== 'in';
      element.style.transform = hidden ? HIDDEN[current as Exclude<Mode, 'none'>][state as 'above' | 'below'] : '';
      element.style.opacity = hidden ? '0' : '';
    };

    const syncRing = () => {
      if (!ring) return;
      const item = itemRefs.current[settingsRef.current.selected];
      if (!item) return;
      const state = (item.dataset.state as State | undefined) || 'in';
      if (state === ring.dataset.state) return;
      ring.style.transitionDelay = item.style.transitionDelay;
      apply(ring, state);
    };

    const write = () => {
      if (!indicator) return;
      indicator.style.transform = `translate3d(0, ${motion.y.toFixed(2)}px, 0)`;
      indicator.style.height = `${motion.h.toFixed(2)}px`;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const omega = 30;
      const zeta = 0.78;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        motion.vy += (omega * omega * (motion.ty - motion.y) - 2 * zeta * omega * motion.vy) * h;
        motion.vh += (omega * omega * (motion.th - motion.h) - 2 * zeta * omega * motion.vh) * h;
        motion.y += motion.vy * h;
        motion.h += motion.vh * h;
      }
      const moving =
        Math.abs(motion.ty - motion.y) > 0.05 ||
        Math.abs(motion.th - motion.h) > 0.05 ||
        Math.abs(motion.vy) + Math.abs(motion.vh) > 0.5;
      if (!moving) {
        motion.y = motion.ty;
        motion.h = motion.th;
        motion.vy = motion.vh = 0;
      }
      write();
      if (moving) raf = requestAnimationFrame(frame);
    };

    const place = (snap: boolean) => {
      if (!indicator) return;
      const item = itemRefs.current[settingsRef.current.selected];
      if (!item) {
        indicator.style.opacity = '0';
        motion.ready = false;
        return;
      }
      indicator.style.opacity = '1';
      motion.ty = item.offsetTop;
      motion.th = item.offsetHeight;
      if (snap || reduced || !motion.ready) {
        motion.y = motion.ty;
        motion.h = motion.th;
        motion.vy = motion.vh = 0;
        motion.ready = true;
        write();
        return;
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const updateFades = () => {
      const s = settingsRef.current;
      const span = Math.max(1, s.fadeSize);
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const top = s.showGradients ? Math.min(span, Math.max(0, scrollTop)) : 0;
      const bottom = s.showGradients ? Math.min(span, Math.max(0, scrollHeight - clientHeight - scrollTop)) : 0;
      const nextTop = `${top.toFixed(1)}px`;
      const nextBottom = `${bottom.toFixed(1)}px`;
      if (nextTop !== fades.top) {
        fades.top = nextTop;
        viewport.style.setProperty('--al-fade-top', nextTop);
      }
      if (nextBottom !== fades.bottom) {
        fades.bottom = nextBottom;
        viewport.style.setProperty('--al-fade-bottom', nextBottom);
      }
    };

    const measure = () => {
      const offset = track.offsetTop;
      boxes = itemRefs.current.map(item => (item ? [offset + item.offsetTop, item.offsetHeight] : null));
    };

    const reveal = (entrance: boolean) => {
      if (!entered) return;
      const s = settingsRef.current;
      const top = viewport.scrollTop;
      const view = viewport.clientHeight;
      const stepDelay = reduced ? 0 : Math.max(0, s.stagger); // 减弱动效时不错开（本项目改动 5）
      let order = 0;
      itemRefs.current.forEach((item, index) => {
        const box = boxes[index];
        if (!item || !box) return;
        const start = box[0] - top;
        const overlap = Math.min(view, start + box[1]) - Math.max(0, start);
        const hidden =
          current !== 'none' && overlap < Math.min(box[1], view) * 0.5 && !(s.animateOnce && item.dataset.seen);
        const state = hidden ? (start + box[1] / 2 < view / 2 ? 'above' : 'below') : 'in';
        if (state === item.dataset.state) return;
        const delay = entrance && !hidden ? (order++ * stepDelay).toFixed(3) : 0;
        item.style.transitionDelay = Number(delay) ? `${delay}s, ${delay}s, 0s` : '';
        if (!hidden) item.dataset.seen = 'true';
        apply(item, state);
      });
      syncRing();
    };

    const sync = () => {
      const s = settingsRef.current;
      itemRefs.current.length = s.items.length;
      const elements = itemRefs.current.filter((item): item is HTMLDivElement => Boolean(item));
      const next = mode();
      const changed = next !== current;
      const restyle = changed ? elements : elements.filter(item => !item.dataset.state);
      current = next;
      if (current === 'none') entered = true;
      if (restyle.length) {
        const targets = changed && ring ? [...restyle, ring] : restyle;
        for (const element of targets) element.style.transition = 'none';
        for (const item of restyle)
          apply(item, current === 'none' ? 'in' : (item.dataset.state as State | undefined) || 'below');
        if (changed && ring) apply(ring, (itemRefs.current[s.selected]?.dataset.state as State | undefined) || 'in');
        void root.offsetHeight;
        for (const element of targets) element.style.transition = transition;
      }
      measure();
      reveal(restyle.length > 0);
    };

    sync();

    const gate =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries, observer) => {
              if (!entries.some(entry => entry.isIntersecting)) return;
              observer.disconnect();
              if (entered) return;
              entered = true;
              measure();
              reveal(true);
            },
            { rootMargin: '0px 0px -10% 0px' }
          );
    if (!entered) {
      if (gate) gate.observe(root);
      else {
        entered = true;
        reveal(true);
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      place(true);
      updateFades();
      measure();
      reveal(false);
    });
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);

    const onScroll = () => {
      updateFades();
      reveal(false);
    };

    // 方向键只在焦点位于列表内时响应（本项目改动 3）
    const onKey = (event: KeyboardEvent) => {
      const s = settingsRef.current;
      if (!s.enableArrowNavigation || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const active = document.activeElement;
      if (!active || !track.contains(active)) return;
      const count = s.items.length;
      if (!count) return;
      const index = s.selected;
      let next: number | null = null;
      if (event.key === 'ArrowDown') next = index < 0 ? 0 : index + 1;
      else if (event.key === 'ArrowUp') next = index < 0 ? count - 1 : index - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = count - 1;
      if (next === null) return;
      event.preventDefault();
      next = s.loop ? (next + count) % count : Math.min(count - 1, Math.max(0, next));
      keyboardRef.current = true;
      navigatingRef.current = true;
      setSelected(next);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!navigatingRef.current) return;
      navigatingRef.current = false;
      const item = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-index]') : null;
      if (item && root.contains(item) && settingsRef.current.selectOnHover) setSelected(Number(item.dataset.index));
    };

    // 指针离开列表且焦点不在列表内时复原（本项目改动 4）
    const onLeave = () => {
      if (!root.contains(document.activeElement)) setSelected(-1);
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !root.contains(next)) {
        if (!root.matches(':hover')) setSelected(-1);
      }
    };

    viewport.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('focusout', onFocusOut);

    updateFades();
    place(true);
    syncRing();

    engineRef.current = { place, syncRing, updateFades, sync };

    return () => {
      cancelAnimationFrame(raf);
      gate?.disconnect();
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('focusout', onFocusOut);
      engineRef.current = null;
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    engineRef.current?.sync();
  }, [items, animation]);

  // 键盘选中后把焦点移到该行第一个可聚焦元素（标题链接）（本项目改动 3）
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.place(false);
    engine.syncRing();
    if (!keyboardRef.current) return;
    keyboardRef.current = false;
    itemRefs.current[selected]?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [selected]);

  useEffect(() => {
    engineRef.current?.updateFades();
  }, [showGradients, fadeSize, maxHeight, gap]);

  const hover = (index: number) => {
    if (!navigatingRef.current) setSelected(index);
  };

  const choose = (item: T, index: number) => {
    setSelected(index);
    onItemSelect?.(item, index);
  };

  return (
    <div
      ref={rootRef}
      className={`${ROOT_CLASS} ${frame && !bare ? FRAMED_CLASS : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      data-animated={animation !== 'none' ? '' : undefined}
      style={
        {
          ...(bare ? {} : (THEMES[theme] ?? THEMES.dark)),
          '--al-radius': `${Math.max(0, radius)}px`,
          '--al-gap': `${Math.max(0, gap)}px`,
          '--al-width': size(width),
          ...(bare
            ? {}
            : {
                '--al-accent': accentColor || 'var(--al-ink)',
                ...(accentColor
                  ? { '--al-ring': accentColor, '--al-ring-fill': `color-mix(in srgb, ${accentColor} 8%, transparent)` }
                  : {})
              }),
          ...style
        } as CSSProperties
      }
    >
      <div
        ref={viewportRef}
        className={bare ? BARE_VIEWPORT_CLASS : `${VIEWPORT_CLASS} ${displayScrollbar ? SCROLLBAR_CLASS : BARE_CLASS}`}
        style={{
          maxHeight: size(maxHeight),
          maskImage: showGradients ? FADE_MASK : undefined,
          WebkitMaskImage: showGradients ? FADE_MASK : undefined
        }}
      >
        <div ref={trackRef} role="list" aria-label={ariaLabel} className="relative flex flex-col gap-[var(--al-gap)]">
          {items.map((item, index) => {
            const isSelected = index === selected;
            return (
              <div
                key={item.id}
                ref={element => {
                  itemRefs.current[index] = element;
                }}
                className={`${bare ? BARE_ITEM_CLASS : ITEM_CLASS} ${itemClassName}`.trim()}
                role="listitem"
                data-index={index}
                data-selected={isSelected ? '' : undefined}
                onPointerEnter={selectOnHover ? () => hover(index) : undefined}
                onFocus={() => setSelected(index)}
                onClick={() => choose(item, index)}
              >
                {renderItem(item, index, isSelected)}
                {!bare && <span className={RIM_CLASS} aria-hidden="true" />}
              </div>
            );
          })}
          {!bare && (
            <span ref={indicatorRef} className={INDICATOR_CLASS} aria-hidden="true">
              <span ref={ringRef} className={RING_CLASS} />
            </span>
          )}
        </div>
      </div>
      {frame && !bare && <span className={FRAME_RIM_CLASS} aria-hidden="true" />}
    </div>
  );
}

export default AnimatedList;
