// StarRating（components.md、"评分动效参数"；admin-media.md"StarRating"）：5 颗表情星，累计点亮前 N 颗，其余灰色占位。
// 参考 CodePen Stars rating animation（aaroniker，references/code/stars-rating-animation），jQuery + SCSS 改写为 React + CSS：
// - 表情改为 SVG 画在星形同一 viewBox（0 0 36 34）里，大小两档等比缩放；眼睛、嘴的坐标取原作 CSS 伪元素的位置
// - 原作只亮当前一颗；这里累计点亮，途经的星按高光到达的先后逐颗点亮 / 熄灭（transition-delay）
// - 原作没有空值：首次选择不滑动；再点当前星取消评分
// 只读 `size="sm"`：读者端展示，无动画，`role="img"`；空值不渲染（调用方保留列宽）
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useReducedMotion } from "../../lib/dom/theme";

const STAR_PATH =
  "M19.6859343,0.861782958 L24.8136328,8.05088572 C25.0669318,8.40601432 25.4299179,8.6717536 25.8489524,8.80883508 L34.592052,11.6690221 C35.6704701,12.021812 36.2532905,13.1657829 35.8938178,14.2241526 C35.8056709,14.4836775 35.6647294,14.7229267 35.4795411,14.9273903 L29.901129,21.0864353 C29.5299163,21.4962859 29.3444371,22.0366367 29.3872912,22.5833831 L30.1116131,31.8245163 C30.1987981,32.9368499 29.3506698,33.9079379 28.2172657,33.993502 C27.9437428,34.0141511 27.6687736,33.9809301 27.4085205,33.8957918 L18.6506147,31.0307612 C18.2281197,30.8925477 17.7713439,30.8925477 17.3488489,31.0307612 L8.59094317,33.8957918 C7.51252508,34.2485817 6.34688429,33.6765963 5.98741159,32.6182265 C5.90066055,32.3628116 5.86681029,32.0929542 5.88785051,31.8245163 L6.61217242,22.5833831 C6.65502653,22.0366367 6.46954737,21.4962859 6.09833466,21.0864353 L0.519922484,14.9273903 C-0.235294755,14.0935658 -0.158766688,12.8167745 0.690852706,12.0755971 C0.899189467,11.8938516 1.14297067,11.7555303 1.40741159,11.6690221 L10.1505113,8.80883508 C10.5695458,8.6717536 10.9325319,8.40601432 11.1858308,8.05088572 L16.3135293,0.861782958 C16.9654141,-0.0521682813 18.2488096,-0.274439442 19.1800736,0.365326425 C19.3769294,0.500563797 19.5481352,0.668586713 19.6859343,0.861782958 Z";
const SHADOW_PATH =
  "M18.7022469,29.7633426 L29.1611722,33.6861584 C28.8859085,33.8576358 28.5650147,33.9672494 28.2172657,33.993502 C27.9437428,34.0141511 27.6687736,33.9809301 27.4085205,33.8957918 L18.6506147,31.0307612 C18.2281197,30.8925477 17.7713439,30.8925477 17.3488489,31.0307612 L8.59094317,33.8957918 C7.98083887,34.0953792 7.34281791,33.9989813 6.83864817,33.6859784 L17.2977531,29.7633426 C17.7505234,29.5935537 18.2494766,29.5935537 18.7022469,29.7633426 Z";

// 嘴：1 难过、2 无、3 一字、4 微笑、5 张嘴笑（填充）
const MOUTHS: Record<number, { d: string; filled?: boolean } | null> = {
  1: { d: "M14.5 21.5 A5 5 0 0 1 21.5 21.5" },
  2: null,
  3: { d: "M15 20.5 H21" },
  4: { d: "M14.5 19.5 A5 5 0 0 0 21.5 19.5" },
  5: { d: "M15 20 H21 A3 3 0 0 1 15 20 Z", filled: true },
};

const SLIDE_MS = 800; // 原作全程 0.8s，期间点击忽略
const LIGHT_DELAY_MS = 240; // 高光起滑前的停顿
const LIGHT_SPAN_MS = 300; // 高光滑行时长（途经的星按比例延迟点亮）

function Face({ n, stroke }: { n: number; stroke: number }) {
  const mouth = MOUTHS[n];
  return (
    <g className="star-face" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round">
      <g className="star-eyes">
        {n === 5 ? (
          <path d="M11.9 17.6 L13.5 16 L15.1 17.6 M20.4 17.6 L22 16 L23.6 17.6" />
        ) : (
          <>
            <rect x="13" y="15" width="2" height="2" rx="1" fill="currentColor" stroke="none" />
            <rect x="21" y="15" width="2" height="2" rx="1" fill="currentColor" stroke="none" />
          </>
        )}
      </g>
      {mouth && <path d={mouth.d} fill={mouth.filled ? "currentColor" : "none"} stroke={mouth.filled ? "none" : "currentColor"} />}
    </g>
  );
}

function Star({ n, lit, stroke }: { n: number; lit: boolean; stroke: number }) {
  return (
    <svg viewBox="0 0 36 34" className="block h-full w-full overflow-visible" aria-hidden="true">
      <path d={STAR_PATH} className={`star-body ${lit ? "text-rating-star" : "text-input-border"}`} fill="currentColor" />
      <path d={SHADOW_PATH} fill={lit ? "rgb(0 0 0 / 0.2)" : "rgb(0 0 0 / 0.04)"} />
      <g className={lit ? "text-rating-face" : "text-line"}>
        <Face n={n} stroke={stroke} />
      </g>
    </svg>
  );
}

