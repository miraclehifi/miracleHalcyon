import { describe, expect, it } from "vitest";
import { dominantColorFromPixels } from "../../../src/lib/upload/dominant-color";

// 由若干 [r, g, b, a, 像素数] 段拼出 RGBA 像素
function pixels(...runs: [number, number, number, number, number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [r, g, b, a, n] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return new Uint8ClampedArray(out);
}

// UT-145（SC-LIVE-01、SC-LIVE-05）
describe("dominantColorFromPixels", () => {
  it("纯色返回该颜色；黑白各半避开极值后退回全体平均；混入中间色时只取中间色；透明像素不计；6 位小写 hex", () => {
    expect([
      dominantColorFromPixels(pixels([138, 123, 108, 255, 1024])),
      dominantColorFromPixels(pixels([0, 0, 0, 255, 512], [255, 255, 255, 255, 512])),
      dominantColorFromPixels(pixels([0, 0, 0, 255, 400], [255, 255, 255, 255, 400], [168, 56, 44, 255, 224])),
      dominantColorFromPixels(pixels([10, 200, 10, 0, 900], [61, 106, 44, 255, 124])),
      dominantColorFromPixels(new Uint8ClampedArray()),
    ]).toEqual(["8a7b6c", "808080", "a8382c", "3d6a2c", "808080"]);
  });
});
