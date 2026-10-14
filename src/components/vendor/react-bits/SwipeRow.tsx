/*
 * SwipeRow — React Bits（https://github.com/DavidHDev/react-bits，src/ts-tailwind/Micro/SwipeRow）
 * Copyright (c) 2026 David Haz，MIT + Commons Clause License Condition v1.0
 *
 * 本项目改动（components.md"行滑动参数"）：
 * 1. 颜色 prop 接受 CSS 变量；去掉 onColor() 按 hex 推算文字色，改为显式 actionInk / drawerInk / 每个 action 的 ink
 * 2. 拖动面不画底色与内边距，卡片外框（虚线、圆角、双层错位）由 children（PostListItem）画；根节点带 group，
 *    子元素用 group-data-[shifted] / [dragging] / [open] 收回双层错位
 * 3. 卡片没有位移且不在拖动时，裁剪容器 overflow: visible、抽屉 visibility: hidden；有位移（拖动中、打开、回弹中）才裁剪
 *    （按 x 的实际值判断，收起动画播完前抽屉不会提前消失）；根节点的 overflow: hidden 只在 phase=collapsing 时生效
 * 4. 拖动过（moved）的这次 pointerup 之后吞掉一次 click；抽屉打开时点卡片只收起、不跳转；
 *    认定为拖动后才 setPointerCapture（上游在 pointerdown 即捕获，click 目标会变成拖动面，链接不跳转）
 * 5. action 支持 href：渲染为 <a>（编辑），其余仍是 <button>
 * 6. 内置切换按钮改为 IconButton/Ghost（ellipsis，aria-label 由 toggleLabel 传入）：桌面 active 或自身聚焦时显示，
 *    手机只在聚焦时显示；去掉 e.detail !== 0 判断，鼠标点击也能开合
 * 7. 键盘打开抽屉后焦点移到抽屉第一个操作（编辑）；Esc 收起并把焦点还给 ⋯；DOM 顺序改为拖动面在前、抽屉在后
 *    （Tab："标题 → ⋯ → 编辑 → 删除"），抽屉关闭时 inert
 * 8. 播报文案中文化："松手{label}"、"已展开 {n} 个操作"
 * 9. 去掉 @hugeicons/*，默认图标改 lucide Trash2；去掉 'use client'
 * 10. height 可不传（由 className 设置 --sr-h，便于按断点变化）
 * 11. 上游在渲染时读取 ref、在 effect 中同步收起，与本项目 react-hooks 规则冲突；为保持与上游一致，逐行豁免并注明
 * 12. 速度采样的时间用事件的 timeStamp（上游为 performance.now()，同一时间基准）
 * 其余逻辑（跟手、橡皮筋、甩动投影、全滑跃出、折叠）与上游一致，仅供 src/components/admin/PostListItem.tsx 使用。
 */

import React, { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { IconButton } from '../../ui/IconButton';

const HYST = 10;
const FLICK = 110;
const DECEL = 0.998;
const VMAX = 1500;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: 'spring' as const, duration: 0.3, bounce: 0 };
const DEFAULT_ACTIONS: SwipeAction[] = [{ id: 'delete', label: '删除' }];

export interface SwipeAction {
  id: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  ink?: string;
  href?: string;
  dismiss?: boolean;
  onSelect?: () => void;
}

export interface SwipeRowProps {
  children?: ReactNode;
  actions?: SwipeAction[];
  actionColor?: string;
  actionInk?: string;
  drawerColor?: string;
  drawerInk?: string;
  rowColor?: string;
  textColor?: string;
  height?: number;
  radius?: number;
  actionWidth?: number;
  direction?: 'left' | 'right';
  snapBounce?: number;
  resistance?: number;
  collapseMs?: number;
  commitAt?: number;
  fullSwipe?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (action: SwipeAction) => void;
  onCommit?: (action: SwipeAction) => void;
  closeOnAction?: boolean;
  haptic?: boolean;
  label?: string;
  toggleLabel?: string;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
}

type Sample = [number, number];
type Phase = 'idle' | 'committing' | 'collapsing';

interface Grip {
  id: number;
  x0: number;
  y0: number;
  grab: number | null;
  moved: boolean;
  hist: Sample[];
  touch: boolean;
}

