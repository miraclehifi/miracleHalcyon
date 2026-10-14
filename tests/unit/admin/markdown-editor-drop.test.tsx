import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "../../../src/components/admin/editor/MarkdownEditor";
import { ToastProvider } from "../../../src/components/ui/Toast";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const noop = () => {};
const fileDrag = () => ({ dataTransfer: { types: ["Files"], files: [] as File[], dropEffect: "none" } });

// [SC-IMAGE-02] UT-93：带文件拖入编辑区显示"松开以上传"，离开 / 放下后消失；拖入文字不提示
describe("MarkdownEditor 拖放高亮", () => {
  it("dragenter 显示提示，dragleave / drop 隐藏；子元素间移动不闪烁", () => {
    render(<ToastProvider><MarkdownEditor title="" body="" onTitleChange={noop} onBodyChange={noop} /></ToastProvider>);
    const area = screen.getByRole("textbox", { name: "正文" }).closest("[data-drop-zone]")!;
    const hint = () => screen.queryByText(/松开以上传/) !== null;

    fireEvent.dragEnter(area, { dataTransfer: { types: ["text/plain"] } });
    const textDrag = hint();
    fireEvent.dragEnter(area, fileDrag());
    const entered = hint();
    fireEvent.dragEnter(screen.getByRole("textbox", { name: "正文" }), fileDrag()); // 进入子元素
    fireEvent.dragLeave(area, fileDrag()); // 离开外层（仍在子元素内）
    const stillInside = hint();
    fireEvent.dragLeave(screen.getByRole("textbox", { name: "正文" }), fileDrag());
    const left = hint();
    fireEvent.dragEnter(area, fileDrag());
    fireEvent.drop(area, fileDrag());
    const dropped = hint();

    expect({ textDrag, entered, stillInside, left, dropped }).toEqual({ textDrag: false, entered: true, stillInside: true, left: false, dropped: false });
  });
});

// [SC-IMAGE-03] UT-94："插入图片"可访问名称、点击或键盘触发文件选择；文件选择只接受 png / jpg / webp / gif
describe("MarkdownEditor 插入图片", () => {
  it("按钮触发隐藏的文件输入", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(noop);
    render(<ToastProvider><MarkdownEditor title="" body="" onTitleChange={noop} onBodyChange={noop} /></ToastProvider>);
    const button = screen.getByRole("button", { name: "插入图片" });
    act(() => button.click());
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect({ disabled: button.hasAttribute("disabled"), clicks: click.mock.calls.length, accept: input.accept, multiple: input.multiple, hidden: input.hidden }).toEqual({
      disabled: false,
      clicks: 1,
      accept: "image/png,image/jpeg,image/webp,image/gif",
      multiple: true,
      hidden: true,
    });
  });
});
