# US-05 图片上传 验收测试

**US ID**: US-05
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/behaviors.md)
**最后更新**: 2026-10-10
**Version Tag**: v1.0

> 验收用例从 behaviors.md 的 Given-When-Then 生成，叠加等价类、边界值、错误猜测与 NFR（nfr.md §2：上传需登录、仅 png/jpg/webp/gif、单张 ≤ 5MB）。
> 接口以 [media API 契约](../../../../../engineering/backend/domains/media/api-contract.md) 为准：上传 `POST /api/admin/images`（multipart，字段 `file`，可选 `rgb`）；返回站内路径 `/img/…`。

**文案说明**：前端格式拦截文案以 BH-06 为准（"仅支持 png、jpg、webp、gif"），服务端拒绝文案以 BH-08 为准（"不支持的图片格式"）。story.md AC4 写的是"不支持的图片格式"，与 BH-06 不一致，请在 design-ui 阶段统一（不阻塞本文档）。

---

## 测试数据策略

| 类别 | 策略 |
|------|------|
| 图片夹具 | 存放于 `tests/fixtures/images/`，由脚本生成，提交 git；文件大小用字节精确控制（PNG 末尾追加 tEXt 块填充，保证仍是合法 PNG） |
| 测试文章 | 每个 TC 通过 API 创建独立草稿（标题前缀 `[E2E-US05]` + 时间戳），互不共享 |
| 登录态 | `globalSetup` 登录一次并保存 `storageState`；需要未登录的 TC 使用全新 context |
| R2 对象 | 记录每次上传响应中的 URL/key 到 TC 上下文，`afterEach` 统一删除；R2 对象数断言基于测试前后 `list` 差集（测试环境使用独立 bucket 或前缀） |
| 网络模拟 | 离线用 `context.setOffline(true)`；失败用 `page.route('**/api/admin/images', r => r.abort())`；慢速用 `route` 内延迟后 `route.continue()` |
| 时间 | 无时间敏感断言；上传慢速场景使用固定 3s 延迟 |

**夹具清单**：

