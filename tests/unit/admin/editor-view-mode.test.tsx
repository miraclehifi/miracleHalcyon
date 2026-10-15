import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditorPage } from "../../../src/components/admin/editor/PostEditorPage";
import type { PostView } from "../../../src/domains/post/service";

// jsdom 没有 Web Worker：预览区的渲染 Worker 换成空实现（预览内容由 E2E 覆盖）
class StubWorker {
  addEventListener() {}
  postMessage() {}
  terminate() {}
}

// 按给定视口宽度回答 (max-width: Npx) / (min-width: Npx)，其余查询不匹配
function stubViewport(width: number) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches = max ? width <= Number(max[1]) : min ? width >= Number(min[1]) : false;
    return { matches, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false };
  });
}

beforeEach(() => {
  vi.stubGlobal("Worker", StubWorker);
  vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom 无 WebGL（Button）
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const POST: PostView = {
  id: "1",
  title: "T",
  slug: "t",
  tags: [],
  summary: "",
  body: "# 保持不变",
  status: "draft",
  hasUnpublishedChanges: false,
  publishedAt: "2026-10-10",
  lastPublishedAt: null,
  cover: null,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

const pane = (name: "编辑" | "预览") => document.querySelector<HTMLElement>(`section[aria-label="${name}"]`)!;
const visible = () => ({ editor: !pane("编辑").hidden, preview: !pane("预览").hidden });

describe("写文章页视图模式", () => {
  // [UT-52][UT-55][SC-PREVIEW-06] 宽屏：分段控件默认"并排"；切换后隐藏另一栏（不卸载），选择记在 localStorage，重新打开沿用
  it("宽屏三种视图、← / → 切换、记住选择", () => {
    stubViewport(1280);
    const { unmount } = render(<PostEditorPage initial={POST} />);
    const group = screen.getByRole("radiogroup", { name: "视图" });
    const initial = { checked: screen.getByRole("radio", { checked: true }).textContent, ...visible() };

    fireEvent.click(screen.getByRole("radio", { name: "编辑" }));
    const edit = { ...visible(), stored: localStorage.getItem("mh:editor:view") };
    fireEvent.keyDown(group, { key: "ArrowLeft" }); // 编辑 → 预览（循环）
    const preview = { ...visible(), stored: localStorage.getItem("mh:editor:view") };
    unmount();

    render(<PostEditorPage initial={POST} />);
    const reopened = { checked: screen.getByRole("radio", { checked: true }).textContent, tabs: screen.queryByRole("tablist") !== null };

    expect({ initial, edit, preview, reopened }).toEqual({
      initial: { checked: "并排", editor: true, preview: true },
      edit: { editor: true, preview: false, stored: "edit" },
      preview: { editor: false, preview: true, stored: "preview" },
      reopened: { checked: "预览", tabs: false },
    });
  });

  // [UT-52][SC-PREVIEW-06] 768–1023px 没有记录时默认"编辑"；localStorage 不可用时不报错，用默认值
  it("中等宽度默认编辑；localStorage 不可用时用默认值", () => {
    stubViewport(900);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<PostEditorPage initial={POST} />);
    const initial = { checked: screen.getByRole("radio", { checked: true }).textContent, ...visible() };
    fireEvent.click(screen.getByRole("radio", { name: "并排" }));

    expect({ initial, after: visible() }).toEqual({
      initial: { checked: "编辑", editor: true, preview: false },
      after: { editor: true, preview: true },
    });
  });

  // [UT-52][UT-55][SC-PREVIEW-07] < 768px：顶栏下方"编辑 / 预览"两个 Tab，默认"编辑"，← / → 切换；不显示分段控件
  it("窄屏 Tab 切换", () => {
    stubViewport(375);
    localStorage.setItem("mh:editor:view", "preview"); // 宽屏的选择不影响窄屏
    render(<PostEditorPage initial={POST} />);
    const tab = (name: string) => screen.getByRole("tab", { name });
    const initial = { selected: tab("编辑").getAttribute("aria-selected"), radiogroup: screen.queryByRole("radiogroup", { name: "视图" }) !== null, ...visible() };

    fireEvent.keyDown(tab("编辑"), { key: "ArrowRight" });
    const preview = { selected: tab("预览").getAttribute("aria-selected"), focused: document.activeElement === tab("预览"), ...visible() };
    fireEvent.click(tab("编辑"));

    expect({ initial, preview, back: visible(), controls: tab("编辑").getAttribute("aria-controls") === pane("编辑").id }).toEqual({
      initial: { selected: "true", radiogroup: false, editor: true, preview: false },
      preview: { selected: "true", focused: true, editor: false, preview: true },
      back: { editor: true, preview: false },
      controls: true,
    });
  });
});
