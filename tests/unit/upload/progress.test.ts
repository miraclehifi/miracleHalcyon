import { describe, expect, it } from "vitest";
import { creep, stageProgress } from "../../../src/lib/upload/progress";

// UT-157（SC-IMAGE-12、SC-LIVE-05）：阶段区间——压缩 0–15、实况视频 15–40、上传 live ? 40–100 : 15–100；越界夹紧
describe("stageProgress", () => {
  it("各阶段按区间映射，ratio 越界夹紧", () => {
    expect([
      stageProgress("waiting", 0.7, { live: false }),
      stageProgress("compressing", 0, { live: false }),
      stageProgress("compressing", 1, { live: false }),
      stageProgress("processing-live", 0.4, { live: true }),
      stageProgress("uploading", 0, { live: false }),
      stageProgress("uploading", 0.5, { live: false }),
      stageProgress("uploading", 0, { live: true }),
      stageProgress("uploading", 0.5, { live: true }),
      stageProgress("uploading", 2, { live: true }),
      stageProgress("uploading", -1, { live: false }),
      stageProgress("done", 0, { live: false }),
    ]).toEqual([0, 0, 15, 25, 15, 57.5, 40, 70, 100, 15, 100]);
  });
});

// 没有真实进度的阶段按时间趋近：每步走剩余的 8%，到不了 1（阶段结束才跳到终点）
describe("creep", () => {
  it("单调递增、趋近但不到 1", () => {
    const steps = [0];
    for (let i = 0; i < 200; i++) steps.push(creep(steps[steps.length - 1]));
    expect({ first: steps[1], increasing: steps.every((v, i) => i === 0 || v >= steps[i - 1]), below: steps[200] < 1, near: steps[200] > 0.95 }).toEqual({
      first: 0.08,
      increasing: true,
      below: true,
      near: true,
    });
  });
});