| 夹具 | 大小 | 实际内容 | 用途 |
|------|------|---------|------|
| `1x1.png` | 67 B | 合法 PNG（1×1 像素） | 最小有效文件 |
| `shot-200k.png` | 204,800 B | 合法 PNG | 粘贴截图 |
| `photo.jpg` | ≈ 150 KB | 合法 JPEG | 拖入 |
| `diagram.webp` | ≈ 80 KB | 合法 WebP | 工具栏选择 |
| `anim.gif` | ≈ 30 KB | 合法 GIF | 等价类 |
| `a.png` / `b.png` / `c.png` | 各 ≈ 10 KB，像素颜色不同 | 合法 PNG | 多张顺序 |
| `exact-5mb.png` | 5,242,880 B | 合法 PNG | 上边界（接受） |
| `over-5mb.png` | 5,242,881 B | 合法 PNG | 上边界 +1（拒绝） |
| `big-6mb.jpg` | 6,291,456 B | 合法 JPEG | BH-05 原始场景 |
| `logo.svg` | ≈ 1 KB | `<svg ...><script>alert(1)</script></svg>` | 不支持格式 + XSS 载荷 |
| `doc.pdf` | ≈ 10 KB | 合法 PDF | 不支持格式 |
| `fake.png` | ≈ 200 B | `<html><script>alert(1)</script></html>` 改名为 .png | Magic byte 伪造 |
| `svg-as.png` | ≈ 1 KB | logo.svg 内容改名为 .png | Magic byte 伪造（SVG） |
| `empty.png` | 0 B | 空 | 0 字节 |

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | 优先级 |
|-------|--------|------|------|--------|
| TC-US05-01 | SC-IMAGE-01 | 粘贴 200KB png 上传并插入引用 | e2e | P0 |
| TC-US05-02 | SC-IMAGE-02 | 拖入 photo.jpg 上传并插入到放置位置 | e2e | P0 |
| TC-US05-03 | SC-IMAGE-03 | 工具栏选择 diagram.webp 上传 | e2e | P0 |
| TC-US05-04 | SC-IMAGE-01, SC-IMAGE-03 | 等价类：gif 与 1x1.png 最小有效文件 | api | P1 |
| TC-US05-05 | SC-IMAGE-04 | 多张图片乱序完成仍按 a、b、c 顺序插入 | e2e | P1 |
| TC-US05-06 | SC-IMAGE-05 | 边界：恰好 5MB 接受 | e2e | P0 |
| TC-US05-07 | SC-IMAGE-05 | 边界：5MB+1 字节前端拒绝 | e2e | P0 |
| TC-US05-08 | SC-IMAGE-05 | 6MB jpg 绕过前端直调接口被拒 | api | P0 |
| TC-US05-09 | SC-IMAGE-06 | 拖入 svg 被前端拒绝 | e2e | P0 |
| TC-US05-10 | SC-IMAGE-06 | 工具栏选择 pdf 被前端拒绝 | e2e | P1 |
| TC-US05-11 | SC-IMAGE-04, SC-IMAGE-05, SC-IMAGE-06 | 混合拖入：仅合法图片被插入 | e2e | P1 |
| TC-US05-12 | SC-IMAGE-07 | 离线粘贴：移除占位并提示 | e2e | P0 |
| TC-US05-13 | SC-IMAGE-07 | 服务端 500 / 请求中断：移除占位并提示 | e2e | P1 |
| TC-US05-14 | SC-IMAGE-08 | HTML 改名 .png 被服务端拒绝 | security | P0 |
| TC-US05-15 | SC-IMAGE-08 | SVG 改名 .png 且伪造 Content-Type 被拒绝 | security | P0 |
| TC-US05-16 | SC-IMAGE-08 | 0 字节文件被拒绝 | api | P1 |
| TC-US05-17 | SC-IMAGE-08 | 未登录上传返回 401 | security | P0 |
| TC-US05-18 | SC-IMAGE-08 | 跨站 Origin 上传被拒（CSRF） | security | P1 |
| TC-US05-19 | SC-IMAGE-01, SC-IMAGE-08 | 对象 key 随机不可猜测，同名同内容不覆盖 | security | P0 |
| TC-US05-20 | SC-IMAGE-02, SC-IMAGE-08 | 路径穿越 / Unicode 文件名 | security | P1 |
| TC-US05-21 | SC-IMAGE-01 | 200KB 上传接口响应时间 | performance | P2 |
| TC-US05-22 | SC-IMAGE-02 | 拖放高亮提示"松开以上传" | ui-interaction | P1 |
| TC-US05-23 | SC-IMAGE-01 | 占位文本出现与替换、预览区渲染图片 | ui-interaction | P0 |
| TC-US05-24 | SC-IMAGE-09 | 上传期间在占位符前继续输入 | ui-interaction | P0 |
| TC-US05-25 | SC-IMAGE-07, SC-IMAGE-09 | 上传失败时上传期间输入的文字保留 | ui-interaction | P1 |

---

## TC-US05-01: 粘贴 200KB png 上传并插入引用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-01 |
| covers | SC-IMAGE-01 |
| Scenario | 剪贴板 png 截图粘贴到正文，上传成功后插入引用 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（通过 `page.evaluate` 派发带 `DataTransfer` 的 `paste` 事件） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】已创建草稿 `[E2E-US05] paste`，正文为 `第一段`
- 【环境前置】已登录；R2 测试 bucket 可写

**测试数据：** `shot-200k.png`（204,800 B，MIME `image/png`，剪贴板无文件名）

**步骤：**
1. 打开 `/admin/posts/{id}/edit`，光标置于正文 `第一段` 之后并回车
2. 派发 paste 事件，载荷为 `shot-200k.png`
3. 等待 `POST /api/admin/images` 响应

