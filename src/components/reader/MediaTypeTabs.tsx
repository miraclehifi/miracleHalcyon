// MediaTypeTabs（components.md"分类导航参数"，reader-media.md / admin-media.md）：书影音分类导航，读者页与后台列表共用。
// React 岛，内部渲染 vendor GooeyNav：每项是 <a href>（无 JS 时就是普通链接）；普通点击先播水滴动画，700ms 后整页跳转，
// 减弱动效时立即跳转。items 由页面算好传入（函数不能跨岛序列化）
import { useEffect, useRef, type CSSProperties } from "react";
import { navigate } from "../../lib/dom/navigate";
import { useColorScheme, useReducedMotion, useTokenColor } from "../../lib/dom/theme";
import GooeyNav from "../vendor/react-bits/GooeyNav";

export interface MediaTypeTabItem {
  label: string;
  href: string;
}

export interface MediaTypeTabsProps {
  items: MediaTypeTabItem[];
  activeIndex: number;
}

export const NAVIGATE_DELAY_MS = 700; // 覆盖水滴飞行：animationTime × 0.94 + timeVariance / 2

export function MediaTypeTabs({ items, activeIndex }: MediaTypeTabsProps) {
  const theme = useColorScheme();
  const reduced = useReducedMotion();
  const ink = useTokenColor("ink", "#262626");
  const bg = useTokenColor("bg", "#ffffff");
  // 动画期间再点另一项：取消前一个跳转，只跳最后点的那一项
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <GooeyNav
      items={items}
      initialActiveIndex={activeIndex}
      theme={theme}
      color={ink}
      activeTextColor={bg}
      colors={[]}
      size="sm"
      frame={false}
      animationTime={600}
      timeVariance={300}
      particleCount={12}
      spread={40}
      gooeyness={0.5}
      wobble={0.4}
      hoverEffect
      ariaLabel="书影音分类"
      data-media-tabs=""
      onNavigate={(href) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => navigate(href), reduced ? 0 : NAVIGATE_DELAY_MS);
      }}
      // 胶囊与文字走站点令牌（水合前的 CSS 胶囊随主题切换；画布颜色由 color / activeTextColor 解析）
      style={{ "--gn-font": "14px", "--gn-ink": "var(--ink)", "--gn-muted": "var(--ink-muted)", "--gn-pill": "var(--ink)", "--gn-active-ink": "var(--bg)" } as CSSProperties}
    />
  );
}
