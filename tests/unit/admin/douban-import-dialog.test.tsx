import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DoubanImportDialog } from "../../../src/components/admin/media/DoubanImportDialog";
import { Checkbox } from "../../../src/components/ui/Checkbox";
import { ToastProvider } from "../../../src/components/ui/Toast";

// UT-22：导入面板（admin-media.md"从豆瓣导入"，设计稿 11i）；fetch 按路径打桩
const TYPES = ["movie", "series", "book", "comic", "game", "boardgame"];
const categories = (synced: string | null) => TYPES.flatMap((type) => ["done", "doing"].map((status) => ({ type, status, watermark: synced ? "2026-10-18 08:25:08" : null, syncedAt: synced })));
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const page = (extra = {}) => ({ total: 40, head: "2026-10-18 08:25:08", nextStart: null, created: 1, updated: 0, coverFailed: 0, failed: [], ...extra });

let fetchMock: ReturnType<typeof vi.fn>;
let imports: Record<string, unknown>[];
let stateUids: (string | null)[];

function stub(handlers: { state?: (uid: string | null) => Response; page?: (body: Record<string, unknown>, n: number) => Response | Promise<Response> } = {}) {
  imports = [];
  stateUids = [];
  fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    if (url.pathname.endsWith("/import/state")) {
      stateUids.push(url.searchParams.get("uid"));
      return handlers.state ? handlers.state(url.searchParams.get("uid")) : json({ uid: null, categories: categories(null) });
    }
    if (url.pathname.endsWith("/import/finish")) return json(null, 204);
    const body = JSON.parse(String(init?.body));
    imports.push(body);
    return handlers.page ? handlers.page(body, imports.length) : json(page());
  });
  vi.stubGlobal("fetch", fetchMock);
}

const open = () =>
  render(
    <ToastProvider>
      <DoubanImportDialog open onClose={() => {}} onFinished={() => {}} />
    </ToastProvider>,
  );
const button = (name: string | RegExp) => screen.queryByRole("button", { name });

beforeEach(() => stub());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("UT-22 打开面板", () => {
  // [SC-IMPORT-01] 无同步记录：ID 为空、6 类全勾且"未同步"、只有"全量导入"
  it("首次", async () => {
    open();
    await waitFor(() => expect(stateUids).toEqual([null]));
    const boxes = screen.getAllByRole("checkbox");
    expect([boxes.length, boxes.every((b) => (b as HTMLInputElement).checked), screen.getAllByText("未同步").length]).toEqual([6, true, 6]);
    expect([(screen.getByLabelText("豆瓣用户 ID") as HTMLInputElement).value, button("全量导入") !== null, button("同步新标记")]).toEqual(["", true, null]);
  });

  // [SC-IMPORT-01][SC-IMPORT-27] 已同步过：带出 ID，主按钮"同步新标记" + 次要"全量导入"
  it("已同步过", async () => {
    stub({ state: () => json({ uid: "189806038", categories: categories("2026-10-23T13:30:00.000Z") }) });
    open();
    await waitFor(() => expect((screen.getByLabelText("豆瓣用户 ID") as HTMLInputElement).value).toBe("189806038"));
    expect([button("同步新标记") !== null, button("全量导入") !== null, screen.queryAllByText("未同步").length]).toEqual([true, true, 0]);
  });

  // 状态接口失败：按首次显示，不阻断全量导入
  it("状态接口失败", async () => {
    stub({ state: () => json({ error: { code: "X" } }, 500) });
    open();
    await waitFor(() => expect(stateUids.length).toBe(1));
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "ahbei" } });
    expect([button("全量导入")?.hasAttribute("disabled"), button("同步新标记")]).toEqual([false, null]);
  });
});