**预期结果：**
- 上传请求发起 1 次，返回 2xx，响应含图片 URL
- 正文光标处最终为 `![image](/img/{yyyy}/{mm}/{10 位随机}_{w}x{h}_{rgb}.png)`（站内路径，见 media API 契约），`第一段` 不变
- 预览区出现 `img`，`src` 等于该 URL，且 `naturalWidth > 0`
- R2 新增 1 个对象，大小 204,800 B

**清理：** 删除本次 R2 对象；删除测试草稿

---

## TC-US05-02: 拖入 photo.jpg 上传并插入到放置位置

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-02 |
| covers | SC-IMAGE-02 |
| Scenario | 文件拖放到编辑区指定位置，松开后上传并在放置位置插入 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`dispatchEvent('drop', { dataTransfer })`） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为三行：`行1` / `行2` / `行3`
- 【环境前置】已登录

**测试数据：** `photo.jpg`（合法 JPEG）；放置位置：`行2` 末尾

**步骤：**
1. 打开写文章页
2. 在 `行2` 所在位置派发 dragenter/dragover/drop，载荷 `photo.jpg`
3. 等待上传完成

**预期结果：**
- 在 `行2` 之后插入 `![photo](<URL>)`（alt 为去扩展名的文件名），`行1`、`行3` 不变
- URL 以 `.jpg` 结尾，可 GET 200 且 `Content-Type: image/jpeg`

**清理：** 删除 R2 对象；删除草稿

---

## TC-US05-03: 工具栏选择 diagram.webp 上传

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-03 |
| covers | SC-IMAGE-03 |
| Scenario | 点击工具栏"插入图片"，经文件选择器上传 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`page.waitForEvent('filechooser')` + `setFiles`） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `前文`，光标在末尾
- 【环境前置】已登录

**测试数据：** `diagram.webp`

**步骤：**
1. 点击工具栏"插入图片"
2. 在文件选择器中选择 `diagram.webp`
3. 等待上传完成

**预期结果：**
- 光标处插入 `![diagram](<URL>)`；`前文` 不变
- 文件选择器 `accept` 属性限定为 png/jpg/webp/gif

**清理：** 删除 R2 对象；删除草稿

---

## TC-US05-04: 等价类——gif 与最小有效文件

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-04 |
| covers | SC-IMAGE-01, SC-IMAGE-03 |
| Scenario | 有效格式等价类剩余成员（gif）与最小有效文件（67B png）均被接受 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录（携带会话 Cookie 与同源 Origin）

**测试数据：**

| 文件 | 预期 |
|------|------|
| `anim.gif` | 2xx，URL 以 `.gif` 结尾 |
| `1x1.png` | 2xx，URL 以 `.png` 结尾 |

**步骤：**
1. 分别以 multipart 调用 `POST /api/admin/images` 上传两文件
2. 对返回 URL 发起 GET

**预期结果：**
- 均返回 2xx，响应含 URL；GET 返回 200，`Content-Type` 分别为 `image/gif`、`image/png`，字节与原文件一致

**清理：** 删除 2 个 R2 对象

---

## TC-US05-05: 多张图片乱序完成仍按顺序插入

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-05 |
| covers | SC-IMAGE-04 |
| Scenario | 同时拖入 a、b、c，a 最慢完成，正文顺序仍为 a、b、c |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】空正文草稿
- 【环境前置】已登录；`page.route` 拦截上传请求：文件名为 a.png 的请求延迟 3s，b.png 延迟 1s，c.png 不延迟

**测试数据：** `a.png`、`b.png`、`c.png`（一次 drop 中的 3 个文件）

**步骤：**
1. 一次 drop 事件拖入 3 个文件
2. 等待 3 个上传响应全部返回

**预期结果：**
- 共发起 3 次上传请求
- 正文为 3 行，依次为 `![a](<URLa>)`、`![b](<URLb>)`、`![c](<URLc>)`，各自独占一行
- 无残留 `![上传中…]()`

