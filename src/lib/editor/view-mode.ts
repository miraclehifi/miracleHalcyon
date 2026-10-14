// 写文章页视图模式（admin-post-editor.md"顶栏""响应式"，feature-architecture §3.1 `mh:editor:view`）
// ≥ 768px：编辑 / 并排 / 预览，选择记在 localStorage；没有记录时 ≥ 1024px 默认并排、768–1023px 默认编辑
// < 768px：编辑 / 预览两个 Tab，默认编辑，不记录（宽屏的选择也不带过来）
// 服务端渲染按宽屏并排输出，水合后按实际宽度与记录更新
import { useState, useSyncExternalStore } from "react";
import { NARROW_QUERY, useMediaQuery } from "../dom/media";

export type ViewMode = "edit" | "split" | "preview";
export type NarrowTab = "edit" | "preview";

export const VIEW_STORAGE_KEY = "mh:editor:view";
const MEDIUM_QUERY = "(max-width: 1023px)";
const VIEW_MODES: readonly string[] = ["edit", "split", "preview"] satisfies ViewMode[];

const noopSubscribe = () => () => {};

const isViewMode = (value: unknown): value is ViewMode => typeof value === "string" && VIEW_MODES.includes(value);

// 隐私模式、禁用存储时读写会抛错：当作没有记录
function readStoredView(): ViewMode | null {
  try {
    const value = localStorage.getItem(VIEW_STORAGE_KEY);
    return isViewMode(value) ? value : null;
  } catch {
    return null;
  }
}

function storeView(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    // 记不住就算了，本次会话内照常切换
  }
}

export interface EditorView {
  narrow: boolean;
  mode: ViewMode; // 实际生效的模式（窄屏时为 Tab 对应的 edit / preview）
  setWideMode(mode: ViewMode): void;
  setNarrowTab(tab: NarrowTab): void;
}

export function useEditorView(): EditorView {
  const narrow = useMediaQuery(NARROW_QUERY);
  const medium = useMediaQuery(MEDIUM_QUERY);
  const stored = useSyncExternalStore(noopSubscribe, readStoredView, () => null);
  const [chosen, setChosen] = useState<ViewMode | null>(null); // 本次切换的结果（存储不可用时也生效）
  const [tab, setTab] = useState<NarrowTab>("edit");

  const wideMode = chosen ?? stored ?? (medium ? "edit" : "split");
  return {
    narrow,
    mode: narrow ? tab : wideMode,
    setWideMode(mode) {
      setChosen(mode);
      storeView(mode);
    },
    setNarrowTab: setTab,
  };
}
