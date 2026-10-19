import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoragePage } from "../../../src/components/admin/storage/StoragePage";
import { StatCard } from "../../../src/components/ui/StatCard";

// [F-006 UT-02][UT-03][UT-04] 存储页统计区（admin-storage.md"状态"）
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const summary = (over: Partial<Record<string, number>> = {}) => ({
  orphanImageCount: 12,
  orphanImageBytes: 18_450_120,
  orphanVideoCount: 3,
  orphanVideoBytes: 8_102_340,
  totalOrphanBytes: 26_552_460,
  protectedCount: 2,
  ...over,
});
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

function stubFetch(...responses: (() => Promise<Response>)[]) {
  const fetch = vi.fn();
  for (const response of responses) fetch.mockImplementationOnce(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const cleanButton = () => screen.getByRole("button", { name: "一键清理未引用资源" });
const cardText = (label: string) => screen.getByText(label).closest("dl")!.textContent;

describe("StatCard", () => {
  it("[UT-02] 标签、主数字、副行；highlight 标记；loading 时不显示数字", () => {
    render(
      <>
        <StatCard label="未引用图片" value="12 张" detail="17.6 MB" />
        <StatCard label="预计可释放" value="25.3 MB" highlight />
        <StatCard label="加载中" value="0 张" loading />
      </>,
    );
    expect({
      plain: cardText("未引用图片"),
      highlight: screen.getByText("预计可释放").closest("dl")!.dataset.highlight,
      loading: cardText("加载中"),
    }).toEqual({ plain: "未引用图片12 张17.6 MB", highlight: "true", loading: "加载中" });
  });
});

describe("StoragePage", () => {
  it("[UT-02][TC-US01-01] 打开即检测：三项统计、保护期提示、清理按钮可用", async () => {
    const fetch = stubFetch(async () => ok({ summary: summary(), checkedAt: "2026-10-16T06:32:00.000Z" }));
    render(<StoragePage />);

    await waitFor(() => expect(cardText("未引用图片")).toBe("未引用图片12 张17.6 MB"));
    expect({
      url: fetch.mock.calls[0][0],
      videos: cardText("未引用实况视频"),
      total: cardText("预计可释放"),
      protectedNote: screen.getByText("近 24 小时上传的 2 项不参与清理") !== null,
      disabled: cleanButton().hasAttribute("disabled"),
    }).toEqual({ url: "/api/admin/storage/orphans", videos: "未引用实况视频3 个7.7 MB", total: "预计可释放25.3 MB", protectedNote: true, disabled: false });
  });

  it("[UT-03][TC-US01-12] 没有未引用资源：良好状态、按钮禁用、合计不高亮；保护期为 0 不显示提示", async () => {
    stubFetch(async () => ok({ summary: summary({ orphanImageCount: 0, orphanImageBytes: 0, orphanVideoCount: 0, orphanVideoBytes: 0, totalOrphanBytes: 0, protectedCount: 0 }), checkedAt: "2026-10-16T06:32:00.000Z" }));
    render(<StoragePage />);

    await screen.findByText("存储状态良好，无未引用文件");
    expect({
      disabled: cleanButton().hasAttribute("disabled"),
      highlight: screen.getByText("预计可释放").closest("dl")!.dataset.highlight,
      protectedNote: screen.queryByText(/不参与清理/),
      images: cardText("未引用图片"),
    }).toEqual({ disabled: true, highlight: undefined, protectedNote: null, images: "未引用图片0 张0 MB" });
  });

  it("[UT-04][TC-US01-14][TC-US01-15] 加载中 aria-busy 且按钮禁用；失败显示错误、清理禁用；重新检测后恢复", async () => {
    let fail!: () => void;
    stubFetch(
      () => new Promise<Response>((resolve) => (fail = () => resolve(new Response("{}", { status: 500 })))),
      async () => ok({ summary: summary(), checkedAt: "2026-10-16T06:40:00.000Z" }),
    );
    render(<StoragePage />);
    const stats = screen.getByRole("region", { name: "未引用资源" });
    const loading = { busy: stats.getAttribute("aria-busy"), recheck: screen.getAllByRole("button", { name: "重新检测" })[0].hasAttribute("disabled"), clean: cleanButton().hasAttribute("disabled") };

    fail();
    const alert = await screen.findByRole("alert");
    const failed = { alert: alert.textContent, clean: cleanButton().hasAttribute("disabled"), recheck: screen.getAllByRole("button", { name: "重新检测" })[0].hasAttribute("disabled") };
    fireEvent.click(screen.getAllByRole("button", { name: "重新检测" })[0]);
    await waitFor(() => expect(within(screen.getByRole("region", { name: "未引用资源" })).getByText("12 张")).toBeTruthy());

    expect({ loading, failed, alertGone: screen.queryByRole("alert") }).toEqual({
      loading: { busy: "true", recheck: true, clean: true },
      failed: { alert: "检测失败，请重试", clean: true, recheck: false },
      alertGone: null,
    });
  });
});