**清理：** 删除 3 个 R2 对象；删除草稿

---

## TC-US05-06: 边界——恰好 5MB 接受

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-06 |
| covers | SC-IMAGE-05 |
| Scenario | 文件大小 = 5,242,880 B（上限本身）应被接受 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】空正文草稿
- 【环境前置】已登录

**测试数据：** `exact-5mb.png`（5,242,880 B）

**步骤：**
1. 拖入 `exact-5mb.png`
2. 等待上传完成
3. 另以 API 直接上传同一文件

**预期结果：**
- 未出现"图片不能超过 5MB"
- 正文插入 `![exact-5mb](<URL>)`；API 直传返回 2xx
- R2 对象大小 = 5,242,880 B

**清理：** 删除 2 个 R2 对象；删除草稿

---

## TC-US05-07: 边界——5MB+1 字节前端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-07 |
| covers | SC-IMAGE-05 |
| Scenario | 5,242,881 B 与 6MB 文件（粘贴/拖入）在前端被拦截 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `原文`
- 【环境前置】已登录；监听 `**/api/admin/images` 请求计数

**测试数据：**

| 输入方式 | 文件 | 大小 |
|---------|------|------|
| 拖入 | `over-5mb.png` | 5,242,881 B |
| 粘贴 | `big-6mb.jpg` | 6,291,456 B |

**步骤：**
1. 拖入 `over-5mb.png`
2. 粘贴 `big-6mb.jpg`

**预期结果：**
- 每次均显示提示"图片不能超过 5MB"
- 上传请求计数 = 0
- 正文仍为 `原文`，不插入任何内容（含占位文本）

**清理：** 删除草稿

---

## TC-US05-08: 6MB jpg 绕过前端直调接口被拒

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-08 |
| covers | SC-IMAGE-05 |
| Scenario | 服务端独立执行 5MB 上限校验 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录；记录 R2 测试前缀下对象数 N

**测试数据：** `over-5mb.png`（5,242,881 B）、`big-6mb.jpg`（6,291,456 B）

**步骤：**
1. 分别以 multipart 调用 `POST /api/admin/images`

**预期结果：**
- 均返回 4xx（400 或 413，以 API 契约为准），错误信息为"图片不能超过 5MB"
- R2 对象数仍为 N

**清理：** 无（无新增对象）；若断言失败产生对象则删除

---

## TC-US05-09: 拖入 svg 被前端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-09 |
| covers | SC-IMAGE-06 |
| Scenario | 无效格式等价类：svg（XSS 风险）拒绝 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `原文`
- 【环境前置】已登录；监听上传请求计数

**测试数据：** `logo.svg`（MIME `image/svg+xml`）

**步骤：**
1. 拖入 `logo.svg`

**预期结果：**
- 显示提示"仅支持 png、jpg、webp、gif"
- 上传请求计数 = 0；正文仍为 `原文`
- 页面未触发 `alert` 对话框

**清理：** 删除草稿

---

## TC-US05-10: 工具栏选择 pdf 被前端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-10 |
| covers | SC-IMAGE-06 |
| Scenario | 无效格式等价类：非图片文件（pdf）经文件选择器（绕过 accept）拒绝 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`setFiles` 不受 accept 限制） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `原文`
- 【环境前置】已登录

**测试数据：** `doc.pdf`

**步骤：**
1. 点击"插入图片"，`setFiles('doc.pdf')`

**预期结果：**
- 显示提示"仅支持 png、jpg、webp、gif"
- 不发起上传；正文仍为 `原文`

**清理：** 删除草稿

---

## TC-US05-11: 混合拖入——仅合法图片被插入

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-11 |
| covers | SC-IMAGE-04, SC-IMAGE-05, SC-IMAGE-06 |
| Scenario | 决策表：一次拖入合法、超大、非法格式混合文件 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】空正文草稿
- 【环境前置】已登录

**测试数据：** 一次拖入 `a.png`、`over-5mb.png`、`logo.svg`、`c.png`

