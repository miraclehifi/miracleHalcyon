/// <reference lib="webworker" />
// 后台预览的 Web Worker 入口（module-spec §4）：主线程发 { seq, source }，回 { seq, html }；
// 渲染出错时回 { seq, error: true }，每个请求都有回应，主线程不会一直等在"渲染中"
import { renderMarkdown } from "./render";

export interface RenderRequest {
  seq: number;
  source: string;
}

export type RenderResponse = { seq: number; html: string } | { seq: number; error: true };

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener("message", async (event: MessageEvent<RenderRequest>) => {
  const { seq, source } = event.data;
  try {
    const { html } = await renderMarkdown(source);
    self.postMessage({ seq, html } satisfies RenderResponse);
  } catch (error) {
    console.error("预览渲染失败", error);
    self.postMessage({ seq, error: true } satisfies RenderResponse);
  }
});