interface Live {
  move: (e: PointerEvent) => void;
  up: (e: PointerEvent) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rubber = (o: number, dim: number, c: number) => (o * dim * c) / (dim + c * Math.abs(o));
const unrubber = (y: number, dim: number, c: number) => (y * dim) / (c * Math.max(1, dim - Math.abs(y)));
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL);
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0;
  const a = hist[0];
  const b = hist[hist.length - 1];
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
};
const watchWindow = (live: { current: Live }) => {
  const onMove = (e: PointerEvent) => {
    if (e.isTrusted) live.current.move(e);
  };
  const onUp = (e: PointerEvent) => {
    if (e.isTrusted) live.current.up(e);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
};

const ACTION_CLASS =
  "group/action absolute top-0 grid h-full cursor-pointer touch-manipulation place-items-center border-0 p-0 [font:inherit] no-underline outline-none select-none [width:var(--sr-a)] [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[currentColor] after:pointer-events-none after:absolute after:inset-0 after:bg-white after:opacity-0 after:content-[''] [@media(hover:hover)_and_(pointer:fine)]:after:[transition:opacity_150ms_ease] [@media(hover:hover)_and_(pointer:fine)]:hover:after:opacity-[0.08]";
const ACTION_LABEL_CLASS =
  'grid justify-items-center gap-1 text-[11px] leading-none font-medium tracking-[0.01em] [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] group-active/action:scale-[0.97] motion-reduce:group-active/action:scale-100';

const SwipeRow: React.FC<SwipeRowProps> = ({
  children,
  actions = DEFAULT_ACTIONS,
  actionColor = '#e5484d',
  actionInk = '#ffffff',
  drawerColor = '#3f3f46',
  drawerInk = '#ffffff',
  rowColor = 'transparent',
  textColor = 'inherit',
  height,
  radius = 16,
  actionWidth = 80,
  direction = 'left',
  snapBounce = 0.2,
  resistance = 0.55,
  collapseMs = 200,
  commitAt = 0.6,
  fullSwipe = true,
  disabled = false,
  open: openProp,
  onOpenChange,
  onAction,
  onCommit,
  closeOnAction = true,
  haptic = true,
  label = '列表项',
  toggleLabel = '操作',
  active = false,
  className = '',
  style
}) => {
  const uid = useId();
  const reduce = useReducedMotion();
  const s = direction === 'left' ? -1 : 1;
  const A = actionWidth;
  const n = actions.length;
  const D = n * A;
  const c = clamp(resistance, 0.05, 1);
  const primary = actions[0];
  const [openState, setOpenState] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [say, setSay] = useState('');
  const open = openProp ?? openState;

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const w = useRef(360);
  const grip = useRef<Grip | null>(null);
  const unwatch = useRef<(() => void) | null>(null);
  const live = useRef<Live>({} as Live);
  const foldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const focusRail = useRef(false);

  const x = useMotionValue(0);
  const spread = useMotionValue(0);
  const landed = useMotionValue(0);
  const commitPoint = () => Math.max(commitAt * w.current, D + A / 2);
  const canCommit = () => fullSwipe && n > 0 && commitPoint() <= w.current;
  const exposed = useTransform(x, v => s * v);
  const surfaceXf = useTransform(x, v => `translateX(${v}px)`);
  const railXf = useTransform(exposed, (e: number) => `translateX(${-s * Math.max(0, D - e)}px)`);
  const shift = useTransform([exposed, spread], ([e, p]: number[]) => p * Math.max(0, e - A));
  const blockXf = useTransform(shift, v => `translateX(${s * v}px)`);
  const glyphXf = useTransform(
    [shift, landed],
    ([v, l]: number[]) => `translateX(${-s * l * (v - (w.current - A) / 2)}px)`
  );

  const map = (raw: number) => {
    const W = w.current;
    if (raw < 0) return rubber(raw, W, c);
    if (raw <= D) return raw;
    if (!canCommit()) return D + rubber(raw - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return raw <= knee ? D + c * (raw - D) : C + rubber(raw - knee, W, c);
  };
  const inv = (ex: number) => {
    const W = w.current;
    if (ex < 0) return unrubber(ex, W, c);
    if (ex <= D) return ex;
    if (!canCommit()) return D + unrubber(ex - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return ex <= C ? D + (ex - D) / c : knee + unrubber(ex - C, W, c);
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    w.current = el.offsetWidth || w.current;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) w.current = width;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () => () => {
      clearTimeout(foldTimer.current);
      unwatch.current?.();
    },
    []
  );

  // 有位移时才裁剪、显示抽屉（本项目改动 3）
  useEffect(
    () =>
      x.on('change', v => {
        if (Math.abs(v) > 0.5) root.current?.setAttribute('data-shifted', '');
        else root.current?.removeAttribute('data-shifted');
      }),
    [x]
  );

  // 键盘打开后焦点移到抽屉第一个操作（本项目改动 7）
  useEffect(() => {
    if (!open || !focusRail.current) return;
    focusRail.current = false;
    rail.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, [open]);

  const setOpen = (next: boolean) => {
    if (next === open) return;
    setOpenState(next);
    onOpenChange?.(next);
  };
  const settle = (target: number, v = 0) => {
    heading.current = target;
    if (reduce) {
      animate(x, s * target, { duration: 0.2, ease: EASE_OUT });
      return;
    }
    const flick = Math.abs(v) >= FLICK;
    animate(
      x,
      s * target,
      flick
        ? { type: 'spring', duration: 0.4, bounce: snapBounce, velocity: s * clamp(v, -VMAX, VMAX) }
        : { ...SPRING_UI, velocity: s * v }
    );
  };
  const setSpread = (on: boolean) => {
    if ((spread.get() === 1) === on) return;
    if (reduce) spread.set(on ? 1 : 0);
    else animate(spread, on ? 1 : 0, SPRING_UI);
    if (on && primary) {
      setSay(`松手${primary.label}`);
      if (haptic && grip.current?.touch) navigator.vibrate?.(8);
    }
  };
  const commit = (a: SwipeAction, viaKey: boolean, v = 0) => {
    const leap = a === primary;
    setPhase('committing');
    setSay(a.label);
    setOpen(false);
    const fold = () => {
      setPhase('collapsing');
      foldTimer.current = setTimeout(() => {
        onCommit?.(a);
        a.onSelect?.();
      }, collapseMs);
    };
    if (viaKey || reduce) {
      if (leap && !reduce) {
        spread.set(1);
        landed.set(1);
      }
      if (viaKey) {
        x.set(s * w.current);
        fold();
      } else animate(x, s * w.current, { duration: 0.2, ease: EASE_OUT }).then(fold);
      return;
    }
    if (leap) {
      if (spread.get() < 1) animate(spread, 1, SPRING_UI);
      animate(landed, 1, SPRING_UI);
    }
    animate(x, s * w.current, { ...SPRING_UI, velocity: s * v }).then(fold);
  };
  useEffect(() => {
    if (openProp === undefined || grip.current || phase !== 'idle') return;
    const target = open ? D : 0;
    if (heading.current === target) return;
    if (Math.abs(exposed.get() - target) > 0.5) settle(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, D]);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || n === 0 || phase !== 'idle' || grip.current || e.button !== 0) return;
    if ((e.target as Element).closest?.('[data-swipe-toggle]')) return; // ⋯ 按钮自己处理点击
    swallowClick.current = false;
    x.stop();
    heading.current = null;
    grip.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      grab: null,
      moved: false,
      hist: [],
      touch: e.pointerType === 'touch'
    };
    unwatch.current?.();
    unwatch.current = watchWindow(live);
  };
  const move = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    if (g.grab === null) {
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (Math.abs(dx) < HYST || Math.abs(dx) < Math.abs(dy)) return;
      g.grab = s * (g.x0 + Math.sign(dx) * HYST) - inv(exposed.get());
      g.moved = true;
      root.current?.setAttribute('data-dragging', '');
      // 认定为拖动后才捕获指针：按下即捕获会让点击的目标变成拖动面，卡片链接不再跳转（本项目改动 4）
      try {
        surface.current?.setPointerCapture(e.pointerId);
      } catch {
        // 部分浏览器不支持对该指针捕获，忽略（上游写法）
      }
    }
    const ex = map(s * e.clientX - g.grab);
    x.set(s * ex);
    g.hist.push([e.timeStamp, ex]); // 本项目改动 12
    if (g.hist.length > 4) g.hist.shift();
    setSpread(canCommit() && ex >= commitPoint());
  };
  const up = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    unwatch.current?.();
    unwatch.current = null;
    root.current?.removeAttribute('data-dragging');
    try {
      surface.current?.releasePointerCapture(e.pointerId);
    } catch {
      // 同上
    }
    const ex = exposed.get();
    const v = velocityOf(g.hist);
    if (!g.moved) {
      if (open) {
        swallowClick.current = true; // 抽屉打开时点卡片只收起（本项目改动 4）
        setOpen(false);
        settle(0);
      }
      return;
    }
    swallowClick.current = true; // 拖动过的这次松手不触发卡片链接（本项目改动 4）
    if (primary && canCommit() && ex >= commitPoint()) {
      commit(primary, false, v);
      return;
    }
    const target = Math.abs(v) >= FLICK ? (v > 0 ? D : 0) : ex + project(v) > D / 2 ? D : 0;
    setSpread(false);
    setOpen(target === D);
    settle(target, v);
  };
  // eslint-disable-next-line react-hooks/refs -- 上游写法：窗口事件经 ref 调用最新的处理函数（见文件头改动 11）
  live.current = { move, up };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const act = (a: SwipeAction, e: React.MouseEvent<HTMLElement>) => {
    if (phase !== 'idle') return;
    onAction?.(a);
    if (a.href) return; // 链接（编辑）照常导航
    if (a === primary || a.dismiss) {
      commit(a, e.detail === 0);
      return;
    }
    a.onSelect?.();
    if (!closeOnAction) return;
    setOpen(false);
    if (e.detail === 0) {
      heading.current = 0;
      x.set(0);
    } else settle(0);
  };
  const openNow = (viaKey: boolean) => {
    heading.current = D;
    focusRail.current = viaKey;
    if (viaKey || reduce) x.set(s * D);
    else settle(D);
    setOpen(true);
    setSay(`已展开 ${n} 个操作`);
  };
  const closeNow = (viaKey: boolean) => {
    heading.current = 0;
    if (viaKey || reduce) x.set(0);
    else settle(0);
    setOpen(false);
  };
  const onToggleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || phase !== 'idle' || n === 0) return;
    const openKey = s < 0 ? 'ArrowLeft' : 'ArrowRight';
    const closeKey = s < 0 ? 'ArrowRight' : 'ArrowLeft';
    const toggleKey = e.key === 'Enter' || e.key === ' ';
    if (e.key === openKey || (toggleKey && !open)) {
      e.preventDefault();
      openNow(true);
    } else if (e.key === closeKey || e.key === 'Escape' || (toggleKey && open)) {
      e.preventDefault();
      closeNow(true);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && open && primary && canCommit()) {
      e.preventDefault();
      commit(primary, true);
    }
  };
  const onToggleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0 || disabled || phase !== 'idle' || n === 0) return; // 键盘触发的 click 已在 keydown 处理
    if (open) closeNow(false);
    else openNow(false);
  };
  // 抽屉内按 Esc 收起，焦点还给 ⋯（本项目改动 7）
  const onRailKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    closeNow(true);
    toggle.current?.focus();
  };

  const railId = `${uid}-rail`;
  const actionStyle = (a: SwipeAction, i: number): CSSProperties => ({
    ...(s < 0 ? { right: (i + 1) * A } : { left: (i + 1) * A }),
    background: a.color ?? drawerColor,
    color: a.ink ?? drawerInk
  });
  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={`group relative [height:var(--sr-h)] [transition:height_var(--sr-collapse)_cubic-bezier(0.23,1,0.32,1),margin-bottom_var(--sr-collapse)_cubic-bezier(0.23,1,0.32,1),opacity_var(--sr-collapse)_cubic-bezier(0.23,1,0.32,1)] data-[phase=collapsing]:h-0! data-[phase=collapsing]:mb-0! data-[phase=collapsing]:overflow-hidden data-[phase=collapsing]:opacity-0 data-[disabled]:pointer-events-none data-[disabled]:opacity-55${className ? ` ${className}` : ''}`}
      data-direction={direction}
      data-open={open ? '' : undefined}
      data-phase={phase}
      data-disabled={disabled ? '' : undefined}
      style={
        {
          ...(height !== undefined ? { '--sr-h': `${height}px` } : {}),
          '--sr-r': `${radius}px`,
          '--sr-a': `${A}px`,
          '--sr-row': rowColor,
          '--sr-text': textColor,
          '--sr-drawer': drawerColor,
          '--sr-action': actionColor,
          '--sr-on-action': actionInk,
          '--sr-collapse': `${collapseMs}ms`,
          ...style
        } as CSSProperties
      }
    >
      <div className="relative [height:var(--sr-h)] [border-radius:var(--sr-r)] group-data-[shifted]:overflow-hidden group-data-[dragging]:overflow-hidden group-data-[phase=committing]:overflow-hidden">
        <motion.div
          ref={surface}
          className="relative z-[1] h-full touch-pan-y [background:var(--sr-row)] [color:var(--sr-text)] [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:cursor-grab [@media(hover:hover)_and_(pointer:fine)]:group-data-[dragging]:cursor-grabbing [@media(pointer:coarse)]:select-none group-data-[dragging]:select-none group-data-[dragging]:[&_*]:select-none"
          style={{ transform: surfaceXf }}
          onPointerDown={down}
          onClickCapture={onClickCapture}
        >
          {children}
          <span
            data-swipe-toggle
            data-shown={active || open ? '' : undefined}
            className="absolute top-1/2 z-[2] -translate-y-1/2 opacity-0 transition-opacity duration-150 group-data-[direction=left]:right-3 group-data-[direction=right]:left-3 focus-within:opacity-100 data-[shown]:opacity-100 max-md:data-[shown]:opacity-0 max-md:focus-within:opacity-100"
          >
            <IconButton
              ref={toggle}
              icon="ellipsis"
              aria-label={toggleLabel}
              tabIndex={disabled ? -1 : 0}
              aria-expanded={open}
              aria-controls={railId}
              aria-keyshortcuts={s < 0 ? 'ArrowLeft' : 'ArrowRight'}
              onKeyDown={onToggleKey}
              onClick={onToggleClick}
            />
          </span>
        </motion.div>
        <motion.div
          ref={rail}
          id={railId}
          data-rail
          className="invisible absolute inset-0 overflow-hidden [border-radius:var(--sr-r)] [background:var(--sr-drawer)] group-data-[shifted]:visible group-data-[dragging]:visible group-data-[open]:visible group-data-[phase=committing]:visible"
          style={{ transform: railXf }}
          inert={!open || undefined}
          aria-hidden={!open}
          onKeyDown={onRailKey}
        >
          {actions.slice(1).map((a, i) =>
            a.href ? (
              <a key={a.id} href={a.href} className={ACTION_CLASS} style={actionStyle(a, i)} draggable={false} onClick={e => act(a, e)}>
                <span className={ACTION_LABEL_CLASS}>
                  {a.icon ? <span className="inline-flex">{a.icon}</span> : null}
                  <span>{a.label}</span>
                </span>
              </a>
            ) : (
              <button key={a.id} type="button" className={ACTION_CLASS} style={actionStyle(a, i)} onClick={e => act(a, e)}>
                <span className={ACTION_LABEL_CLASS}>
                  {a.icon ? <span className="inline-flex">{a.icon}</span> : null}
                  <span>{a.label}</span>
                </span>
              </button>
            )
          )}
          {primary ? (
            <motion.div
              className="absolute top-0 h-full w-full [background:var(--sr-action)] group-data-[direction=left]:[left:calc(100%-var(--sr-a))] group-data-[direction=right]:[right:calc(100%-var(--sr-a))]"
              style={{ transform: blockXf }}
            >
              <motion.button
                type="button"
                className={`${ACTION_CLASS} bg-transparent [color:var(--sr-on-action)] group-data-[direction=left]:left-0 group-data-[direction=right]:right-0`}
                style={{ transform: glyphXf }}
                onClick={e => act(primary, e)}
              >
                <span className={ACTION_LABEL_CLASS}>
                  <span className="inline-flex">{primary.icon ?? <Trash2 size={20} strokeWidth={2} aria-hidden="true" />}</span>
                  <span>{primary.label}</span>
                </span>
              </motion.button>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
};

export default SwipeRow;