**步骤：**
1. 一次 drop 拖入 4 个文件；等待上传完成

**预期结果：**

| 文件 | 结果 |
|------|------|
| `a.png` | 插入 `![a](<URL>)` |
| `over-5mb.png` | 提示"图片不能超过 5MB"，不上传 |
| `logo.svg` | 提示"仅支持 png、jpg、webp、gif"，不上传 |
| `c.png` | 插入 `![c](<URL>)`，位于 a 之后 |

- 上传请求计数 = 2；正文仅 2 行图片引用，顺序 a、c

**清理：** 删除 2 个 R2 对象；删除草稿

---

## TC-US05-12: 离线粘贴——移除占位并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-12 |
| covers | SC-IMAGE-07 |
| Scenario | 网络中断时上传失败，占位被移除，正文其他内容不变 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`context.setOffline(true)`） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `段落A` / `段落B`，光标在两段之间
- 【环境前置】已登录；页面加载完成后执行 `context.setOffline(true)`

**测试数据：** `shot-200k.png`

**步骤：**
1. 粘贴 `shot-200k.png`
2. 等待提示出现
3. `context.setOffline(false)`

**预期结果：**
- `![上传中…]()` 占位被移除
- 显示提示"上传失败，请重试"
- 正文严格等于 `段落A\n段落B`（与粘贴前逐字符一致）
- R2 无新增对象

**清理：** 删除草稿

---

## TC-US05-13: 服务端 500 / 请求中断——移除占位并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-13 |
| covers | SC-IMAGE-07 |
| Scenario | 错误猜测：非离线类失败同样走失败分支 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `原文`
- 【环境前置】已登录

**测试数据：**

| 模拟方式 | 写法 |
|---------|------|
| 连接中断 | `page.route('**/api/admin/images', r => r.abort('connectionreset'))` |
| 服务端错误 | `route.fulfill({ status: 500, body: '{}' })` |
| 超时 | `route` 挂起不响应，等待前端超时（以实现配置为准） |

**步骤：**
1. 对每种模拟方式分别粘贴 `1x1.png`

**预期结果：**
- 每种情况：占位被移除，显示"上传失败，请重试"，正文仍为 `原文`
- 失败后取消拦截再粘贴同一图片，可成功插入（失败不残留状态）

**清理：** 删除成功上传的 R2 对象；删除草稿

---

## TC-US05-14: HTML 改名 .png 被服务端拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-14 |
| covers | SC-IMAGE-08 |
| Scenario | Magic byte 伪造：扩展名与 Content-Type 均为 png，内容为 HTML |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录；记录 R2 测试前缀对象数 N

**测试数据：** `fake.png`，multipart part `Content-Type: image/png`，`filename="fake.png"`

**步骤：**
1. 调用 `POST /api/admin/images` 上传 `fake.png`

**预期结果：**
- 返回 400，错误信息"不支持的图片格式"
- R2 对象数仍为 N

**清理：** 无

---

## TC-US05-15: SVG 改名 .png 且伪造 Content-Type 被拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-15 |
| covers | SC-IMAGE-08 |
| Scenario | 服务端按文件头嗅探而非扩展名/MIME 判断，阻断 SVG XSS |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录；记录 R2 对象数 N

**测试数据：**

| 文件 | part Content-Type | 预期 |
|------|------------------|------|
| `svg-as.png` | `image/png` | 400 |
| `logo.svg` | `image/svg+xml` | 400 |
| `doc.pdf` 改名 `doc.jpg` | `image/jpeg` | 400 |
| `photo.jpg` 改名 `photo.png` | `image/png` | 2xx，存储类型以嗅探为准（`Content-Type: image/jpeg`） |

**步骤：**
1. 依次上传上表文件

**预期结果：**
- 前三项返回 400 "不支持的图片格式"，R2 不新增对象
- 第四项成功，返回 URL 的 GET 响应 `Content-Type: image/jpeg`
- 所有成功对象的响应头不出现 `text/html` 或 `image/svg+xml`

