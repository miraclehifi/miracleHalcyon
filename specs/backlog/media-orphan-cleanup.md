# 后台未引用媒体检测与清理

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Feature |
| 优先级 | P1-High |
| 来源 | 作者需求（图片存储治理） |
| 日期 | 2026-10-16 |
| 创建者 | miraclehifi |

## 描述

文章编辑时删掉图片、替换封面、删除文章后，R2 对象和 D1 `images` 记录一直留着，没有入口统计和清理。本条目在后台新增"媒体管理"页：统计未被任何文章引用的图片和实况视频，并可一键清理。

上传体验部分（进度条、浏览器端压缩、实况开关）拆到 [media-upload-experience](media-upload-experience.md)。

## 规则

### 1. 什么算"被引用"

- 扫描全部文章（草稿 + 已发布）的四列：工作稿 `body`、`cover`，已发布快照 `pub_body`、`pub_cover`。已发布快照是线上文章（含构建时预渲染的读者页）实际使用的内容，漏扫会把线上正在用的图删掉
- 在这四列全文中按图片 key 正则匹配（`img/\d{4}/\d{2}/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png|jpg|webp|gif)`），不限于 `![]()` 写法：手写链接、HTML 标签中的引用同样算引用
- 实况视频被引用 = 对应图片至少有一处引用的 URL 片段（按 `,` 拆分）含 `live`

### 2. 什么算"未引用"

| 类型 | 条件 | 清理动作 |
|------|------|---------|
| 未引用图片 | `images` 中的 key 在四列中都没有出现 | 删 R2 图片对象（有视频的连同 `.live.mp4`）+ `DELETE` 该行 |
| 未引用实况视频 | 图片仍被引用，但没有任何一处引用带 `live`（例如作者在 ImageMenu 取消了实况） | 只删 R2 `.live.mp4` + `UPDATE images SET video_key = NULL, video_size = NULL` |

- **保护期**：`created_at` 在 24 小时内的记录不参与统计和清理。原因：刚上传的图片要等自动保存（≤ 3s）后才写进 `body`；作者删掉图片后撤销（Ctrl+Z）也会出现同样的短暂空窗。清理前的再次扫描解决不了这个问题，因为引用还没存进库
- 已清理视频的图片重新加上 `#live`：预览按 US-11 AC8 的降级方式处理（视频播放失败时只显示静态图、隐藏 `LIVE` 标记）；ImageMenu 不显示实况勾选项（见 [media-upload-experience](media-upload-experience.md) 模块 3）
- 文章删除是物理删除，删除后其图片在保护期过后按未引用处理（符合预期）

### 3. 页面 `/admin/storage`（不用 `/admin/media`，避免与 F-005 书影音冲突）

只显示数据，不加载、不渲染任何图片：

- 三项统计：未引用图片（张数 + 体积，取 `images.size`）、未引用实况视频（个数 + 体积，取 `video_size`）、预计可释放（合计，高亮）
- 附注"近 24 小时上传的 N 项不参与清理"
- "重新检测"按钮 + 检测时间（页面本次请求的时间，不持久化）
- "一键清理未引用资源"：数量为 0 时禁用并显示"存储状态良好，无未引用文件"；点击后弹二次确认（不可撤销，列出将清理的数量与体积）→ 成功后统计刷新，Toast"已清理 X 项，释放 Y MB"
- `AdminHeader` 增加"存储"导航入口

## 接口（草案，design-domain 定稿）

沿用现有会话校验与 Origin 校验（401 / 403 见 auth API 契约）。

**`GET /api/admin/storage/orphans`** → 200

```json
{
  "summary": {
    "orphanImageCount": 12,
    "orphanImageBytes": 18450120,
    "orphanVideoCount": 3,
    "orphanVideoBytes": 8102340,
    "totalOrphanBytes": 26552460,
    "protectedCount": 2
  }
}
```

**`POST /api/admin/storage/cleanup`**（无请求体，只支持全量清理）→ 200

```json
{ "removedImages": 12, "removedVideos": 3, "freedBytes": 26552460 }
```

- 服务端在清理时重新扫描，按扫描结果执行，不依赖前端传入的 key
- 顺序：先删 R2，再改 D1；任一步失败返回 500，已完成部分保留，重跑可继续（幂等）
- 分批：R2 `delete(keys)` 每批 ≤ 1000；D1 `IN (...)` 按参数上限分批

## 目标与验收

**目标**: 作者能在后台看到未引用资源占用并一键清理，且不会误删任何文章（含线上已发布版本）正在使用的文件。

**验收条件**:
- [ ] 只被草稿 `body` 引用的图片不算未引用
- [ ] 工作稿已删掉、但已发布快照 `pub_body` / `pub_cover` 仍在用的图片不算未引用
- [ ] 24 小时内上传、尚未被引用的图片不参与统计和清理，并计入 `protectedCount`
- [ ] 图片仍被引用但所有引用都不带 `live` 时，清理只删视频：R2 `.live.mp4` 删除、`video_key` / `video_size` 置空，图片照常显示
- [ ] 清理后 R2 对象与 D1 记录被删除，重新检测数量为 0；未引用数为 0 时清理按钮禁用
- [ ] 页面不发出任何图片 / 视频请求
- [ ] 单元、集成（workers）、E2E 测试通过，`npm run lint`、`npm run check` 无报错

## 影响分析

- **新页面 / 新组件**：`/admin/storage` 页面规格（`specs/ui/pages/`）、site-map、components.md 新增组件；AdminHeader 导航变更 → 必须走 design-ui
- **media 领域**：domain-model 新增"引用 / 未引用 / 保护期"规则；api-contract 新增两个接口；data-model 无 DDL 变更（只用已有列）
- **跨 Feature**：读取 post 领域的四列（只读，需要 post 领域对外提供一个"全部引用文本"的查询，或 media 直接读表，design-arch 决定）；F-002 读者页使用 `pub_body` / `pub_cover`，已在扫描范围内
- **代码（预估）**：`src/domains/media/`（repo、service）、`src/pages/api/admin/storage/`、`src/pages/admin/storage.astro`、新的后台页面组件、`src/components/admin/AdminHeader.tsx`
- **不在范围**：R2 中存在但 D1 无记录的对象（上传失败已回滚，正常不会出现）；图片库浏览

## 路由

SDD 全流程（新页面、新工作流、可独立交付）→ 新建 [F-006 媒体存储清理](../product/features/F-006-媒体存储清理/feature-scope.md)（2026-10-16）。

与 [media-upload-experience](media-upload-experience.md) 可并行：改动文件不重叠；"取消实况后视频可被清理"的规则两边都写明了，不互相阻塞。

## 估算

- **规模**: M
