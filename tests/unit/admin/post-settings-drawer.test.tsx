import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditorPage } from "../../../src/components/admin/editor/PostEditorPage";
import type { PostView } from "../../../src/domains/post/service";

// jsdom 没有 Web Worker：预览区的渲染 Worker 换成空实现（预览由 E2E 覆盖）
class StubWorker {
  addEventListener() {}
  postMessage() {}
  terminate() {}
}

// [UT-30][UT-33][UT-34][UT-35][UT-38][SC-POSTINFO-01/04/05/06/09] 设置抽屉（admin-post-editor.md"设置抽屉"，editor module-spec §4）
beforeEach(() => {
  vi.stubGlobal("Worker", StubWorker);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 10, 9, 0)); // 本地时间 2026-10-10 09:00
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const post = (overrides: Partial<PostView>): PostView => ({
  id: "1",
  title: "旧标题",
  slug: "custom-slug",
  tags: [],
  summary: "",
  body: "",
  publishedAt: "2026-10-08",
  status: "draft",
  hasUnpublishedChanges: false,
  lastPublishedAt: null,
  cover: null,
  createdAt: "2026-10-08T00:00:00.000Z",
  updatedAt: "2026-10-08T00:00:00.000Z",
  ...overrides,
});

const field = (label: string | RegExp) => screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement;
const title = () => screen.getByRole("textbox", { name: "标题" });

describe("PostSettingsDrawer", () => {
  it("slug 跟随标题直到手动修改；中文标题提示填英文 slug；摘要计数超限变红；发布日期默认今天", () => {
    render(<PostEditorPage initial={null} />);
    const fresh = { slug: field(/^Slug/).value, summary: field("摘要").value, date: field("发布日期").value };
    fireEvent.change(title(), { target: { value: "Hello Astro 5!" } });
    const followed = field(/^Slug/).value;
    const hint = screen.getByText(/^\/posts\//).textContent;
    fireEvent.change(field(/^Slug/), { target: { value: "my-post" } });
    fireEvent.change(title(), { target: { value: "New Title" } });
    const locked = field(/^Slug/).value;
    fireEvent.change(field("摘要"), { target: { value: "字".repeat(201) } });
    const blocked = field("摘要").value.length;
    cleanup();

    render(<PostEditorPage initial={null} />);
    fireEvent.change(title(), { target: { value: "你好世界" } });
    const chinese = { slug: field(/^Slug/).value, hint: screen.getByText("请填写英文 slug").tagName };
    cleanup();

    render(<PostEditorPage initial={post({ summary: "字".repeat(201) })} />);
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    const existing = { slug: field(/^Slug/).value, date: field("发布日期").value };
    fireEvent.change(title(), { target: { value: "Changed" } });
    const counter = screen.getByText("201 / 200");

    expect({
      fresh,
      followed,
      hint,
      locked,
      blocked,
      chinese,
      existing,
      existingAfterTitle: field(/^Slug/).value,
      counter: { red: counter.className.includes("text-danger"), live: counter.getAttribute("aria-live") },
      summaryError: screen.getByText("摘要不能超过 200 字").id === field("摘要").getAttribute("aria-describedby"),
    }).toEqual({
      fresh: { slug: "", summary: "", date: "2026-10-10" },
      followed: "hello-astro-5",
      hint: "/posts/hello-astro-5 · 仅小写字母、数字、连字符",
      locked: "my-post",
      blocked: 200, // 超出部分截掉（"不可再输入"）
      chinese: { slug: "", hint: "P" },
      existing: { slug: "custom-slug", date: "2026-10-08" },
      existingAfterTitle: "custom-slug", // slug ≠ slugify(标题) 视为改过，不跟随
      counter: { red: true, live: "polite" },
      summaryError: true,
    });
  });
});
