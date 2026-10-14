import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadError } from "../../../src/lib/upload/upload-client";
import { uploadErrorMessage, validateImageFile } from "../../../src/lib/upload/validate-file";
import { useImageUploads } from "../../../src/lib/upload/use-image-uploads";

afterEach(cleanup);

const MB50 = 50 * 1024 * 1024;
const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

// [SC-IMAGE-05][SC-IMAGE-06] UT-85 / UT-86：类型与大小
describe("validateImageFile", () => {
  it("png / jpeg / webp / gif 通过；svg、pdf、无扩展名无类型、image/svg+xml 拒绝", () => {
    expect(
      [
        file("a.png", "image/png"),
        file("b.jpg", "image/jpeg"),
        file("c.webp", "image/webp"),
        file("d.gif", "image/gif"),
        file("e.JPEG", ""),
        file("logo.svg", "image/svg+xml"),
        file("doc.pdf", "application/pdf"),
        file("noext", ""),
        file("x.png", "image/svg+xml"),
      ].map(validateImageFile),
    ).toEqual([null, null, null, null, null, "仅支持 png、jpg、webp、gif", "仅支持 png、jpg、webp、gif", "仅支持 png、jpg、webp、gif", "仅支持 png、jpg、webp、gif"]);
  });

  it("50MB−1、50MB 通过；50MB+1、60MB 拒绝", () => {
    expect([MB50 - 1, MB50, MB50 + 1, 60 * 1024 * 1024].map((size) => validateImageFile(file("a.png", "image/png", size)))).toEqual([
      null,
      null,
      "图片不能超过 50MB",
      "图片不能超过 50MB",
    ]);
  });
});

// 服务端 / 网络错误 → 三种文案之一
describe("uploadErrorMessage", () => {
  it("413 FILE_TOO_LARGE、UNSUPPORTED_TYPE 对应前端文案；其余（含网络错误、0 字节被拒）为上传失败", () => {
    expect([
      uploadErrorMessage(new UploadError("FILE_TOO_LARGE", "图片不能超过 50MB", 413)),
      uploadErrorMessage(new UploadError("UNSUPPORTED_TYPE", "不支持的图片格式", 400)),
      uploadErrorMessage(new UploadError("VALIDATION_FAILED", "不支持的图片格式", 400)),
      uploadErrorMessage(new UploadError("UPLOAD_FAILED", "上传失败，请重试", 500)),
      uploadErrorMessage(new TypeError("Failed to fetch")),
    ]).toEqual(["图片不能超过 50MB", "仅支持 png、jpg、webp、gif", "上传失败，请重试", "上传失败，请重试", "上传失败，请重试"]);
  });
});

// [SC-IMAGE-05][SC-IMAGE-06] UT-92：校验失败不发起上传、不插入；一批多张时提示带文件名；上传失败移除占位并提示
describe("useImageUploads 错误处理", () => {
  function setup(upload: (file: File) => Promise<never>) {
    const onError = vi.fn();
    let uploadFiles!: (files: File[]) => void;
    function Harness() {
      const ref = useRef<HTMLTextAreaElement>(null);
      uploadFiles = useImageUploads(ref, { upload, onError }).uploadFiles;
      return <textarea ref={ref} defaultValue="原文" />;
    }
    const { container } = render(<Harness />);
    const textarea = container.querySelector("textarea")!;
    textarea.setSelectionRange(2, 2);
    return { onError, textarea, uploadFiles: (files: File[]) => act(() => uploadFiles(files)) };
  }

  it("单张超大 / svg：不上传、不插入，提示不带文件名", () => {
    const upload = vi.fn();
    const { onError, textarea, uploadFiles } = setup(upload);
    uploadFiles([file("big.jpg", "image/jpeg", 60 * 1024 * 1024)]);
    uploadFiles([file("logo.svg", "image/svg+xml")]);
    expect({ uploads: upload.mock.calls.length, value: textarea.value, errors: onError.mock.calls.map((c) => c[0]) }).toEqual({
      uploads: 0,
      value: "原文",
      errors: ["图片不能超过 50MB", "仅支持 png、jpg、webp、gif"],
    });
  });

  it("混合一批：只为合法图片插占位并上传，被拒的带文件名提示", () => {
    const upload = vi.fn<(file: File) => Promise<never>>(() => new Promise(() => {}));
    const { onError, textarea, uploadFiles } = setup(upload);
    uploadFiles([file("a.png", "image/png"), file("over.png", "image/png", MB50 + 1), file("logo.svg", "image/svg+xml"), file("c.png", "image/png")]);
    expect({ uploads: upload.mock.calls.map(([f]) => f.name), value: textarea.value, errors: onError.mock.calls.map((c) => c[0]) }).toEqual({
      uploads: ["a.png", "c.png"],
      value: "原文![上传中…]()\n![上传中…]()",
      errors: ["over.png：图片不能超过 50MB", "logo.svg：仅支持 png、jpg、webp、gif"],
    });
  });

  it("上传失败：移除占位并提示上传失败", async () => {
    const { onError, textarea, uploadFiles } = setup(() => Promise.reject(new TypeError("Failed to fetch")));
    uploadFiles([file("shot.png", "image/png")]);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect({ value: textarea.value, errors: onError.mock.calls.map((c) => c[0]) }).toEqual({ value: "原文", errors: ["上传失败，请重试"] });
  });
});
