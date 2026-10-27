import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecognizeBox } from "../../../src/components/admin/media/RecognizeBox";
import { applyRecognized, errorText, filledText, missingTexts } from "../../../src/lib/admin/recognize";
import { formDefaults } from "../../../src/lib/admin/shelf-form";

// 识别（admin-media.md"RecognizeBox"，UT-09、10、11）
describe("applyRecognized（UT-09）", () => {
  // [SC-RECOG-07][SC-RECOG-08][SC-RECOG-22] 只覆盖识别到的条目字段；状态、评分、日期、短评不变；缺失字段保持原值
  it("只填识别到的字段", () => {
    const form = { ...formDefaults("book", "2026-09-01"), status: "in_progress" as const, rating: 4, comment: "还行", year: "2020", title: "旧标题" };
    const { form: next, filled } = applyRecognized(form, {
      type: "book", title: "原则", creator: "瑞·达利欧", year: null, coverData: "data:image/jpeg;base64,AA==", doubanUrl: "https://book.douban.com/subject/1/", doubanId: "1",
    });
    expect(next).toEqual({ ...form, title: "原则", creator: "瑞·达利欧", doubanUrl: "https://book.douban.com/subject/1/", doubanId: "1" });
    expect(filled).toEqual(["type", "title", "cover", "creator"]);
  });
});

describe("提示文案（UT-10）", () => {
  // [SC-RECOG-03][SC-RECOG-08][SC-RECOG-13–15]
  it("已识别 / 未识别 / 错误码", () => {
    expect(filledText(["type", "title", "cover", "creator"], "book")).toBe("已识别：分类、标题、封面、作者");
    expect(filledText(["type", "title", "creator", "year"], "movie")).toBe("已识别：分类、标题、导演、年份");
    expect(missingTexts(["year"], "book")).toEqual(["未识别：年份，请手动填写"]);
    expect(missingTexts(["cover"], "book")).toEqual(["未识别：封面，可手动上传"]);
    // [TC-US02-23][SC-RECOG-20] 游戏不取豆瓣封面：提示粘贴 IGDB 链接；桌游照旧
    expect(missingTexts(["creator", "year", "cover"], "game")).toEqual(["未识别：开发商、年份，请手动填写", "未识别：封面，游戏封面请粘贴 IGDB 图片链接"]);
    expect(missingTexts(["cover"], "boardgame")).toEqual(["未识别：封面，可手动上传"]);
    expect(["NOT_DOUBAN_LINK", "NOT_SUBJECT_LINK", "FETCH_FAILED", "PARSE_FAILED", "UNKNOWN"].map(errorText)).toEqual([
      "不是豆瓣链接", "不是豆瓣条目链接，请粘贴书 / 电影 / 游戏条目的分享链接", "链接打不开", "解析不出条目信息", "识别失败，请稍后重试",
    ]);
  });
});

describe("RecognizeBox（UT-11）", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const onRecognized = vi.fn();
    render(<RecognizeBox onRecognized={onRecognized} onDuplicate={vi.fn()} />);
    return { box: screen.getByLabelText("豆瓣分享内容"), onRecognized };
  };

  // [SC-RECOG-01][SC-RECOG-16] 空白禁用；非空可用并出现清空；粘贴不自动识别；清空后聚焦
  it("空白与清空", () => {
    const { box } = setup();
    expect(screen.getByRole("button", { name: "识别" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "清空" })).toBeNull();
    fireEvent.change(box, { target: { value: "  \n " } });
    expect(screen.getByRole("button", { name: "识别" })).toHaveProperty("disabled", true);
    fireEvent.change(box, { target: { value: "https://movie.douban.com/subject/1292052/" } });
    expect(screen.getByRole("button", { name: "识别" })).toHaveProperty("disabled", false);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "清空" }));
    expect((box as HTMLTextAreaElement).value).toBe("");
    expect(document.activeElement).toBe(box);
  });

  // [SC-RECOG-17] 识别中：aria-busy、禁用、文字"识别中…"；结果区 role=status
  it("识别中与失败", async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { box } = setup();
    fireEvent.change(box, { target: { value: "https://example.com/x" } });
    fireEvent.click(screen.getByRole("button", { name: "识别" }));
    const busy = screen.getByRole("button", { name: "识别中…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy).toHaveProperty("disabled", true);
    await act(async () => resolve(Response.json({ error: { code: "NOT_DOUBAN_LINK", message: "不是豆瓣链接" } }, { status: 422 })));
    expect(screen.getByRole("status").textContent).toContain("不是豆瓣链接");
    expect(screen.getByRole("button", { name: "识别" })).toHaveProperty("disabled", false);
  });
});
