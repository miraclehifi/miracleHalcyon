// 编辑器中的图片上传（editor module-spec §1、media-upload module-spec §1）：一批文件在光标处一次插入占位，
// 进行中的任务按占位出现顺序排成有序列表；完成时替换对应占位（保留作者选区、可撤销），失败时移除占位。
// 作者删掉了占位（占位数少于任务数）时，该任务完成后不再插入引用
import { useCallback, useRef, useState, type RefObject } from "react";
import {
  applyEdit,
  countPlaceholders,
  insertPlaceholders,
  placeholdersBefore,
  removePlaceholder,
  replacePlaceholder,
} from "../editor/format-commands";
import { altFromFileName, imageMarkdown, uploadImage, type UploadedImage } from "./upload-client";
import { createLimiter, UPLOAD_CONCURRENCY } from "./upload-queue";

interface UploadTask {
  file: File;
}

export interface UseImageUploadsOptions {
  onTasksChange?: (names: string[]) => void; // 进行中任务的文件名（按占位顺序），供预览占位块显示
  upload?: (file: File) => Promise<UploadedImage>;
}

export function useImageUploads(textareaRef: RefObject<HTMLTextAreaElement | null>, { onTasksChange, upload = uploadImage }: UseImageUploadsOptions = {}) {
  const tasks = useRef<UploadTask[]>([]);
  const [limit] = useState(() => createLimiter(UPLOAD_CONCURRENCY));
  const notify = () => onTasksChange?.(tasks.current.map((task) => task.file.name));

  const finish = (task: UploadTask, markdown: string | null) => {
    const element = textareaRef.current;
    const index = tasks.current.indexOf(task);
    if (element && index >= 0 && countPlaceholders(element.value) === tasks.current.length) {
      const edit = markdown === null ? removePlaceholder(element.value, index) : replacePlaceholder(element.value, index, markdown);
      if (edit) applyEdit(element, edit, { preserveSelection: true });
    }
    tasks.current = tasks.current.filter((item) => item !== task);
    notify();
  };

  const uploadFiles = useCallback(
    // at：插入位置（拖放位置），缺省为当前光标 / 选区
    (files: File[], at?: number) => {
      const element = textareaRef.current;
      if (!element || files.length === 0) return;
      const from = at ?? element.selectionStart;
      const to = at ?? element.selectionEnd;
      const batch = files.map((file) => ({ file }));
      const position = placeholdersBefore(element.value, from);
      applyEdit(element, { ...insertPlaceholders(from, batch.length), to });
      tasks.current = [...tasks.current.slice(0, position), ...batch, ...tasks.current.slice(position)];
      notify();
      for (const task of batch) {
        limit(() => upload(task.file)).then(
          (image) => finish(task, imageMarkdown(altFromFileName(task.file.name), image.url)),
          () => finish(task, null),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 任务列表在 ref 中，回调只依赖 ref 与上传函数
    [textareaRef, upload, onTasksChange, limit],
  );

  return { uploadFiles };
}
