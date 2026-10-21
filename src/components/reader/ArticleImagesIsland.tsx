// ArticleImagesIsland（reader module-spec §4.2，ADR-008）：读者页正文图片岛（client:idle，仅正文含图片时渲染）。
// 把构建时输出的静态 figure / 组图换成宿主元素，portal 渲染 ArticleImage / ImageGallery（与后台预览同一套组件）；
// 点击图片打开 Lightbox（首次打开时动态加载，含 gsap 与 DepthCarousel），关闭后焦点回到触发的图片
import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { collectArticleImages, type ArticleImageData, type ArticleIsland } from "../../lib/reader/article-images";
import { ArticleImage } from "../article/ArticleImage";
import { ImageGallery } from "../article/ImageGallery";

export interface ArticleImagesIslandProps {
  rootSelector: string;
}

interface Mounted {
  host: HTMLElement;
  island: ArticleIsland;
}

const toGalleryImage = ({ src, alt, caption, width, height, accent, live, external }: ArticleImageData) => ({ src, alt, caption, width, height, accent, live, external });
const Lightbox = lazy(() => import("./Lightbox"));

export function ArticleImagesIsland({ rootSelector }: ArticleImagesIslandProps) {
  const [mounted, setMounted] = useState<Mounted[]>([]);
  const [images, setImages] = useState<ArticleImageData[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const open = (index: number) => {
    trigger.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    setOpenIndex(index);
  };
  const close = () => {
    setOpenIndex(null);
    requestAnimationFrame(() => trigger.current?.focus());
  };

  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    const { islands, images: all } = collectArticleImages(root);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载点来自水合后的 DOM，只能在挂载后读取一次
    setImages(all);
    setMounted(
      islands.map((island) => {
        const host = document.createElement("div");
        island.element.replaceWith(host);
        return { host, island };
      }),
    );
  }, [rootSelector]);

  return (
    <>
      {mounted.map(({ host, island }, key) =>
        createPortal(
          island.kind === "image" ? (
            <ArticleImage
              src={island.image.src}
              alt={island.image.alt}
              caption={island.image.caption}
              width={island.image.width}
              height={island.image.height}
              wide={island.image.wide}
              live={island.image.live}
              external={island.image.external}
              onClick={() => open(island.start)}
            />
          ) : (
            <ImageGallery variant={island.variant} images={island.images.map(toGalleryImage)} onImageClick={(index) => open(island.start + index)} />
          ),
          host,
          String(key),
        ),
      )}
      {openIndex !== null && (
        <Suspense fallback={null}>
          <Lightbox images={images} index={openIndex} onClose={close} />
        </Suspense>
      )}
    </>
  );
}

export default ArticleImagesIsland;