describe("UT-22 校验与重查", () => {
  // [SC-IMPORT-02] 空 / 格式错禁用；全部取消勾选 → "至少选择一个类别"
  it("ID 与类别校验", async () => {
    open();
    await waitFor(() => expect(stateUids.length).toBe(1));
    expect(button("全量导入")?.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "abc/../x" } });
    expect([screen.getByText("用户 ID 只能包含字母、数字、下划线、点和短横线") !== null, button("全量导入")?.hasAttribute("disabled")]).toEqual([true, true]);
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "ahbei" } });
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    expect([screen.getByText("至少选择一个类别") !== null, button("全量导入")?.hasAttribute("disabled")]).toEqual([true, true]);
  });

  // [SC-IMPORT-25][SC-IMPORT-27] 改成与状态 uid 不同的合法 ID → 300ms 后重查
  it("改 ID 防抖重查", async () => {
    stub({ state: (uid) => json({ uid: uid ?? "189806038", categories: categories(uid ? null : "2026-10-23T13:30:00.000Z") }) });
    open();
    await waitFor(() => expect(button("同步新标记")).not.toBeNull());
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "ahb" } });
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "ahbei" } });
    await act(async () => void (await vi.advanceTimersByTimeAsync(299)));
    const before = stateUids.length;
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)));
    vi.useRealTimers();
    await waitFor(() => expect(button("同步新标记")).toBeNull());
    expect([before, stateUids]).toEqual([1, [null, "ahbei"]]);
  });
});

describe("UT-22 导入过程", () => {
  // [SC-IMPORT-12] 第 2 页起带第 1 页的 head；进行中输入框、勾选禁用，只剩"停止"；进度 aria-live
  it("翻页带 head、进行中状态", async () => {
    let release: () => void = () => {};
    stub({
      page: (body, n) =>
        n === 1
          ? json(page({ nextStart: 20, head: "2026-10-26 20:00:00" }))
          : n === 2
            ? new Promise((r) => (release = () => r(json(page({ head: body.head as string })))))
            : json(page()),
    });
    open();
    await waitFor(() => expect(stateUids.length).toBe(1));
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "ahbei" } });
    for (const box of screen.getAllByRole("checkbox").slice(1)) fireEvent.click(box); // 只留电影
    fireEvent.click(button("全量导入")!);
    await waitFor(() => expect(imports.length).toBe(2));
    expect([
      (screen.getByLabelText("豆瓣用户 ID") as HTMLInputElement).disabled, (screen.getAllByRole("checkbox")[0] as HTMLInputElement).disabled,
      button("停止") !== null, button("全量导入"), button("关闭"), screen.getByText(/影视 · 看过/).closest("[aria-live]")?.getAttribute("aria-live"),
    ]).toEqual([true, true, true, null, null, "polite"]);
    await act(async () => release());
    await waitFor(() => expect(screen.getByText("导入完成：新增 3、更新 0、失败 0、封面失败 0")).toBeTruthy());
    expect(imports.map((b) => [b.kind, b.status, b.types, b.mode, b.start, b.head])).toEqual([
      ["movie", "done", ["movie"], "full", 0, undefined], ["movie", "done", ["movie"], "full", 20, "2026-10-26 20:00:00"], ["movie", "doing", ["movie"], "full", 0, undefined],
    ]);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/import/finish")).length).toBe(1);
  });

  // [SC-IMPORT-17] 错误 role="alert"，changed = 0 时不调用 finish
  it("错误提示", async () => {
    stub({ page: () => json({ error: { code: "DOUBAN_USER_NOT_FOUND", message: "x" } }, 404) });
    open();
    await waitFor(() => expect(stateUids.length).toBe(1));
    fireEvent.change(screen.getByLabelText("豆瓣用户 ID"), { target: { value: "nobody" } });
    fireEvent.click(button("全量导入")!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("豆瓣上找不到这个用户"));
    expect([imports.length, fetchMock.mock.calls.some(([u]) => String(u).endsWith("/import/finish"))]).toEqual([1, false]);
  });
});

describe("Checkbox", () => {
  // components.md Checkbox：选中 / 未选 / 禁用；点标签切换；hint 小字
  it("状态与点标签切换", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox label="电影" hint="未同步" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByText("电影"));
    const box = screen.getByRole("checkbox", { name: /电影/ }) as HTMLInputElement;
    expect([onChange.mock.calls[0][0], box.checked, screen.getByText("未同步").className.includes("text-ink-faint")]).toEqual([true, false, true]);
    rerender(<Checkbox label="电影" checked disabled onChange={onChange} />);
    fireEvent.click(screen.getByText("电影"));
    expect([(screen.getByRole("checkbox") as HTMLInputElement).checked, (screen.getByRole("checkbox") as HTMLInputElement).disabled, onChange.mock.calls.length]).toEqual([true, true, 1]);
  });
});
