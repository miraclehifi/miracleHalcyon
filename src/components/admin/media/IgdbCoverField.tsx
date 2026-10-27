// IgdbCoverField（admin-media.md §二"游戏专属"，设计稿 11g，ADR-013）：游戏封面左栏——只预览，不上传。
// 链接在右侧字段区输入；这里在输入停顿 300ms 后用 normalizeIgdbCoverUrl 规范化，按原图比例（宽 128，object-fit: contain）显示 t_1080p 大图；
// 无链接、链接不合规或图片加载失败时为 3:4 虚线框
import { useEffect, useState } from "react";
import { normalizeIgdbCoverUrl } from "../../../domains/shelf/entry";
import { ICONS } from "../../ui/icons";

const PREVIEW_DELAY_MS = 300;

export function IgdbCoverField({ url }: { url: string }) {
  const [shown, setShown] = useState(() => normalizeIgdbCoverUrl(url));
  const [failed, setFailed] = useState(false);
  const ImageIcon = ICONS["image-plus"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShown(normalizeIgdbCoverUrl(url));
      setFailed(false);
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div className="flex w-32 shrink-0 flex-col gap-2 max-md:w-full max-md:flex-row max-md:items-start max-md:gap-4">
      <span className="text-meta font-medium text-ink max-md:sr-only">封面</span>
      {shown && !failed ? (
        <img src={shown} alt="封面预览" onError={() => setFailed(true)} className="h-auto w-32 shrink-0 rounded-[4px] object-contain max-md:w-24" />
      ) : (
        <div className="flex aspect-[3/4] w-32 shrink-0 items-center justify-center rounded-[4px] border border-dashed border-line-strong bg-surface-sunken max-md:w-24">
          <ImageIcon size={22} className="text-ink-faint" aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-col gap-2 max-md:min-w-0 max-md:flex-1">
        <span className="hidden text-meta font-medium text-ink max-md:block" aria-hidden="true">
          封面
        </span>
        <p className="text-caption text-ink-faint">游戏封面用 IGDB 链接，不上传图片；预览按原图比例显示</p>
      </div>
    </div>
  );
}