export interface StarRatingProps {
  value: number | null;
  onChange?(value: number | null): void;
  size?: "md" | "sm"; // sm 对应设计稿 /Small，不是 variant
  readOnly?: boolean;
  label?: string;
}

interface Slide {
  from: number; // 1–5
  to: number;
}

export function StarRating({ value, onChange, size = "md", readOnly = false, label = "我的评分" }: StarRatingProps) {
  if (size === "sm" && readOnly) return value == null ? null : <SmallStars value={value} />;
  return <InteractiveStars value={value} onChange={onChange} label={label} />;
}

function SmallStars({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`评分 ${value} / 5`} className="inline-flex shrink-0 gap-[2px] align-middle">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} data-star="" data-lit={n <= value ? "" : undefined} className="block h-[15px] w-4">
          <Star n={n} lit={n <= value} stroke={1.35} />
        </span>
      ))}
    </span>
  );
}

function InteractiveStars({ value, onChange, label }: { value: number | null; onChange?(value: number | null): void; label: string }) {
  const reduced = useReducedMotion();
  const [slide, setSlide] = useState<Slide | null>(null);
  const [pulse, setPulse] = useState(0); // 递增以重播"选中后"动画
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const slider = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // 高光从旧星滑到新星（Web Animations；jsdom 无 animate 时跳过）
  useEffect(() => {
    if (!slide) return;
    const from = items.current[slide.from - 1];
    const to = items.current[slide.to - 1];
    const el = slider.current;
    if (!from || !to || !el || typeof el.animate !== "function") return;
    el.animate([{ transform: `translateX(${from.offsetLeft}px)` }, { transform: `translateX(${to.offsetLeft}px)` }], {
      duration: LIGHT_SPAN_MS,
      delay: LIGHT_DELAY_MS,
      easing: "cubic-bezier(0, 0, 0.265, 1.1)",
      fill: "both",
    });
  }, [slide]);

  const select = (n: number) => {
    if (slide || !onChange) return;
    if (n === value) {
      onChange(null);
      return;
    }
    onChange(n);
    if (reduced) return;
    if (value == null) {
      setPulse((p) => p + 1);
      return;
    }
    setSlide({ from: value, to: n });
    timer.current = setTimeout(() => {
      setSlide(null);
      setPulse((p) => p + 1);
    }, SLIDE_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, n: number) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      select(n);
      return;
    }
    const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = step > 0 ? Math.min(5, (value ?? 0) + 1) : Math.max(1, (value ?? 1) - 1);
    if (next === value || slide) return;
    select(next);
    items.current[next - 1]?.focus();
  };

  // 途经的星：按与起点的距离延迟换色，随高光到达逐颗点亮 / 熄灭
  const delayOf = (n: number) => {
    if (!slide || slide.from === slide.to) return undefined;
    const ratio = (n - slide.from) / (slide.to - slide.from);
    return ratio > 0 && ratio <= 1 ? `${Math.round(LIGHT_DELAY_MS + LIGHT_SPAN_MS * ratio)}ms` : undefined;
  };
  const direction = slide ? (slide.to > slide.from ? "right" : "left") : undefined;
  const focusIndex = value ?? 1;

  return (
    <div className="flex items-center gap-4">
      <ul
        role="radiogroup"
        aria-label={label}
        className="star-rating relative m-0 flex list-none gap-4 p-0 max-md:gap-3"
        data-slide={direction}
        data-reduced={reduced ? "" : undefined}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const lit = value != null && n <= value;
          const current = n === value && !slide;
          return (
            <li
              key={n}
              ref={(el) => void (items.current[n - 1] = el)}
              role="radio"
              aria-checked={n === value}
              aria-label={`${n} 星`}
              tabIndex={n === focusIndex ? 0 : -1}
              data-lit={lit ? "" : undefined}
              data-current={current ? "" : undefined}
              data-pulse={current && pulse > 0 ? "" : undefined}
              data-move={slide?.from === n ? "from" : slide?.to === n ? "to" : undefined}
              data-n={n}
              style={{ "--star-delay": delayOf(n) } as CSSProperties}
              className="star-rating-item relative h-[34px] w-9 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 max-md:h-[26px] max-md:w-7"
              onClick={() => select(n)}
              onKeyDown={(e) => onKeyDown(e, n)}
            >
              <span key={current ? pulse : 0} className="star-rating-face block h-full w-full">
                {(n === 4 || n === 5) && <span className="star-rating-sparks" aria-hidden="true" />}
                <Star n={n} lit={lit} stroke={1} />
              </span>
            </li>
          );
        })}
        {slide && (
          <span ref={slider} className="star-rating-slider pointer-events-none absolute top-0 left-0 h-[34px] w-9 max-md:h-[26px] max-md:w-7" aria-hidden="true">
            <span className="star-rating-stretch block h-full w-full">
              <Star n={slide.to} lit stroke={1} />
            </span>
          </span>
        )}
      </ul>
      <span className="font-mono text-caption text-ink-faint tabular-nums">{value == null ? "未评分" : `${value} / 5`}</span>
    </div>
  );
}