**清理：** 删除第四项产生的 R2 对象

---

## TC-US05-16: 0 字节文件被拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-16 |
| covers | SC-IMAGE-08 |
| Scenario | 边界值：大小下限 0 字节，无文件头 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录；记录 R2 对象数 N

**测试数据：** `empty.png`（0 B，part `Content-Type: image/png`）；另一请求不带 `file` 字段

**步骤：**
1. 上传 `empty.png`
2. 发送缺少 `file` 字段的 multipart 请求

**预期结果：**
- 均返回 400（`empty.png` 错误信息为"不支持的图片格式"），无 5xx
- R2 对象数仍为 N

**清理：** 无

---

## TC-US05-17: 未登录上传返回 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-17 |
| covers | SC-IMAGE-08 |
| Scenario | 权限：未登录 / 会话失效 / 伪造 Cookie 均不可上传 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】记录 R2 对象数 N

**测试数据：**

| 身份 | Cookie |
|------|--------|
| 访客 | 无 |
| 已登出 | 登出前保存的会话 Cookie |
| 伪造 | `session=deadbeefdeadbeefdeadbeef` |

文件：`1x1.png`

**步骤：**
1. 以上三种身份分别调用 `POST /api/admin/images`

**预期结果：**
- 均返回 401，不返回 URL
- R2 对象数仍为 N

**清理：** 无

---

## TC-US05-18: 跨站 Origin 上传被拒（CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-18 |
| covers | SC-IMAGE-08 |
| Scenario | 已登录但 Origin 非本站，写接口拒绝（nfr §2.2 写接口防护） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】持有有效会话 Cookie

**测试数据：** `Origin: https://evil.example.com`；文件 `1x1.png`

**步骤：**
1. 携带有效 Cookie 与上述 Origin 调用上传接口

**预期结果：**
- 返回 403（以 API 契约为准），R2 不新增对象

**清理：** 无

---

## TC-US05-19: 对象 key 随机不可猜测，同名同内容不覆盖

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-19 |
| covers | SC-IMAGE-01, SC-IMAGE-08 |
| Scenario | 随机命名：重复上传生成不同 key，旧对象不被覆盖 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录

**测试数据：** `a.png` 上传 2 次；`b.png` 改名为 `a.png` 上传 1 次

**步骤：**
1. 连续 3 次上传，记录 URL1、URL2、URL3
2. GET 三个 URL 并比对字节

**预期结果：**
- URL1、URL2、URL3 互不相同
- key 不包含原文件名 `a`，随机部分 ≥ 16 个十六进制/base62 字符（≥ 64 bit 熵）
- URL1、URL2 内容为 `a.png`，URL3 内容为 `b.png`（无覆盖）
- 对 URL1 随机部分 +1 / 改一个字符后 GET 返回 404

**清理：** 删除 3 个 R2 对象

---

## TC-US05-20: 路径穿越 / Unicode 文件名

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-20 |
| covers | SC-IMAGE-02, SC-IMAGE-08 |
| Scenario | 错误猜测：恶意或特殊文件名不影响存储路径，alt 文本安全 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】空正文草稿
- 【环境前置】已登录

**测试数据：**

| multipart filename | 内容 | 预期 alt |
|-------------------|------|---------|
| `../../a.png` | `a.png` | 不含 `/`、`..`（如 `a`） |
| `截图 2026-10-10 下午.png` | `1x1.png` | `截图 2026-10-10 下午` |
| `x](javascript:alert(1)).png` | `1x1.png` | 不破坏 Markdown 结构（`]`、`(` 被转义或移除） |

**步骤：**
1. 通过 API 上传第 1 行，检查返回 URL
2. 通过 e2e 拖入第 2、3 行文件，检查正文与预览

