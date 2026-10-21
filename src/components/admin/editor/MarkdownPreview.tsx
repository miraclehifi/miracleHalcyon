// MarkdownPreview（components.md，admin-post-editor.md"预览区"，markdown module-spec §4）：正文在 Web Worker 中渲染
// 主线程发 { seq, source }，只采用最新 seq；渲染中又有输入时只保留最后一次，避免长文连续输入时排队
// 渲染结果的顶层块带 data-line，同步滚动由页面（useScrollSync）基于滚动容器处理
// 单图 figure[data-article-image] 挂载为 ArticleImage（portal 到替换 figure 的宿主元素）；重新渲染时按 reconcileIslands
// 复用 src 与标记未变的实例——把原宿主移回新位置，已加载的图片不重新请求、不重播马赛克。组图 div[data-gallery] 同样
// 挂载为 ImageGallery，按"模式 + 组内各图 key"复用。
// 上传占位（markdown module-spec §2.1）挂载点换成宿主元素，按占位序号复用（卡片实例与进度过渡不因重新渲染而重置），
// 内容为对应上传任务的 UploadCard（admin-post-editor"上传进度卡片"）。
// 图片菜单（admin-post-editor"图片菜单"）：单图右上角"图片选项"，经 onSourceEdit 改写源码；哪张图的菜单开着按"源码起点 +
// 地址"记录，改写后图片重新挂载菜单仍打开；该图片在新的渲染结果里找不到时关闭（焦点无处可去时回到预览区）
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Edit } from "../../../lib/editor/format-commands";
import { setGalleryMode, toggleMark, type ImageLocation } from "../../../lib/editor/image-marks";
import { liveVideoSrc } from "../../../lib/markdown/plugins/image-key";
import { islandKey, reconcileIslands } from "../../../lib/markdown/reconcile-islands";
import type { ImageRef } from "../../../lib/markdown/render";
import type { RenderRequest, RenderResponse } from "../../../lib/markdown/worker";
import { hasLiveVideo } from "../../../lib/upload/live-video-check";
import type { UploadView } from "../../../lib/upload/use-image-uploads";
import MarkdownWorker from "../../../lib/markdown/worker.ts?worker";
import { ArticleImage } from "../../article/ArticleImage";
import type { ExternalSource } from "../../article/external-media";
import type { LiveSource } from "../../article/live-photo";
import { ImageGallery, type GalleryImage } from "../../article/ImageGallery";
import { Alert } from "../../ui/Alert";
import { ImageMenu } from "./ImageMenu";
import { UploadCard } from "./UploadCard";

export interface MarkdownPreviewProps {
  title: string;
  body: string;
  uploads?: UploadView[]; // 进行中的上传，按占位出现顺序对应预览中的进度卡片
  // 图片菜单改写源码：compute 拿到当前源码算出 Edit（定位不上返回 null）；返回是否已写入。不传时不显示图片菜单
  onSourceEdit?: (compute: (source: string) => Edit | null) => boolean;
}

// 打开着的图片菜单：单图按其源码起点 + 地址，组图按首张；focus 为菜单重新挂载后停留的项
interface MenuAnchor {
  kind: IslandContent["kind"];
  start: number;
  src: string;
  focus?: number;
}

const TAP_MAX_MS = 300; // 手机点按开菜单；更长的按压留给实况照片长按播放

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

// 外链动态照片（ADR-010）：视频在原图的 mp 字节范围内，HEVC；站内：同名 .live.mp4
const liveOf = (image: ImageRef): LiveSource | undefined => {
  if (!image.marks.live) return undefined;
  return image.mp ? { videoSrc: image.src, range: image.mp, codec: "hevc" } : { videoSrc: liveVideoSrc(image.src) };
};
const externalOf = (image: ImageRef): ExternalSource | undefined =>
  image.thumb ? { thumb: image.thumb, ...(image.mp && { mainBytes: image.mp.offset }) } : undefined;

