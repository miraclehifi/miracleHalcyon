// 同步滚动（editor module-spec §3）：预览顶层块带 data-line（源码起始行），编辑区用镜像元素算出这些行的 top，
// 两侧位置配对后分段线性插值；滚动一侧时设置另一侧。防回声：记下写给另一侧的 scrollTop，那一侧下一次滚动事件
// 停在该值上就是回声，忽略（不用定时锁：锁期内作者真正滚动另一侧会被吞掉）。仅并排视图启用
import { useEffect } from "react";
import { lineTops } from "./textarea-mirror";

export interface ScrollAnchor {
  line: number;
  editor: number; // 该行在编辑区内容中的 top
  preview: number; // 对应块在预览滚动容器内容中的 top
}

export interface ScrollPair {
  editor: number;
  preview: number;
}

type Side = keyof ScrollPair;

// 锚点按行排序，加上首（0, 0）尾（两侧最大 scrollTop），去掉超出范围或任一侧不递增的点
export function scrollPairs(anchors: readonly ScrollAnchor[], max: ScrollPair): ScrollPair[] {
  const pairs: ScrollPair[] = [{ editor: 0, preview: 0 }];
  for (const { editor, preview } of [...anchors].sort((a, b) => a.line - b.line)) {
    const last = pairs[pairs.length - 1];
    if (editor > last.editor && preview > last.preview && editor < max.editor && preview < max.preview) pairs.push({ editor, preview });
  }
  pairs.push({ editor: Math.max(max.editor, 0), preview: Math.max(max.preview, 0) });
  return pairs;
}

// 已知一侧的 scrollTop，求另一侧
export function interpolate(pairs: readonly ScrollPair[], top: number, from: Side): number {
  const to: Side = from === "editor" ? "preview" : "editor";
  const last = pairs[pairs.length - 1];
  if (top >= last[from]) return last[to];
  for (let i = 1; i < pairs.length; i++) {
    const a = pairs[i - 1];
    const b = pairs[i];
    if (top > b[from]) continue;
    const span = b[from] - a[from];
    return span <= 0 ? a[to] : a[to] + ((top - a[from]) / span) * (b[to] - a[to]);
  }
  return pairs[0][to];
}

// 读取两侧当前的锚点：预览按 data-line 元素，编辑区按镜像测量
function measure(textarea: HTMLTextAreaElement, preview: HTMLElement): ScrollPair[] {
  const blocks = [...preview.querySelectorAll<HTMLElement>("[data-line]")];
  const lines = blocks.map((block) => Number(block.dataset.line));
  const editorTops = lineTops(textarea, lines);
  const base = preview.getBoundingClientRect().top - preview.scrollTop;
  const anchors = blocks.map((block, i) => ({ line: lines[i], editor: editorTops[i], preview: block.getBoundingClientRect().top - base }));
  return scrollPairs(anchors, {
    editor: textarea.scrollHeight - textarea.clientHeight,
    preview: preview.scrollHeight - preview.clientHeight,
  });
}

// 两侧内容或尺寸变化后重新测量（滚动时才测，变化期间不重复算）
export function useScrollSync(getTextarea: () => HTMLTextAreaElement | null, getPreview: () => HTMLElement | null, enabled: boolean) {
  useEffect(() => {
    const textarea = getTextarea();
    const preview = getPreview();
    if (!enabled || !textarea || !preview) return;
    let pairs: ScrollPair[] | null = null;
    const echo: Partial<Record<Side, number>> = {}; // 程序写入、尚未收到滚动事件的 scrollTop
    const elements: Record<Side, HTMLElement> = { editor: textarea, preview };
    const invalidate = () => (pairs = null);

    const follow = (from: Side) => () => {
      const source = elements[from];
      const expected = echo[from];
      delete echo[from];
      if (expected !== undefined && Math.abs(source.scrollTop - expected) <= 1) return;
      pairs ??= measure(textarea, preview);
      const to: Side = from === "editor" ? "preview" : "editor";
      const target = elements[to];
      const before = target.scrollTop;
      target.scrollTop = interpolate(pairs, source.scrollTop, from);
      if (target.scrollTop !== before) echo[to] = target.scrollTop; // 读回实际值（可能被取整或夹到范围内）
    };
    const onEditorScroll = follow("editor");
    const onPreviewScroll = follow("preview");

    const mutations = new MutationObserver(invalidate);
    mutations.observe(preview, { childList: true, subtree: true, characterData: true });
    const resizes = new ResizeObserver(invalidate);
    resizes.observe(textarea);
    resizes.observe(preview);
    textarea.addEventListener("input", invalidate);
    textarea.addEventListener("scroll", onEditorScroll, { passive: true });
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });
    // 预览里的图片加载完会改变高度（load 不冒泡，在捕获阶段监听）
    preview.addEventListener("load", invalidate, true);
    return () => {
      mutations.disconnect();
      resizes.disconnect();
      textarea.removeEventListener("input", invalidate);
      textarea.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
      preview.removeEventListener("load", invalidate, true);
    };
  }, [getTextarea, getPreview, enabled]);
}