**预期结果：**
- 返回 URL 路径位于图片前缀下，不含 `..`、原文件名；R2 中不存在 `a.png` 或上级目录对象
- 第 2 行插入 `![截图 2026-10-10 下午](<URL>)`，预览正常显示
- 第 3 行：预览区仅渲染 1 个 `img`，不出现 `href^="javascript:"` 链接，无 `alert`

**清理：** 删除 3 个 R2 对象；删除草稿

---

## TC-US05-21: 200KB 上传接口响应时间

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-21 |
| covers | SC-IMAGE-01 |
| Scenario | NFR：写作接口 P95 < 500ms（nfr §1，图片上传按写作接口对待） |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（部署后测试环境执行） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】部署于 Cloudflare 测试环境（非本地 wrangler dev）；已登录

**测试数据：** `shot-200k.png`，串行上传 50 次

**步骤：**
1. 串行上传 50 次，记录每次服务端耗时（Cloudflare 日志或 `Server-Timing`）

**预期结果：**
- 服务端耗时 P95 < 500ms；无失败请求

**清理：** 删除 50 个 R2 对象

---

## UI 交互测试

### TC-US05-22: 拖放高亮提示"松开以上传"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-22 |
| covers | SC-IMAGE-02 |
| Scenario | 拖入经过编辑区时显示高亮与提示，离开/放下后消失 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】已登录，打开写文章页

**测试数据：** `photo.jpg`

**步骤：**
1. 在编辑区派发 `dragenter` + `dragover`（含文件）
2. 派发 `dragleave`
3. 再次 `dragenter` 后 `drop`

**预期结果：**
- 步骤 1 后编辑区高亮，显示"松开以上传"
- 步骤 2 后高亮与提示消失
- 步骤 3 后高亮消失，开始上传

**playwright_hint：**
```ts
const dt = await page.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })); return d; });
await editor.dispatchEvent('dragenter', { dataTransfer: dt });
await expect(page.getByText('松开以上传')).toBeVisible();
await editor.dispatchEvent('dragleave', { dataTransfer: dt });
await expect(page.getByText('松开以上传')).toBeHidden();
```

**清理：** 删除 R2 对象（若已上传）

---

### TC-US05-23: 占位文本出现与替换、预览区渲染图片

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-23 |
| covers | SC-IMAGE-01 |
| Scenario | 上传中可见占位，完成后被替换，预览同步 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】空正文草稿
- 【环境前置】上传请求经 `page.route` 延迟 2s 后 `continue()`

**测试数据：** `shot-200k.png`（粘贴）

**步骤：**
1. 粘贴图片，立即读取编辑区文本
2. 等待上传响应

**预期结果：**
- 步骤 1：编辑区包含 `![上传中…]()`，预览区无该图片
- 步骤 2：占位不存在，编辑区为 `![image](<URL>)`，预览区 `img[src="<URL>"]` 可见

**playwright_hint：**
```ts
await page.route('**/api/admin/images', async r => { await new Promise(f => setTimeout(f, 2000)); await r.continue(); });
await expect(editor).toContainText('![上传中…]()');
await expect(editor).not.toContainText('上传中…', { timeout: 10000 });
await expect(preview.locator('img')).toHaveAttribute('src', /^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.png$/);
```

**清理：** 删除 R2 对象；删除草稿

---

### TC-US05-24: 上传期间在占位符前继续输入

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-24 |
| covers | SC-IMAGE-09 |
| Scenario | 占位符位置因前方输入而偏移，替换仍落在占位符处 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `开头`，光标在末尾并回车
- 【环境前置】上传请求延迟 3s

**测试数据：** 粘贴 `shot-200k.png`；上传期间在 `开头` 前输入 `新增文字，`；并在占位符之后另起一行输入 `结尾`

**步骤：**
1. 粘贴图片，占位出现
2. 光标移到文档最开头，输入 `新增文字，`
3. 光标移到文档末尾，回车输入 `结尾`
4. 等待上传完成