const toGalleryImage = (image: ImageRef): GalleryImage => ({
  src: image.src,
  alt: image.alt,
  caption: image.title,
  width: image.w,
  height: image.h,
  accent: image.rgb ? `#${image.rgb}` : undefined,
  live: liveOf(image),
  external: externalOf(image),
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
    const id = reused?.id ?? newId();
    host.dataset.islandId = String(id); // 手机点按时由点中的元素找到所属图片
    return { id, key: contentKey(content), host, content };
  });
}

// 把上传占位的挂载点换成宿主元素（第 i 个占位沿用上次第 i 个宿主）；返回本次的宿主列表
function mountUploadHosts(content: HTMLElement, prev: HTMLElement[]): HTMLElement[] {
  return [...content.querySelectorAll<HTMLElement>("[data-upload-placeholder]")].map((element, i) => {
    const host = prev[i] ?? Object.assign(document.createElement("div"), { className: "upload-host" });
    element.replaceWith(host);
    return host;
  });
}

const leadImage = (content: IslandContent) => (content.kind === "image" ? content.image : content.images[0]);
const anchorOf = (content: IslandContent): MenuAnchor => ({ kind: content.kind, start: leadImage(content).sourceStart, src: leadImage(content).src });
const anchors = (anchor: MenuAnchor | null, content: IslandContent) =>
  anchor !== null && anchor.kind === content.kind && anchor.start === leadImage(content).sourceStart && anchor.src === leadImage(content).src;
const locationOf = (image: ImageRef): ImageLocation => ({ start: image.sourceStart, end: image.sourceEnd, src: image.src });

