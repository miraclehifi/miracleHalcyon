import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaEntryForm } from "../../../src/components/admin/media/MediaEntryForm";
import { formDefaults } from "../../../src/lib/admin/shelf-form";

// MediaEntryForm（admin-media.md §二）：默认值、动词随分类、前端校验、封面拒绝
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderNew = (type: "movie" | "book" = "movie") => render(<MediaEntryForm mode="new" initial={formDefaults(type, "2026-10-21")} listHref="/admin/media" />);
const save = () => fireEvent.click(screen.getByRole("button", { name: "保存" }));

describe("MediaEntryForm", () => {
  // [SC-MANAGE-04] UT-08：入口分类、状态"看过"、日期今天
  it("新增默认值", () => {
    renderNew();
    expect((screen.getByLabelText("分类") as unknown as { value: string }).value).toBe("movie");
    expect(screen.getByRole("radio", { name: "看过" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText<HTMLInputElement>("标记日期").value).toBe("2026-10-21");
    expect(screen.getByLabelText("导演")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "新增条目" })).toBeTruthy();
  });

  // [SC-MANAGE-09] 状态文字随分类；切分类保留 in_progress
  it("状态动词随分类", () => {
    renderNew();
    fireEvent.click(screen.getByRole("radio", { name: "在看" }));
    fireEvent.change(screen.getByLabelText("分类"), { target: { value: "boardgame" } });
    expect(screen.getByRole("radio", { name: "在玩" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("开发商")).toBeTruthy();
    expect(screen.getByLabelText("标记日期（开始日期）")).toBeTruthy();
  });

  // [SC-MANAGE-07][SC-MANAGE-08] UT-07：不发请求，提示并聚焦第一个出错字段，已填内容保留
  it("前端校验", () => {
    renderNew("book");
    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("作者"), { target: { value: "瑞·达利欧" } });
    save();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("请填写标题")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("标题"));
    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("年份"), { target: { value: "23" } });
    save();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("年份为 4 位数字")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("年份"));
    expect(screen.getByLabelText<HTMLInputElement>("作者").value).toBe("瑞·达利欧");
  });

  // [SC-MANAGE-10][SC-MANAGE-11] 封面：合规显示预览；svg / 超 5 MB 提示且保留原预览
  it("封面选择与拒绝", () => {
    renderNew("book");
    const input = screen.getByLabelText<HTMLInputElement>("封面");
    fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
    expect(screen.getByRole("img", { name: "封面预览" }).getAttribute("src")).toBe("blob:preview");
    fireEvent.change(input, { target: { files: [new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })] } });
    expect(screen.getByRole("alert").textContent).toContain("封面只支持 jpg / png / webp，且不超过 5 MB");
    expect(screen.getByRole("img", { name: "封面预览" })).toBeTruthy();
    const big = new File(["x"], "b.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByRole("alert").textContent).toContain("不超过 5 MB");
  });

  // [SC-RECOG-07][SC-RECOG-08] 识别接入：只填条目字段并高亮；缺失字段警告直到修改；状态 / 评分 / 短评不变
  it("识别填表", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        fields: { type: "book", title: "原则", creator: "瑞·达利欧", year: null, coverData: "data:image/jpeg;base64,/9j/", doubanUrl: "https://book.douban.com/subject/27608239/", doubanId: "27608239" },
        missing: ["year"],
      }),
    );
    renderNew("book");
    fireEvent.click(screen.getByRole("radio", { name: "在读" }));
    fireEvent.change(screen.getByLabelText("短评"), { target: { value: "还行" } });
    fireEvent.change(screen.getByLabelText("豆瓣分享内容"), { target: { value: "https://book.douban.com/subject/27608239/" } });
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "识别" })));
    expect(screen.getByLabelText<HTMLInputElement>("标题").value).toBe("原则");
    expect(screen.getByLabelText("标题").getAttribute("data-recognized")).toBe("true");
    expect(screen.getByRole("img", { name: "封面预览" }).getAttribute("src")).toMatch(/^data:image/);
    expect(screen.getByText("https://book.douban.com/subject/27608239/", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("未识别，请手动填写")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "在读" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText<HTMLTextAreaElement>("短评").value).toBe("还行");
    fireEvent.change(screen.getByLabelText("年份"), { target: { value: "2018" } });
    expect(screen.queryByText("未识别，请手动填写")).toBeNull();
  });
});
