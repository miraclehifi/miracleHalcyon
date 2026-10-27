# IGDB 封面图片头夹具（F-005 游戏封面，ADR-013）

只含解析宽高所需的文件头加填充字节，不是可显示的完整图片；用于 `readImageSize`（SHELF-UT-13）与 `igdbStub`（集成测试）。由脚本按格式规范逐字节构造，2026-10-27 生成。

| 文件 | 内容 | 期望宽高 |
|------|------|---------|
| `baseline-exif-810x1080.jpg` | 基线 JPEG：SOF0 之前有 APP1 Exif 段（段内含 `FF C0` 字节）与 DQT 段 | 810×1080 |
| `progressive-811x1080.jpg` | 渐进式 JPEG：APP0 JFIF 后接 SOF2，段间有填充字节 `FF` | 811×1080 |
| `ihdr-600x900.png` | PNG 签名 + IHDR | 600×900 |
| `vp8-720x960.webp` | 有损 WebP（`VP8 ` 块） | 720×960 |
| `vp8l-1000x1333.webp` | 无损 WebP（`VP8L` 块） | 1000×1333 |
| `vp8x-1200x1600.webp` | 扩展 WebP（`VP8X` 块） | 1200×1600 |

| `co8h3y-810x1080.jpg` | 可解码的完整 JPEG（纯色，sharp 生成）：E2E 用 `page.route` 冒充 `images.igdb.com/…/co8h3y.jpg`，验证预览按原比例显示 | 810×1080 |
| `co5vmg-811x1080.jpg`、`cobg300-600x900.jpg` | 同上，读者页游戏海报墙 E2E（`reader-media.spec.ts` 的 `routeIgdb`）冒充"塞尔达传说：王国之泪""博德之门 3"的封面；2026-10-27 生成 | 811×1080、600×900 |

截断数据、svg 文本、gif 由测试代码按需构造。
