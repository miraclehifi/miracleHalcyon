import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UploadCard } from "../../../src/components/admin/editor/UploadCard";

// UT-159（SC-IMAGE-01、SC-IMAGE-12）：UploadCard（components.md"业务区块"，admin-post-editor"上传进度卡片"）
afterEach(cleanup);

const read = () => {
  const card = screen.getByTestId("upload-card");
  const bar = screen.queryByRole("progressbar");
  return {
    state: card.dataset.state,
    group: card.getAttribute("role") === "group" && card.getAttribute("aria-label"),
    stage: card.querySelector("[aria-live]")?.textContent,
    text: card.textContent?.replace(/\s+/g, " ").trim(),
    thumb: card.querySelector("img")?.getAttribute("src") ?? null,
    progress: bar?.getAttribute("aria-valuenow") ?? null,
    barLabel: bar?.getAttribute("aria-label") ?? null,
  };
};

describe("UploadCard", () => {
  it("等待中：文案、进度 0、有缩略图", () => {
    render(<UploadCard state="waiting" fileName="a.png" thumbUrl="blob:a" progress={0} onRemove={() => undefined} />);
    expect(read()).toEqual({ state: "waiting", group: "a.png", stage: "等待中…", text: "等待中…a.png", thumb: "blob:a", progress: "0", barLabel: "a.png 上传进度" });
  });

  it("压缩中：阶段文案在 aria-live 区域，进度取整", () => {
    render(<UploadCard state="compressing" fileName="large-photo.jpg" thumbUrl="blob:p" progress={7.4} onRemove={() => undefined} />);
    expect(read()).toMatchObject({ state: "compressing", stage: "正在压缩…", progress: "7" });
  });

  it("上传中：显示百分比，但 aria-live 区域只含阶段名（不逐个百分比播报）", () => {
    render(<UploadCard state="uploading" fileName="shot.png" thumbUrl="blob:s" progress={75.2} onRemove={() => undefined} />);
    expect(read()).toMatchObject({ state: "uploading", stage: "正在上传…", text: "正在上传… 75%shot.png", progress: "75" });
  });

  // UT-159 error 态（SC-IMAGE-07、SC-IMAGE-10、SC-IMAGE-11）：红框、原因、重试 / 移除，没有进度条
  it("失败：红框、danger 原因文案、重试与移除按钮可点，没有进度条", () => {
    const calls: string[] = [];
    render(<UploadCard state="error" fileName="shot.png" thumbUrl="blob:s" progress={40} error="网络中断" onRetry={() => calls.push("retry")} onRemove={() => calls.push("remove")} />);
    const card = screen.getByTestId("upload-card");
    screen.getByRole("button", { name: "重试" }).click();
    screen.getByRole("button", { name: "移除" }).click();
    expect({
      state: card.dataset.state,
      border: card.classList.contains("border-danger"),
      reason: screen.getByText("网络中断").classList.contains("text-danger"),
      stage: card.querySelector("[aria-live]")?.textContent,
      progressbar: screen.queryByRole("progressbar"),
      calls,
    }).toEqual({ state: "error", border: true, reason: true, stage: "网络中断", progressbar: null, calls: ["retry", "remove"] });
  });

  // UT-159 interrupted 态（SC-IMAGE-19）：没有任务的孤立占位——"上传已中断"，只有"移除"，无缩略图和进度条
  it("已中断：只有移除，没有重试、缩略图和进度条", () => {
    const calls: string[] = [];
    render(<UploadCard state="interrupted" fileName="" progress={0} onRetry={() => calls.push("retry")} onRemove={() => calls.push("remove")} />);
    const card = screen.getByTestId("upload-card");
    screen.getByRole("button", { name: "移除" }).click();
    expect({
      state: card.dataset.state,
      stage: card.querySelector("[aria-live]")?.textContent,
      buttons: screen.getAllByRole("button").map((b) => b.textContent),
      thumb: card.querySelector("img"),
      progressbar: screen.queryByRole("progressbar"),
      calls,
    }).toEqual({ state: "interrupted", stage: "上传已中断", buttons: ["移除"], thumb: null, progressbar: null, calls: ["remove"] });
  });

  // UT-159 processing-live（SC-LIVE-16）：处理实况视频阶段有 onStillOnly 时显示"仅转为静态图"；上传阶段不显示
  it("处理实况视频：仅转为静态图按钮只在该阶段出现", () => {
    const calls: string[] = [];
    const { rerender } = render(<UploadCard state="processing-live" fileName="IMG_1.jpg" thumbUrl="blob:l" progress={22} onStillOnly={() => calls.push("still")} onRemove={() => undefined} />);
    const stage = read().stage;
    screen.getByRole("button", { name: "仅转为静态图" }).click();
    rerender(<UploadCard state="uploading" fileName="IMG_1.jpg" thumbUrl="blob:l" progress={45} onStillOnly={() => calls.push("still")} onRemove={() => undefined} />);
    expect({ stage, calls, after: screen.queryByRole("button", { name: "仅转为静态图" }) }).toEqual({ stage: "正在处理实况视频…", calls: ["still"], after: null });
  });

  it("成功淡出：leaving 时加上透明过渡类；没有缩略图时不渲染 img", () => {
    render(<UploadCard state="uploading" fileName="b.png" progress={100} leaving onRemove={() => undefined} />);
    const card = screen.getByTestId("upload-card");
    expect({ leaving: card.classList.contains("opacity-0"), thumb: card.querySelector("img") }).toEqual({ leaving: true, thumb: null });
  });
});
