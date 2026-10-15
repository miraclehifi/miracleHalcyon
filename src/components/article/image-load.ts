// 文章图片的加载状态（components.md"图片加载参数"）：ArticleImage 与 ImageGallery 网格单元格共用。
// <img> 未加载 generating、load 后 complete、error 后 error；重试时状态回到 generating，src 加 ?retry=n 重新请求
import { useEffect, useRef, useState } from "react";

export type LoadStatus = "generating" | "complete" | "error";

export const LOAD_LABELS = { generating: "加载中", complete: "已加载", error: "加载失败" };
export const STAGE_MS = 120; // 马赛克 9 层，约 1 秒变清晰
export const IMAGE_RADIUS = 8; // radius 令牌

const withRetry = (src: string, n: number) => (n === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}retry=${n}`);

export function useImageLoad(src: string) {
  const [status, setStatus] = useState<LoadStatus>("generating");
  const [retry, setRetry] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState(src);
  if (loadedSrc !== src) {
    setLoadedSrc(src);
    setStatus("generating");
    setRetry(0);
  }
  const url = withRetry(src, retry);
  const imgRef = useRef<HTMLImageElement>(null);

  // 读者页预渲染：脚本挂载前图片可能已加载完成，load 事件不会再触发
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setStatus("complete");
  }, [url]);

  return {
    status,
    url,
    imgRef,
    onLoad: () => setStatus("complete"),
    onError: () => setStatus("error"),
    onRetry: () => {
      setRetry((n) => n + 1);
      setStatus("generating");
    },
  };
}
