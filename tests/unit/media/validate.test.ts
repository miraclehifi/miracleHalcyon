import { describe, expect, it } from "vitest";
import { buildImageKey, generateImageId } from "../../../src/domains/media/key";
import { checkImageSize, checkVideoSize, sniffImage, sniffVideo, validateUploadFields } from "../../../src/domains/media/validate";
import { GIF_1X1, HTML, MP4, PDF, PNG_1X1, SVG, ftyp, gif89a, jpeg, webpVp8, webpVp8l, webpVp8x } from "./image-bytes";

// [MEDIA-UT-01][SC-IMAGE-08] 按魔数判定类型并从文件头解析尺寸；其余一律 null
describe("sniffImage", () => {
  it("识别 PNG / JPEG（EXIF 在 SOF 前、渐进式）/ WebP 三种块 / GIF 并取真实尺寸", () => {
    expect([
      sniffImage(PNG_1X1),
      sniffImage(jpeg(4032, 3024)),
      sniffImage(jpeg(800, 600, 0xc2)),
      sniffImage(webpVp8(1600, 900)),
      sniffImage(webpVp8l(640, 480)),
      sniffImage(webpVp8x(4000, 3000)),
      sniffImage(gif89a(320, 240)),
      sniffImage(GIF_1X1),
    ]).toEqual([
      { mime: "image/png", ext: "png", width: 1, height: 1 },
      { mime: "image/jpeg", ext: "jpg", width: 4032, height: 3024 },
      { mime: "image/jpeg", ext: "jpg", width: 800, height: 600 },
      { mime: "image/webp", ext: "webp", width: 1600, height: 900 },
      { mime: "image/webp", ext: "webp", width: 640, height: 480 },
      { mime: "image/webp", ext: "webp", width: 4000, height: 3000 },
      { mime: "image/gif", ext: "gif", width: 320, height: 240 },
      { mime: "image/gif", ext: "gif", width: 1, height: 1 },
    ]);
  });

  it("SVG、HTML 改名、PDF、截断 JPEG、0 字节、尺寸为 0 → null", () => {
    const truncated = jpeg(100, 100).slice(0, 30);
    expect([SVG, HTML, PDF, truncated, new Uint8Array(0), gif89a(0, 10)].map(sniffImage)).toEqual([null, null, null, null, null, null]);
  });
});

// [MEDIA-UT-03] key 自描述：img/{yyyy}/{mm}/{id}_{w}x{h}_{rgb}.{ext}，日期取 UTC
describe("buildImageKey", () => {
  it("固定 id 与日期；UTC 月末 23:59 不受本地时区影响", () => {
    expect([
      buildImageKey({ id: "k3j9x2m4q1", width: 4032, height: 3024, rgb: "8a7b6c", ext: "jpg", now: new Date("2026-10-13T08:00:00Z") }),
      buildImageKey({ id: "k3j9x2m4q1", width: 1, height: 1, rgb: "808080", ext: "png", now: new Date("2026-10-31T23:59:59Z") }),
    ]).toEqual(["img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg", "img/2026/10/k3j9x2m4q1_1x1_808080.png"]);
  });

  it("随机 id：10 位 a-z2-7，两次不同", () => {
    const a = generateImageId();
    const b = generateImageId();
    expect({ format: /^[a-z2-7]{10}$/.test(a) && /^[a-z2-7]{10}$/.test(b), different: a !== b }).toEqual({ format: true, different: true });
  });
});

// [MEDIA-UT-04] 字段校验：rgb 6 位小写 hex，缺省 808080；width / height 若提供须为 1–20000 的整数
describe("validateUploadFields", () => {
  it("合法与缺省", () => {
    expect([validateUploadFields({ rgb: "8a7b6c", width: "4032", height: "3024" }), validateUploadFields({})]).toEqual([
      { rgb: "8a7b6c" },
      { rgb: "808080" },
    ]);
  });

  it.each([
    [{ rgb: "ZZZZZZ" }, ["rgb"]],
    [{ rgb: "../../x" }, ["rgb"]],
    [{ width: "0" }, ["width"]],
    [{ width: "-1", height: "100000" }, ["width", "height"]],
    [{ height: "12.5" }, ["height"]],
  ])("%j → VALIDATION_FAILED %j", (fields, invalid) => {
    expect(() => validateUploadFields(fields)).toThrow(expect.objectContaining({ code: "VALIDATION_FAILED", fields: invalid }));
  });
});

// [MEDIA-UT-05] 大小边界：图片 1 B – 5 MiB；0 字节按校验失败
describe("checkImageSize", () => {
  it("5,242,880 B 接受；5,242,881 B → FILE_TOO_LARGE；0 B → VALIDATION_FAILED", () => {
    const code = (size: number) => {
      try {
        checkImageSize(size);
        return "ok";
      } catch (error) {
        return (error as { code: string }).code;
      }
    };
    expect([code(1), code(5_242_880), code(5_242_881), code(0)]).toEqual(["ok", "ok", "FILE_TOO_LARGE", "VALIDATION_FAILED"]);
  });
});

// [MEDIA-UT-02][SC-LIVE-01] 视频按 ftyp major brand 白名单判定；未转封装的 MOV、HEIF 图片、HTML 拒绝；不解析编码
describe("sniffVideo", () => {
  it("isom / mp42 等 mp4 brand → true；qt MOV、heic、mif1、HTML、截断 → false", () => {
    const accepted = ["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V "].map((brand) => sniffVideo(ftyp(brand)));
    const rejected = [ftyp("qt  "), ftyp("heic"), ftyp("heix"), ftyp("mif1"), ftyp("msf1"), ftyp("M4A "), HTML, MP4.slice(0, 10), new Uint8Array(0)].map(sniffVideo);
    expect({ accepted, rejected }).toEqual({ accepted: new Array(9).fill(true), rejected: new Array(9).fill(false) });
  });
});

// [MEDIA-UT-05][SC-LIVE-06] 视频大小边界：1 B – 10 MiB；0 字节按校验失败
describe("checkVideoSize", () => {
  it("10,485,760 B 接受；10,485,761 B → VIDEO_TOO_LARGE；0 B → VALIDATION_FAILED video", () => {
    const outcome = (size: number) => {
      try {
        checkVideoSize(size);
        return "ok";
      } catch (error) {
        const { code, fields } = error as { code: string; fields?: string[] };
        return fields ? `${code}:${fields.join()}` : code;
      }
    };
    expect([outcome(1), outcome(10_485_760), outcome(10_485_761), outcome(0)]).toEqual(["ok", "ok", "VIDEO_TOO_LARGE", "VALIDATION_FAILED:video"]);
  });
});