export function MarkdownPreview({ title, body, uploads = [], onSourceEdit }: MarkdownPreviewProps) {
  const { rendered, failed } = usePreviewHtml(body);
  const empty = body.trim() === "";
  const contentRef = useRef<HTMLDivElement>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const islandsRef = useRef<Island[]>([]);
  const lastId = useRef(0);
  const [menu, setMenu] = useState<MenuAnchor | null>(null);
  const menuRef = useRef<MenuAnchor | null>(null);
  const press = useRef({ touch: false, at: 0 });
  const [uploadHosts, setUploadHosts] = useState<HTMLElement[]>([]);
  const uploadHostsRef = useRef<HTMLElement[]>([]);

  // 在下方补占位文件名之前执行：先写入新 HTML
  useLayoutEffect(() => {
    const content = contentRef.current;
    const next = content ? mountIslands(content, rendered ?? { html: "", images: [] }, islandsRef.current, () => ++lastId.current) : [];
    islandsRef.current = next;
    setIslands(next);
    const hosts = content ? mountUploadHosts(content, uploadHostsRef.current) : [];
    uploadHostsRef.current = hosts;
    setUploadHosts(hosts);
    // 菜单所在的图片 / 组图已不在（源码被删改、拆成单图）：关闭菜单；焦点随按钮一起被移除时回到预览区
    const anchor = menuRef.current;
    if (anchor && !next.some(({ content }) => anchors(anchor, content))) {
      menuRef.current = null;
      setMenu(null);
      if (document.activeElement === document.body) contentRef.current?.focus();
    }
  }, [rendered, empty]);

  const setMenuAnchor = (anchor: MenuAnchor | null) => {
    menuRef.current = anchor;
    setMenu(anchor);
  };

  // 改写源码：定位不上时关闭菜单；写入时焦点被移到源码区（原生撤销需要），立即还给菜单项，Esc / 方向键继续作用于菜单
  const rewrite = (compute: (source: string) => Edit | null, focusAfter: HTMLElement | null) => {
    if (!onSourceEdit?.(compute)) {
      setMenuAnchor(null);
      return;
    }
    focusAfter?.focus();
  };

  const menuFor = (content: IslandContent) => {
    if (!onSourceEdit) return undefined;
    const open = anchors(menu, content);
    const onOpenChange = (next: boolean) => setMenuAnchor(next ? anchorOf(content) : null);
    if (content.kind === "image") {
      const { image } = content;
      return (
        <ImageMenu
          kind="image"
          open={open}
          onOpenChange={onOpenChange}
          wide={image.marks.wide}
          onToggleWide={() => rewrite((source) => toggleMark(source, locationOf(image), "wide"), document.activeElement as HTMLElement | null)}
          live={image.marks.live}
          hasLiveVideo={() => (image.thumb ? Promise.resolve(image.mp !== undefined) : hasLiveVideo(image.src))} // 外链照片按 mp 判断，不发请求（US-13）
          onToggleLive={() => rewrite((source) => toggleMark(source, locationOf(image), "live"), document.activeElement as HTMLElement | null)}
        />
      );
    }
    const members = content.images.map(locationOf);
    return (
      <ImageMenu
        kind="gallery"
        open={open}
        onOpenChange={onOpenChange}
        initialFocus={open ? menu?.focus : undefined}
        mode={content.variant}
        count={content.images.length}
        onModeChange={(mode) => {
          setMenuAnchor({ ...anchorOf(content), focus: mode === "grid" ? 0 : 1 });
          rewrite((source) => setGalleryMode(source, members, mode), document.activeElement as HTMLElement | null);
        }}
        onSplit={() => rewrite((source) => setGalleryMode(source, members, "split"), contentRef.current)} // 组图随之消失，焦点回到预览区
      />
    );
  };

  // 手机：点按图片或组图直接展开菜单（长按留给实况照片播放；点在按钮或菜单上的不算）
  const onTap = (event: MouseEvent) => {
    const { touch, at } = press.current;
    if (!onSourceEdit || !touch || event.timeStamp - at > TAP_MAX_MS) return;
    const target = event.target as Element;
    if (target.closest('button, [role="menu"]')) return;
    const id = target.closest<HTMLElement>("[data-island-id]")?.dataset.islandId;
    const island = islands.find((item) => String(item.id) === id);
    if (island) setMenuAnchor(anchorOf(island.content));
  };

  return (
    <div data-testid="md-preview">
      <p className="text-caption tracking-[1px] text-ink-faint">预览</p>
      {failed && !empty && (
        <div className="mt-3">
          <Alert tone="error">预览渲染失败，继续编辑会自动重试</Alert>
        </div>
      )}
      <article
        className="mx-auto mt-4 max-w-prose"
        onPointerDown={(event) => (press.current = { touch: event.pointerType === "touch", at: event.timeStamp })}
        onClick={onTap}
      >
        <h1 className="font-prose-heading text-display font-bold text-ink">{title || "无标题"}</h1>
        {empty ? (
          <p className="mt-6 text-ui text-ink-faint">在左侧开始写作，这里会显示预览</p>
        ) : (
          <div ref={contentRef} tabIndex={-1} className="prose mt-6 max-w-none outline-none" />
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
                live={liveOf(content.image)}
                external={externalOf(content.image)}
                actions={menuFor(content)}
              />
            ) : (
              <ImageGallery variant={content.variant} images={content.images.map(toGalleryImage)} actions={menuFor(content)} />
            ),
            host,
            String(id),
          ),
        )}
        {uploadHosts.map((host, i) => {
          // 预览还停在旧源码时占位数等于"含幽灵"的列表长度，否则按去掉幽灵的列表对应
          const list = uploadHosts.length === uploads.length ? uploads : uploads.filter((item) => !item.ghost);
          const upload = list[i];
          if (upload?.ghost) return null;
          return createPortal(
            upload ? (
              <UploadCard
                state={upload.state}
                fileName={upload.name}
                thumbUrl={upload.thumbUrl}
                progress={upload.progress}
                error={upload.error}
                leaving={upload.leaving}
                onRetry={upload.retry}
                onRemove={upload.remove}
                onStillOnly={upload.stillOnly}
              />
            ) : (
              // 预览先于槽位核对渲染出占位（如页面刚加载）：先按已中断显示，核对后换成带"移除"的槽位卡片
              <UploadCard state="interrupted" fileName="" progress={0} onRemove={() => undefined} />
            ),
            host,
            `upload-${i}`,
          );
        })}
      </article>
    </div>
  );
}
