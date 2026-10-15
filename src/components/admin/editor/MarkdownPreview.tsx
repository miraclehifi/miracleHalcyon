// MarkdownPreview（components.md，admin-post-editor.md"预览区"，markdown module-spec §4）：正文在 Web Worker 中渲染
// 主线程发 { seq, source }，只采用最新 seq；渲染中又有输入时只保留最后一次，避免长文连续输入时排队
// 渲染结果的顶层块带 data-line，同步滚动由页面（useScrollSync）基于滚动容器处理
// 单图 figure[data-article-image] 挂载为 ArticleImage（portal 到替换 figure 的宿主元素）；重新渲染时按 reconcileIslands
// 复用 src 与标记未变的实例——把原宿主移回新位置，已加载的图片不重新请求、不重播马赛克。组图 div[data-gallery] 同样
// 挂载为 ImageGallery，按"模式 + 组内各图 key"复用
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { islandKey, reconcileIslands } from "../../../lib/markdown/reconcile-islands";
import { PLACEHOLDER_LABELS } from "../../../lib/markdown/plugins/upload-placeholder";
import type { ImageRef } from "../../../lib/markdown/render";
import type { RenderRequest, RenderResponse } from "../../../lib/markdown/worker";
import MarkdownWorker from "../../../lib/markdown/worker.ts?worker";
import { ArticleImage } from "../../article/ArticleImage";
import { ImageGallery, type GalleryImage } from "../../article/ImageGallery";
import { Alert } from "../../ui/Alert";

export interface MarkdownPreviewProps {
  title: string;
  body: string;
  uploadNames?: string[]; // 进行中上传的文件名，按占位出现顺序补到占位块上
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

interface Rendered {
  html: string;
  images: ImageRef[];
}

// 渲染出错时保留上一次的结果，failed 置 true；下一次渲染成功后清除
function usePreviewHtml(source: string): { rendered: Rendered | null; failed: boolean } {
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [failed, setFailed] = useState(false);
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
      const response = event.data;
      if (response.seq !== seq || response.seq === 1) return; // 过时结果；seq 1 是预热
      if ("error" in response) {
        setFailed(true);
        return;
      }
      setRendered({ html: hoistExpressiveCodeAssets(response.html), images: response.images ?? [] });
      setFailed(false);
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

  return { rendered, failed };
}

type IslandContent = { kind: "image"; image: ImageRef } | { kind: "gallery"; variant: "grid" | "accordion"; images: ImageRef[] };

interface Island {
  id: number; // portal key：复用时不变，组件实例随之保留
  key: string; // 单图为 islandKey（src + 标记），组图为模式 + 组内各图 islandKey
  host: HTMLElement;
  content: IslandContent;
}

const contentKey = (content: IslandContent): string =>
  content.kind === "image" ? islandKey(content.image) : `${content.variant}[${content.images.map(islandKey).join("|")}]`;

const toGalleryImage = (image: ImageRef): GalleryImage => ({
  src: image.src,
  alt: image.alt,
  caption: image.title,
  width: image.w,
  height: image.h,
  accent: image.rgb ? `#${image.rgb}` : undefined,
});

const HOST_ATTRIBUTES = ["data-line", "data-source-start", "data-source-end"]; // 同步滚动、图片菜单定位用，随每次渲染更新

// 把渲染结果写入 content，单图与组图换成宿主元素（复用的沿用原宿主）；返回本次的 island 列表（按文档顺序）
function mountIslands(content: HTMLElement, { html, images }: Rendered, prev: Island[], newId: () => number): Island[] {
  content.innerHTML = html;
  const byStart = new Map(images.map((image) => [image.sourceStart, image]));
  const imageOf = (figure: HTMLElement) => byStart.get(Number(figure.dataset.sourceStart));
  const found = [...content.querySelectorAll<HTMLElement>("figure[data-article-image], div[data-gallery]")]
    .filter((element) => !element.parentElement?.closest("[data-gallery]"))
    .flatMap((element): { element: HTMLElement; content: IslandContent }[] => {
      if (element.tagName === "FIGURE") {
        const image = imageOf(element);
        return image ? [{ element, content: { kind: "image", image } }] : [];
      }
      const members = [...element.querySelectorAll<HTMLElement>(":scope > figure[data-article-image]")].map(imageOf);
      if (members.some((image) => !image)) return [];
      const variant = element.dataset.gallery === "accordion" ? "accordion" : "grid";
      return [{ element, content: { kind: "gallery", variant, images: members as ImageRef[] } }];
    });
  const { matches } = reconcileIslands(
    prev.map((island) => island.key),
    found.map(({ content }) => contentKey(content)),
  );
  return found.map(({ element, content }, i) => {
    const reused = matches[i] === null ? undefined : prev[matches[i]];
    const host = reused?.host ?? document.createElement("div");
    for (const name of HOST_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value === null) host.removeAttribute(name);
      else host.setAttribute(name, value);
    }
    element.replaceWith(host);
    return { id: reused?.id ?? newId(), key: contentKey(content), host, content };
  });
}

export function MarkdownPreview({ title, body, uploadNames = [] }: MarkdownPreviewProps) {
  const { rendered, failed } = usePreviewHtml(body);
  const empty = body.trim() === "";
  const contentRef = useRef<HTMLDivElement>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const islandsRef = useRef<Island[]>([]);
  const lastId = useRef(0);

  // 在下方补占位文件名之前执行：先写入新 HTML
  useLayoutEffect(() => {
    const content = contentRef.current;
    const next = content ? mountIslands(content, rendered ?? { html: "", images: [] }, islandsRef.current, () => ++lastId.current) : [];
    islandsRef.current = next;
    setIslands(next);
  }, [rendered, empty]);

  // 占位块"图片上传中… 文件名"：渲染结果不含文件名（源码里没有），按出现顺序补上
  useLayoutEffect(() => {
    contentRef.current?.querySelectorAll<HTMLElement>("[data-upload-placeholder]").forEach((element, i) => {
      const label = PLACEHOLDER_LABELS[element.dataset.uploadPlaceholder ?? ""] ?? "";
      element.textContent = uploadNames[i] ? `${label} ${uploadNames[i]}` : label;
    });
  }, [rendered, uploadNames]);

  return (
    <div data-testid="md-preview">
      <p className="text-caption tracking-[1px] text-ink-faint">预览</p>
      {failed && !empty && (
        <div className="mt-3">
          <Alert tone="error">预览渲染失败，继续编辑会自动重试</Alert>
        </div>
      )}
      <article className="mx-auto mt-4 max-w-prose">
        <h1 className="font-prose-heading text-display font-bold text-ink">{title || "无标题"}</h1>
        {empty ? (
          <p className="mt-6 text-ui text-ink-faint">在左侧开始写作，这里会显示预览</p>
        ) : (
          <div ref={contentRef} className="prose mt-6 max-w-none" />
        )}
        {islands.map(({ id, host, content }) =>
          createPortal(
            content.kind === "image" ? (
              <ArticleImage
                src={content.image.src}
                alt={content.image.alt}
                caption={content.image.title}
                width={content.image.w}
                height={content.image.h}
                wide={content.image.marks.wide}
              />
            ) : (
              <ImageGallery variant={content.variant} images={content.images.map(toGalleryImage)} />
            ),
            host,
            String(id),
          ),
        )}
      </article>
    </div>
  );
}
