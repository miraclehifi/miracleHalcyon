import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// spike：ADR-001 —— 浏览器 Web Worker 中渲染万字长文，P95 < 200ms（module-spec §5）
const SOURCE = readFileSync(new URL("../fixtures/markdown/long-10k.md", import.meta.url), "utf8");
const RUNS = 20;
const P95_LIMIT_MS = 200;

interface SpikeApi {
  render(source: string): Promise<{ html: string; ms: number }>;
}

test("Web Worker 渲染 10,000 字含 10 个代码块，P95 < 200ms", async ({ page }) => {
  await page.goto("/_spike/markdown");
  await page.waitForFunction(() => "__spikeMarkdown" in window);

  const stats = await page.evaluate(
    async ({ source, runs }) => {
      const api = (window as unknown as { __spikeMarkdown: SpikeApi }).__spikeMarkdown;
      const cold = await api.render(source); // 预热：首次加载主题与语法
      const samples: number[] = [];
      for (let i = 0; i < runs; i++) {
        // 每次改一个字符，模拟持续编辑，避免命中任何按内容的缓存
        samples.push((await api.render(`${source}\n\n<!-- ${i} -->`)).ms);
      }
      samples.sort((a, b) => a - b);
      return {
        coldMs: cold.ms,
        p50: samples[Math.ceil(runs * 0.5) - 1],
        p95: samples[Math.ceil(runs * 0.95) - 1],
        codeBlocks: (cold.html.match(/class="expressive-code"/g) ?? []).length,
      };
    },
    { source: SOURCE, runs: RUNS },
  );
  console.log(`[spike-markdown-browser] cold=${stats.coldMs.toFixed(1)}ms p50=${stats.p50.toFixed(1)}ms p95=${stats.p95.toFixed(1)}ms`);

  expect({ codeBlocks: stats.codeBlocks, withinBudget: stats.p95 < P95_LIMIT_MS }).toEqual({
    codeBlocks: 10,
    withinBudget: true,
  });
});
