import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverField, type CoverFieldProps } from "../../../src/components/admin/editor/CoverField";
import { UploadError, type UploadedImage } from "../../../src/lib/upload/upload-client";

const A = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";
const B = "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg";
const uploaded = (url: string): UploadedImage => ({ url, width: 1600, height: 900, rgb: "556677", live: false, videoUrl: null });
const png = (name = "b.png", size = 10) => new File([new Uint8Array(size)], name, { type: "image/png" });

function setup(props: Partial<CoverFieldProps> = {}) {
  const onChange = vi.fn();
  const upload = vi.fn(async () => uploaded(B));
  const measure = vi.fn(async () => ({ width: 1200, height: 800, rgb: "112233" }));
  render(<CoverField value={null} onChange={onChange} upload={upload} measure={measure} {...props} />);
  return { onChange, upload, measure };
}

const input = () => screen.getByLabelText("选择封面图片") as HTMLInputElement;
const choose = async (file: File) => {
  await act(async () => {
    fireEvent.change(input(), { target: { files: [file] } });
  });
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// UT-231–236（SC-COVER-01–04、07）
describe("CoverField", () => {
  it("[UT-231] 无封面：选择 / 拖入区；有封面：缩略图、更换、移除", () => {
    setup();
    expect(screen.getByTestId("cover-dropzone")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "封面" })).toBeNull();
    cleanup();
    setup({ value: A });
    expect((screen.getByRole("img", { name: "封面" }) as HTMLImageElement).getAttribute("src")).toBe(A);
    expect(screen.getByRole("button", { name: "更换" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "移除" })).toBeTruthy();
  });

  it("[UT-232] 选择文件：校验 → 上传中 → 上传成功后回传地址（带主色与宽高）", async () => {
    let finish!: (value: UploadedImage) => void;
    const upload = vi.fn(() => new Promise<UploadedImage>((resolve) => (finish = resolve)));
    const { onChange, measure } = setup({ upload });
    await choose(png());
    expect(screen.getByText("上传中…")).toBeTruthy();
    expect(measure).toHaveBeenCalledOnce();
    expect(upload.mock.calls[0][1]).toEqual({ meta: { width: 1200, height: 800, rgb: "112233" } });
    await act(async () => finish(uploaded(B)));
    expect(onChange).toHaveBeenCalledWith(B);
  });

  it("[UT-232] 不支持的格式、过大与上传失败：提示原因，不回传", async () => {
    const upload = vi.fn(async () => {
      throw new UploadError("UPLOAD_FAILED", "x", 500);
    });
    const { onChange } = setup({ value: A, upload });
    await choose(new File(["x"], "a.bmp", { type: "image/bmp" }));
    expect(screen.getByRole("alert").textContent).toBe("仅支持 png、jpg、webp、gif");
    await choose(png("big.png", 50 * 1024 * 1024 + 1));
    expect(screen.getByRole("alert").textContent).toBe("图片不能超过 50MB");
    await choose(png());
    expect(screen.getByRole("alert").textContent).toBe("上传失败，请重试");
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByRole("img", { name: "封面" }) as HTMLImageElement).getAttribute("src")).toBe(A);
  });

  it("[UT-233] 移除回传 null，不调用上传", () => {
    const { onChange, upload } = setup({ value: A });
    fireEvent.click(screen.getByRole("button", { name: "移除" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(upload).not.toHaveBeenCalled();
  });

  it("[UT-234] 拖入：高亮可放置，放下后只取第一张图片", async () => {
    const { upload } = setup();
    const zone = screen.getByTestId("cover-dropzone");
    fireEvent.dragEnter(zone, { dataTransfer: { types: ["Files"] } });
    expect(zone.hasAttribute("data-dragover")).toBe(true);
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [new File(["t"], "a.txt", { type: "text/plain" }), png("first.png"), png("second.png")] } });
    });
    expect(zone.hasAttribute("data-dragover")).toBe(false);
    expect((upload.mock.calls[0][0] as File).name).toBe("first.png");
  });

  it("[UT-235] 安卓动态照片只上传静态图", async () => {
    const still = new Blob([new Uint8Array(4)], { type: "image/jpeg" });
    const toItem = vi.fn(async () => ({ kind: "live" as const, name: "motion.jpg", still, video: new Blob([new Uint8Array(8)]) }));
    const { upload } = setup({ toItem });
    await choose(new File([new Uint8Array(12)], "motion.jpg", { type: "image/jpeg" }));
    const [file, extras] = upload.mock.calls[0] as [File, { video?: Blob }];
    expect([file.name, file.size, file.type, extras.video]).toEqual(["motion.jpg", 4, "image/jpeg", undefined]);
  });

  it("[UT-236] 可访问性：文件输入有名称，错误 role=alert", async () => {
    setup();
    expect(input().getAttribute("accept")).toContain("image/png");
    await choose(new File(["x"], "a.bmp", { type: "image/bmp" }));
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
