/// <reference lib="webworker" />
// 后台预览的 Web Worker 入口（module-spec §4）：主线程发 { seq, source }，回 { seq, html }
import { renderMarkdown } from "./render";

export interface RenderRequest {
  seq: number;
  source: string;
}

export interface RenderResponse {
  seq: number;
  html: string;
}

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener("message", async (event: MessageEvent<RenderRequest>) => {
  const { seq, source } = event.data;
  const { html } = await renderMarkdown(source);
  self.postMessage({ seq, html } satisfies RenderResponse);
});
