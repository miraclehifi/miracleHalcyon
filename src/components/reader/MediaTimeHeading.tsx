// MediaTimeHeading（components.md、"海报墙参数"）：分段标题，position: sticky; top: 0；label 为 <h2>，meta 为同行 <span>；
// 下缘 56px 挂 vendor GradualBlur：海报滚到标题下方时逐渐模糊并淡入页面底色。只在吸顶时显示（09d-s）——
// 未吸顶时这条带子会盖在本段第一排海报顶上（09d 中海报是清晰的）
import { useEffect, useRef, useState } from "react";
import { useTokenColor } from "../../lib/dom/theme";
import GradualBlur from "../vendor/react-bits/GradualBlur";

export interface MediaTimeHeadingProps {
  label: string;
  meta: string;
}

// 吸顶 = 标题贴在视口顶部，且所在分段的顶边已滚出视口
function useStuck(ref: React.RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const check = () => {
      raf = 0;
      const section = el.parentElement?.getBoundingClientRect();
      setStuck(el.getBoundingClientRect().top <= 0.5 && (section?.top ?? 0) < -0.5);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref]);
  return stuck;
}

export function MediaTimeHeading({ label, meta }: MediaTimeHeadingProps) {
  const bg = useTokenColor("bg", "#ffffff");
  const ref = useRef<HTMLDivElement>(null);
  const stuck = useStuck(ref);
  return (
    <div ref={ref} data-time-heading data-stuck={stuck ? "" : undefined} className="sticky top-0 z-[2] flex items-baseline gap-2.5 border-b border-line bg-bg pt-3.5 pb-3">
      <h2 className="text-body font-semibold text-ink">{label}</h2>
      <span className="font-mono text-caption text-ink-faint">{meta}</span>
      <div aria-hidden="true" className={`pointer-events-none absolute top-full right-0 left-0 h-14 transition-opacity duration-200 ${stuck ? "opacity-100" : "opacity-0"}`}>
        <GradualBlur position="top" target="parent" height={56} strength={2} layers={8} curve="linear" exponential tint={bg} autoHide={false} hoverIntensity={1} zIndex={1} />
      </div>
    </div>
  );
}
