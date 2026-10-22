// ShelfCoverField（admin-media.md §二"封面"，feature-architecture §4.2）：2:3 封面——缩略图 + 更换 / 上传 + 移除，可点、可拖入。
// 不复用文章的 CoverField：那里选图即上传到图片存储，这里文件随表单保存一起提交（multipart），且尺寸比例不同。
// 前端先拦类型与大小（jpg / png / webp、≤ 5 MB），不合规时保留原封面并提示；服务端按文件头再判一次
import { useId, useRef, useState, type DragEvent } from "react";
import { COVER_MAX_BYTES } from "../../../domains/shelf/entry";
import { Button } from "../../ui/Button";
import { IconButton } from "../../ui/IconButton";
import { ICONS } from "../../ui/icons";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export const isAcceptableCover = (file: File) => ACCEPT.includes(file.type) && file.size <= COVER_MAX_BYTES;

export interface ShelfCoverFieldProps {
  preview: string | null; // 站内封面地址、识别得到的 data: 预览或新选文件的 blob: 地址
  fromDouban?: boolean; // 封面来自识别时，说明里补"来自豆瓣，保存时存入本站"
  error?: string;
  onSelect(file: File): void;
  onReject(): void;
  onRemove(): void;
}

export function ShelfCoverField({ preview, fromDouban = false, error, onSelect, onReject, onRemove }: ShelfCoverFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const ImagePlus = ICONS["image-plus"];

  const take = (file: File | undefined) => {
    if (!file) return;
    if (isAcceptableCover(file)) onSelect(file);
    else onReject();
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files[0]);
  };

  return (
    <div data-cover-invalid={error ? "" : undefined} className="flex w-32 shrink-0 flex-col gap-2 max-md:w-full max-md:flex-row max-md:items-start max-md:gap-4">
      <label htmlFor={`${id}-file`} className="text-meta font-medium text-ink md:order-none max-md:sr-only">
        封面
      </label>
      <input
        ref={input}
        id={`${id}-file`}
        type="file"
        accept={ACCEPT.join(",")}
        className="sr-only"
        aria-describedby={`${id}-note`}
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {/* 缩略图可点、可拖入；键盘走右侧"更换 / 上传"按钮 */}
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`relative h-48 w-32 shrink-0 cursor-pointer overflow-hidden rounded-[4px] max-md:h-36 max-md:w-24 ${
          preview ? "" : `flex items-center justify-center border border-dashed bg-surface-sunken ${over ? "border-accent" : "border-line-strong"}`
        }`}
      >
        {preview ? (
          <img src={preview} alt="封面预览" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={22} className="text-ink-faint" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col gap-2 max-md:min-w-0 max-md:flex-1">
        <span className="hidden text-meta font-medium text-ink max-md:block" aria-hidden="true">
          封面
        </span>
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={() => input.current?.click()}>
            {preview ? "更换" : "上传"}
          </Button>
          {preview && <IconButton icon="x" aria-label="移除封面" onClick={onRemove} />}
        </div>
        {error ? (
          <p id={`${id}-note`} role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : (
          <p id={`${id}-note`} className="text-caption text-ink-faint">
            {fromDouban ? "来自豆瓣，保存时存入本站；也可上传 jpg / png / webp，≤ 5 MB" : "可上传 jpg / png / webp，≤ 5 MB"}
          </p>
        )}
      </div>
    </div>
  );
}

