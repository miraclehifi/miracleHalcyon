// 外链照片读取（ADR-010 第 6 点，reader module-spec §4.2"外链照片"）：主图（动态照片取原图 0…mp 偏移-1，否则原图）与
// 内嵌视频（mp 偏移起 size 字节）。浏览器直连照片存储（GitHub raw 支持 Range 与 CORS），结果转成 blob: 地址；
// 按地址缓存 Promise，正文、组图与灯箱共用，同一张图只读取一次；失败从缓存移除，下次可重试。blob 地址在页面会话内保留
import { useEffect, useState, type RefObject } from "react";

export interface ExternalSource {
  thumb: string; // 缩略图（首屏显示）
  mainBytes?: number; // 主图字节数（= 动态照片内嵌视频的偏移）；缺省时主图就是原图
}

export interface ExternalMediaDeps {
  fetch: typeof fetch;
  preload: (src: string) => Promise<void>; // 无 mainBytes 时预加载原图地址
}

// 原图地址直接交给 <img>：先在内存中加载完成，替换时不出现空白
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`image load failed: ${src}`));
    image.src = src;
  });
}

const defaultDeps = (): ExternalMediaDeps => ({ fetch: (...args) => fetch(...args), preload: preloadImage });

const cache = new Map<string, Promise<string>>();

function cached(key: string, load: () => Promise<string>): Promise<string> {
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = load();
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

async function readRange(doFetch: typeof fetch, src: string, start: number, end: number, accept: number[], type: string): Promise<string> {
  const response = await doFetch(src, { headers: { Range: `bytes=${start}-${end}` } });
  if (!accept.includes(response.status)) {
    await response.body?.cancel();
    throw new Error(`range ${start}-${end} of ${src}: ${response.status}`);
  }
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
}

// 主图：有 mainBytes 时读 0…mainBytes-1（服务端忽略 Range 回 200 整个文件也能当 JPEG 显示）；否则预加载原图，返回原图地址
export function loadMainImage(src: string, mainBytes?: number, deps: ExternalMediaDeps = defaultDeps()): Promise<string> {
  return cached(`main:${src}#${mainBytes ?? ""}`, async () => {
    if (!mainBytes) {
      await deps.preload(src);
      return src;
    }
    return readRange(deps.fetch, src, 0, mainBytes - 1, [200, 206], "image/jpeg");
  });
}

// 动态照片内嵌视频：只接受 206（200 是整个文件，不是视频）
export function loadVideoRange(src: string, range: { offset: number; size: number }, deps: ExternalMediaDeps = defaultDeps()): Promise<string> {
  return cached(`video:${src}#${range.offset}+${range.size}`, () => readRange(deps.fetch, src, range.offset, range.offset + range.size - 1, [206], "video/mp4"));
}

// 测试用：清空缓存
export function resetExternalMediaCache() {
  cache.clear();
}

const VIEWPORT_MARGIN = "200px";

// 元素进入视口（含 200px 余量）后为 true，之后不再变回 false；环境没有 IntersectionObserver 时直接为 true
export function useInView(ref: RefObject<Element | null>, enabled: boolean): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || seen || !element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { rootMargin: VIEWPORT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled, seen]);
  return seen || (enabled && typeof IntersectionObserver === "undefined");
}

// 一组外链照片的主图：start 为 true 后逐张读取，读完的返回主图地址，未读完或失败的返回 undefined（调用方显示缩略图）
export function useMainImages(items: { src: string; external?: ExternalSource }[], start: boolean): (string | undefined)[] {
  const [mains, setMains] = useState<Record<string, string>>({});
  const key = items.map((item) => (item.external ? `${item.src}|${item.external.mainBytes ?? ""}` : "")).join("\n");
  useEffect(() => {
    if (!start) return;
    let alive = true;
    for (const { src, external } of items) {
      if (!external) continue;
      loadMainImage(src, external.mainBytes).then(
        (main) => {
          if (alive) setMains((prev) => (prev[src] === main ? prev : { ...prev, [src]: main }));
        },
        () => {}, // 失败保留缩略图（BH-12）
      );
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 按 key（地址与字节数）重跑，items 每次渲染是新数组
  }, [key, start]);
  return items.map((item) => (item.external ? mains[item.src] : undefined));
}

// 主图读到了但解码失败（字节损坏等）：退回缩略图，不显示加载失败（BH-12）
export function useMainFallback(main: string | undefined) {
  const [broken, setBroken] = useState<string>();
  const shown = main && main !== broken ? main : undefined;
  return { shown, onMainError: () => setBroken(main) };
}
