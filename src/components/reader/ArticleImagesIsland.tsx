// ArticleImagesIsland（reader module-spec §4.2，ADR-008）：读者页正文图片岛（client:idle，仅正文含图片时渲染）。
// 把构建时输出的静态 figure / 组图换成宿主元素，portal 渲染 ArticleImage / ImageGallery（与后台预览同一套组件）；
// 点击图片记录灯箱下标（灯箱见 add-lightbox）
import { useLayoutEffect, useState } from "react";
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

const toGalleryImage = ({ wide: _wide, ...image }: ArticleImageData) => image;

export function ArticleImagesIsland({ rootSelector }: ArticleImagesIslandProps) {
  const [mounted, setMounted] = useState<Mounted[]>([]);
  const [, setOpenIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    const { islands } = collectArticleImages(root);
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
              onClick={() => setOpenIndex(island.start)}
            />
          ) : (
            <ImageGallery variant={island.variant} images={island.images.map(toGalleryImage)} onImageClick={(index) => setOpenIndex(island.start + index)} />
          ),
          host,
          String(key),
        ),
      )}
    </>
  );
}

export default ArticleImagesIsland;
