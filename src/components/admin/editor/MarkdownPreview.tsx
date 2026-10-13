// MarkdownPreview（components.md，admin-post-editor.md"预览区"，markdown module-spec §4）：正文在 Web Worker 中渲染
// 主线程发 { seq, source }，只采用最新 seq；渲染中又有输入时只保留最后一次，避免长文连续输入时排队
// 视图切换、同步滚动、窄屏 Tab 在 Sprint 2 接入
import { useEffect, useRef, useState } from "react";
import type { RenderRequest, RenderResponse } from "../../../lib/markdown/worker";
import MarkdownWorker from "../../../lib/markdown/worker.ts?worker";

export interface MarkdownPreviewProps {
  title: string;
  body: string;
}

// 进入写文章页即预热：Shiki 按需编译语法规则，首次遇到某类语法（如类型注解）在 WebKit 上要近 1 秒；
// 预热样例覆盖常见 TS 写法与 GFM 结构，作者开始输入时不再冷启动
const WARMUP_SOURCE = `# 预热
- [ ] 任务 **粗体** \`code\` [链接](https://example.com)

| a | b |
|---|---|
| 1 | 2 |

> 引用

\`\`\`ts
import { type Foo } from "./foo";
export interface Post<T = string> { id: number; tags?: T[] }
export async function load(id: number): Promise<Post | null> {
  const list: Array<Post> = [];
  const found = list.find((post) => post.id === id) ?? null;
  return found ? { ...found, tags: [\`#\${id}\`] } : null; // 注释
}
\`\`\`
`;

// Expressive Code 在每次渲染的首个代码块内输出自带的 <style> 与复制按钮 <script>（库生成，用户写的 style / script
// 在此之前已被 sanitize 去掉）。提到 <head> 只加载一次（复制脚本自行监听新插入的代码块），预览区内不留 style / script
const hoisted = new Set<string>();

function hoistExpressiveCodeAssets(html: string): string {
  if (!html.includes("expressive-code")) return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  for (const element of template.content.querySelectorAll(".expressive-code > style, .expressive-code > script")) {
    const key = `${element.tagName}:${element.textContent}`;
    if (!hoisted.has(key)) {
      hoisted.add(key);
      const copy = document.createElement(element.tagName === "SCRIPT" ? "script" : "style");
      if (copy instanceof HTMLScriptElement) copy.type = "module";
      copy.textContent = element.textContent;
      document.head.appendChild(copy);
    }
    element.remove();
  }
  return template.innerHTML;
}

function usePreviewHtml(source: string): string | null {
  const [html, setHtml] = useState<string | null>(null);
  const renderRef = useRef<((source: string) => void) | null>(null);

  useEffect(() => {
    const worker = new MarkdownWorker();
    let seq = 0;
    let busy = false;
    let queued: string | null = null;
    const send = (text: string) => {
      busy = true;
      worker.postMessage({ seq: ++seq, source: text } satisfies RenderRequest);
    };
    worker.addEventListener("message", (event: MessageEvent<RenderResponse>) => {
      busy = false;
      if (queued !== null) {
        send(queued); // 已有更新的输入：本次结果过时，直接渲染最新的
        queued = null;
        return;
      }
      if (event.data.seq === seq && event.data.seq > 1) setHtml(hoistExpressiveCodeAssets(event.data.html)); // seq 1 是预热
    });
    send(WARMUP_SOURCE);
    renderRef.current = (text) => {
      if (busy) queued = text;
      else send(text);
    };
    return () => {
      renderRef.current = null;
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (source.trim() !== "") renderRef.current?.(source);
  }, [source]);

  return html;
}

export function MarkdownPreview({ title, body }: MarkdownPreviewProps) {
  const html = usePreviewHtml(body);
  const empty = body.trim() === "";

  return (
    <div data-testid="md-preview">
      <p className="text-caption tracking-[1px] text-ink-faint">预览</p>
      <article className="mx-auto mt-4 max-w-prose">
        <h1 className="font-prose-heading text-display font-bold text-ink">{title || "无标题"}</h1>
        {empty ? (
          <p className="mt-6 text-ui text-ink-faint">在左侧开始写作，这里会显示预览</p>
        ) : (
          <div className="prose mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: html ?? "" }} />
        )}
      </article>
    </div>
  );
}