**预期结果：**
- 最终正文为 `新增文字，开头\n![image](<URL>)\n结尾`
- 新输入文字保持不变；图片引用恰好替换占位位置；无残留占位

**playwright_hint：**
```ts
await editor.press('Control+Home'); await page.keyboard.type('新增文字，');
await editor.press('Control+End'); await page.keyboard.press('Enter'); await page.keyboard.type('结尾');
await expect(editor).toHaveText(/^新增文字，开头\n!\[image\]\(https:\/\/[^)]+\)\n结尾$/);
```

**清理：** 删除 R2 对象；删除草稿

---

### TC-US05-25: 上传失败时上传期间输入的文字保留

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-25 |
| covers | SC-IMAGE-07, SC-IMAGE-09 |
| Scenario | 错误猜测：上传中编辑 + 最终失败，仅移除占位不回滚编辑 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文为 `开头`
- 【环境前置】上传请求延迟 2s 后 `route.abort()`

**测试数据：** `shot-200k.png`；上传期间在开头输入 `补充`

**步骤：**
1. 粘贴图片
2. 在文档最开头输入 `补充`
3. 等待失败提示

**预期结果：**
- 显示"上传失败，请重试"
- 正文为 `补充开头`（加占位前的换行规则以实现为准），不含 `上传中…`

**playwright_hint：**
```ts
await page.route('**/api/admin/images', async r => { await new Promise(f => setTimeout(f, 2000)); await r.abort(); });
await expect(page.getByText('上传失败，请重试')).toBeVisible();
await expect(editor).toContainText('补充开头');
await expect(editor).not.toContainText('上传中…');
```

**清理：** 删除草稿

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-IMAGE-01 | BH-01 粘贴图片上传 | TC-US05-01, TC-US05-04, TC-US05-19, TC-US05-21, TC-US05-23 |
| SC-IMAGE-02 | BH-02 拖入图片上传 | TC-US05-02, TC-US05-20, TC-US05-22 |
| SC-IMAGE-03 | BH-03 工具栏选择图片 | TC-US05-03, TC-US05-04 |
| SC-IMAGE-04 | BH-04 多张按顺序插入 | TC-US05-05, TC-US05-11 |
| SC-IMAGE-05 | BH-05 超过 5MB 拒绝 | TC-US05-06, TC-US05-07, TC-US05-08, TC-US05-11 |
| SC-IMAGE-06 | BH-06 不支持格式拒绝 | TC-US05-09, TC-US05-10, TC-US05-11 |
| SC-IMAGE-07 | BH-07 上传失败移除占位 | TC-US05-12, TC-US05-13, TC-US05-25 |
| SC-IMAGE-08 | BH-08 服务端校验真实类型 | TC-US05-14, TC-US05-15, TC-US05-16, TC-US05-17, TC-US05-18, TC-US05-19, TC-US05-20 |
| SC-IMAGE-09 | BH-09 上传期间继续编辑 | TC-US05-24, TC-US05-25 |

| 验收标准（story.md §2） | TC-IDs |
|------------------------|--------|
| AC1 粘贴/拖入 | TC-US05-01, TC-US05-02, TC-US05-23 |
| AC2 工具栏 | TC-US05-03 |
| AC3 超过 5MB | TC-US05-06, TC-US05-07, TC-US05-08 |
| AC4 不支持格式 | TC-US05-09, TC-US05-10, TC-US05-15 |
| AC5 网络失败 | TC-US05-12, TC-US05-13 |
| AC6 多张 | TC-US05-05, TC-US05-11 |
| 约束：随机命名 / 需登录 | TC-US05-19, TC-US05-17 |

**Gap 检查**：behaviors.md 中 SC-IMAGE-01 ~ SC-IMAGE-09 共 9 个 SC-ID，均有 ≥ 1 个 TC 覆盖。

**Gap: 无**

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-13 | v1.1 | 图片 URL 改为站内 `/img/…` 路径，接口引用 media API 契约（design-domain） | miraclehifi |
