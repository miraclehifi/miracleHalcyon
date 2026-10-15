// 编辑器中的图片上传（editor module-spec §1、media-upload module-spec §1）：一批文件在光标处一次插入"处理中…"占位，
// 解码算出主色与宽高后改为"上传中…"并随请求上报；进行中的任务按占位出现顺序排成有序列表；完成时替换对应占位
// （保留作者选区、可撤销），失败时移除占位。
// 作者删掉了占位（占位数少于任务数）时，该任务完成后不再插入引用。上传前校验类型与大小，被拒的不插占位、不上传
import { useCallback, useRef, useState, type RefObject } from "react";
import {
  applyEdit,
  countPlaceholders,
  type Edit,
  insertPlaceholders,
  markUploading,
  PLACEHOLDER_PROCESSING,
  placeholdersBefore,
  removePlaceholder,
  replacePlaceholder,
} from "../editor/format-commands";
import { measureImage, type ImageMeta } from "./dominant-color";
import { altFromFileName, imageMarkdown, uploadImage, type UploadedImage } from "./upload-client";
import { createLimiter, UPLOAD_CONCURRENCY } from "./upload-queue";
import { uploadErrorMessage, validateImageFile, withFileName } from "./validate-file";

interface UploadTask {
  file: File;
  batchSize: number;
}

export interface UseImageUploadsOptions {
  onTasksChange?: (names: string[]) => void; // 进行中任务的文件名（按占位顺序），供预览占位块显示
  upload?: (file: File, meta: ImageMeta | null) => Promise<UploadedImage>;
  measure?: (file: File) => Promise<ImageMeta | null>;
  onError?: (message: string) => void; // 被拒或上传失败的提示文案（一批多张时带文件名）
}

export function useImageUploads(textareaRef: RefObject<HTMLTextAreaElement | null>, { onTasksChange, upload = uploadImage, measure = measureImage, onError }: UseImageUploadsOptions = {}) {
  const tasks = useRef<UploadTask[]>([]);
  const [limit] = useState(() => createLimiter(UPLOAD_CONCURRENCY));
  const notify = () => onTasksChange?.(tasks.current.map((task) => task.file.name));

  // 改写第 task 个占位；作者删掉了占位（占位数少于任务数）时不改写
  const rewrite = (task: UploadTask, compute: (text: string, index: number) => Edit | null) => {
    const element = textareaRef.current;
    const index = tasks.current.indexOf(task);
    if (element && index >= 0 && countPlaceholders(element.value) === tasks.current.length) {
      const edit = compute(element.value, index);
      if (edit) applyEdit(element, edit, { preserveSelection: true });
    }
  };

  const finish = (task: UploadTask, markdown: string | null) => {
    rewrite(task, (text, index) => (markdown === null ? removePlaceholder(text, index) : replacePlaceholder(text, index, markdown)));
    tasks.current = tasks.current.filter((item) => item !== task);
    notify();
  };

  const uploadFiles = useCallback(
    // at：插入位置（拖放位置），缺省为当前光标 / 选区
    (files: File[], at?: number) => {
      const element = textareaRef.current;
      if (!element || files.length === 0) return;
      const batch: UploadTask[] = [];
      for (const file of files) {
        const problem = validateImageFile(file);
        if (problem) onError?.(withFileName(problem, file.name, files.length));
        else batch.push({ file, batchSize: files.length });
      }
      if (batch.length === 0) return;
      const from = at ?? element.selectionStart;
      const to = at ?? element.selectionEnd;
      const position = placeholdersBefore(element.value, from);
      applyEdit(element, { ...insertPlaceholders(from, batch.length, PLACEHOLDER_PROCESSING), to });
      tasks.current = [...tasks.current.slice(0, position), ...batch, ...tasks.current.slice(position)];
      notify();
      for (const task of batch) {
        limit(async () => {
          const meta = await measure(task.file);
          rewrite(task, markUploading);
          return upload(task.file, meta);
        }).then(
          (image) => finish(task, imageMarkdown(altFromFileName(task.file.name), image.url)),
          (error: unknown) => {
            finish(task, null);
            onError?.(withFileName(uploadErrorMessage(error), task.file.name, task.batchSize));
          },
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 任务列表在 ref 中，回调只依赖 ref 与上传函数
    [textareaRef, upload, measure, onTasksChange, onError, limit],
  );

  return { uploadFiles };
}
