// MediaPosterWall（components.md"海报墙参数"，reader-media.md"海报墙""按时间分段"）：电影、剧集、游戏满宽海报墙，React 岛（client:load）。
// 砖块比例按 posterAspect：电影、剧集 2:3，游戏按封面原始比例（无封面 3:4），高 = 列宽 ÷ 比值，封面加载失败时尺寸不变。
// 服务端 / 水合前渲染 [data-poster-static] 静态网格（Masonry 在服务端量不到宽度）；挂载后换成 vendor Masonry 并播放入场。
// 受控"当前翻开的海报"（最多一张，跨分段），Esc 翻回；"按时间"开关存 localStorage media:by-time，按钮经 portal 挂到页面槽位
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ShelfPublicEntry } from "../../domains/shelf/entry";
import { posterAspect } from "../../lib/reader/shelf";
import { groupByTime } from "../../lib/reader/shelf-time";
import Masonry, { type MasonryItem } from "../vendor/react-bits/Masonry";
import { MediaPoster } from "./MediaPoster";
import { MediaTimeHeading } from "./MediaTimeHeading";
import { MediaTimeToggle } from "./MediaTimeToggle";

export interface MediaPosterWallProps {
  entries: ShelfPublicEntry[]; // 已按 sortPublic 排序
}

export const BY_TIME_KEY = "media:by-time";
const NARROW = 600; // 容器宽 < 600px 时固定 2 列
const DESKTOP = "(min-width: 768px)";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readByTime(): boolean {
  try {
    return localStorage.getItem(BY_TIME_KEY) === "1";
  } catch {
    return false;
  }
}

function writeByTime(value: boolean) {
  try {
    localStorage.setItem(BY_TIME_KEY, value ? "1" : "0");
  } catch {
    // 只是个人偏好，存不了就算了
  }
}

const aspectOf = (entry: ShelfPublicEntry) => posterAspect(entry.type, entry.cover ? { width: entry.coverWidth, height: entry.coverHeight } : null);
const ratioOf = (entry: ShelfPublicEntry) => aspectOf(entry).split(" / ").map(Number) as [number, number];

const pad = (n: number) => String(n).padStart(2, "0");
const localToday = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// 按断点选一个按钮槽：桌面在分类标签行右端，手机在标题行计数右侧
function useToggleSlot(enabled: boolean): Element | null {
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const query = window.matchMedia(DESKTOP);
    const pick = () => setSlot(document.querySelector(`[data-time-toggle-slot="${query.matches ? "desktop" : "mobile"}"]`));
    pick();
    query.addEventListener("change", pick);
    return () => query.removeEventListener("change", pick);
  }, [enabled]);
  return slot;
}

export function MediaPosterWall({ entries }: MediaPosterWallProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [byTime, setByTime] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const slot = useToggleSlot(mounted && entries.length > 0);

  // 挂载后才读偏好、换成 Masonry：服务端与水合首帧都输出静态网格，避免水合不一致
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 只在挂载时执行一次
    setByTime(readByTime());
    setMounted(true);
  }, []);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!mounted || !root) return undefined;
    const observer = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    observer.observe(root);
    setWidth(Math.round(root.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    if (openId === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const ids = new Map(entries.map((entry, i) => [entry, String(i)]));
  const changeByTime = (value: boolean) => {
    setByTime(value);
    setOpenId(null);
    writeByTime(value);
  };

  if (!mounted) {
    return (
      <ul data-poster-static className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 max-[600px]:grid-cols-2">
        {entries.map((entry) => (
          <li key={ids.get(entry)} data-poster-title={entry.title} style={{ aspectRatio: aspectOf(entry) }}>
            <MediaPoster entry={entry} still />
          </li>
        ))}
      </ul>
    );
  }

  const wall = (list: ShelfPublicEntry[], segment?: string) => {
    const items: MasonryItem[] = list.map((entry) => {
      const [width, height] = ratioOf(entry);
      return { id: ids.get(entry)!, img: entry.cover ?? "", width, height, title: entry.title };
    });
    const byId = new Map(list.map((entry) => [ids.get(entry)!, entry]));
    return (
      <Masonry
        items={items}
        columns={width < NARROW ? 2 : "auto"}
        columnWidth={200}
        gap={16}
        radius={4}
        animateFrom="bottom"
        stagger={0.04}
        duration={0.6}
        bounce={0.15}
        blurToFocus
        revealOnScroll
        hoverEffect="none"
        focusOnHover={false}
        captions="none"
        parallax={0}
        lightbox={false}
        draggable={false}
        data-poster-segment={segment}
        renderTile={(item, { w, h }) => {
          const id = String(item.id);
          return (
            <MediaPoster
              entry={byId.get(id)!}
              width={w}
              height={h}
              flipped={openId === id}
              onFlipChange={(next) => setOpenId((current) => (next ? id : current === id ? null : current))}
            />
          );
        }}
      />
    );
  };

  return (
    <div ref={rootRef} data-poster-wall data-by-time={byTime ? "" : undefined}>
      {width > 0 &&
        (byTime ? (
          <div className="flex flex-col gap-7">
            {groupByTime(entries, localToday()).map((group) => (
              <section key={group.key} className="flex flex-col gap-4">
                <MediaTimeHeading label={group.label} meta={group.meta} />
                {wall(group.entries, group.key)}
              </section>
            ))}
          </div>
        ) : (
          wall(entries)
        ))}
      {slot && createPortal(<MediaTimeToggle pressed={byTime} onChange={changeByTime} />, slot)}
    </div>
  );
}
