// CoverField（components.md"页面区块"、admin-post-editor.md"设置抽屉·封面"，F-002 US-06）：
// 无封面时为"选择图片或拖入"区；有封面时缩略图 + 更换 / 移除。上传复用正文图片的校验、测量与上传（editor module-spec §4），
// 安卓动态照片只取静态图；失败时显示原因并保留原封面；移除只清空字段，不删除 R2 文件
import { useId, useRef, useState, type DragEvent } from "react";
import { measureImage, type ImageMeta } from "../../../lib/upload/dominant-color";
import { uploadImage, type UploadedImage, type UploadExtras } from "../../../lib/upload/upload-client";
import { fileToItem } from "../../../lib/upload/use-image-uploads";
import type { UploadItem } from "../../../lib/upload/upload-item";
import { uploadErrorMessage, validateImageFile } from "../../../lib/upload/validate-file";
import { Button } from "../../ui/Button";

export interface CoverFieldProps {
  value: string | null;
  onChange(url: string | null): void;
  upload?: (file: File, extras?: UploadExtras) => Promise<UploadedImage>;
  measure?: (file: Blob) => Promise<ImageMeta | null>;
  toItem?: (file: File) => Promise<UploadItem>;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function CoverField({ value, onChange, upload = uploadImage, measure = measureImage, toItem = fileToItem }: CoverFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const item = await toItem(file);
      // 动态照片只用静态图作封面，不带视频
      const still = item.kind === "live" ? new File([item.still], item.name, { type: "image/jpeg" }) : item.file;
      const meta = await measure(still);
      const result = await upload(still, { meta });
      onChange(result.url);
    } catch (cause) {
      setError(uploadErrorMessage(cause));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragover(false);
    const files = [...(event.dataTransfer?.files ?? [])];
    void pick(files.find((file) => file.type.startsWith("image/")) ?? files[0]);
  };
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragover(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-meta font-medium text-ink-muted">封面</span>
      <input ref={inputRef} id={inputId} type="file" accept={ACCEPT} aria-label="选择封面图片" className="sr-only" onChange={(event) => void pick(event.target.files?.[0])} />
      {value && !uploading ? (
        <div className="flex items-center gap-3" onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={() => setDragover(false)} onDrop={onDrop}>
          <img src={value} alt="封面" width={96} height={96} className="size-24 shrink-0 rounded-control bg-surface-sunken object-cover" />
          <div className="flex flex-col items-start gap-2">
            <Button variant="secondary" icon="image-plus" onClick={() => inputRef.current?.click()}>
              更换
            </Button>
            <Button variant="ghost" icon="x" onClick={() => onChange(null)}>
              移除
            </Button>
          </div>
        </div>
      ) : (
        <div
          data-testid="cover-dropzone"
          data-dragover={dragover || undefined}
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}
          className="flex h-24 items-center justify-center rounded-control border border-dashed border-input-border text-ui text-ink-muted transition-colors duration-200 data-[dragover]:border-accent data-[dragover]:bg-accent-soft"
        >
          {uploading ? (
            <span aria-live="polite">上传中…</span>
          ) : (
            <label htmlFor={inputId} className="flex h-full w-full cursor-pointer items-center justify-center hover:text-ink">
              选择图片或拖入
            </label>
          )}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : (
        <p className="text-caption text-ink-faint">显示在文章列表卡片右侧</p>
      )}
    </div>
  );
}
