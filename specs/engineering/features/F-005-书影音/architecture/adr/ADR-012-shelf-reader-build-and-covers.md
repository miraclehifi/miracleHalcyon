# ADR-012: 书影音读者页的构建数据、路由与封面读取

## 状态
Accepted（2026-10-21，F-005 design-arch；作者偏好文档阶段不逐项确认，待事后审阅）

## 背景
- 读者页一律构建时预渲染、发布后重建（ADR-001 修订、ADR-007）。`/media` 要沿用同一机制
- design-ui 已定：分类用路径路由 `/media`（书）+ `/media/:type`，分类标签是普通链接，无切换脚本
- 封面存在 R2，读者页与后台都要能读到

## 决策

### 1. 公开只读接口 `GET /api/shelf`
- 返回全部**显示中**的条目（不含隐藏），字段为读者页所需的最小集：`type`、`title`、`creator`、`year`、`status`、`rating`、`markedOn`、`comment`、`cover`（站内路径或 `null`）、`doubanUrl`；不返回 `id`、`doubanId`、`hidden`、时间戳
- 不分页（千条量级，单次 JSON < 1 MB）；排序由读者端纯函数负责
- 与 `GET /api/posts` 一样不需要登录；middleware 只保护 `/api/admin/*`

### 2. 构建数据：在 `readerData()` 插件中增加 `virtual:shelf-data`
- 同一个 Vite 插件新增虚拟模块 `virtual:shelf-data`，默认导出 `{ entries: ShelfReaderEntry[] }`；取数规则完全沿用 `virtual:reader-data`：
  - `READER_FIXTURE` → `tests/fixtures/reader/{名}.shelf.json`（不存在时视为空数组，避免改动现有夹具）
  - `READER_API_ORIGIN` → `GET {origin}/api/shelf`，超时 15 秒
  - `READER_BOOTSTRAP=1` 且接口不可达 → 空数组并警告；否则失败使构建失败
  - **兼容旧线上**：接口返回 404（新代码首次部署时，构建先于 Worker 更新）→ 视为空数组并警告，不让首次上线卡住
- 只允许预渲染页面引用；构建产物检查运行时 Worker 包不含其内容（同 ADR-007）

### 3. 读者页路由
- `src/pages/media/index.astro`（书）与 `src/pages/media/[type].astro`（`getStaticPaths` 生成 5 个分类），`prerender = true`
- `/media/book` 与未知分类不生成，命中站点 404
- 视图模型由纯函数 `src/lib/reader/shelf.ts` 计算：按分类分组、排序（进行中优先 → `markedOn` 降序 → 同日按接口顺序，接口按 `id` 降序输出保证确定）、计数文案

### 4. 封面读取 `GET /covers/{yyyy}/{mm}/{file}`
- R2 key `covers/{yyyy}/{mm}/{12 位随机 base32}.{jpg|png|webp}`，URL 与 key 同形（`/covers/...`）
- 路由 `src/pages/covers/[...key].ts`：只接受上述格式，读 R2 返回，`Cache-Control: public, max-age=31536000, immutable`、`Content-Type` 取对象元数据；不存在 404
- key 不可变：换封面 = 新 key + 删旧对象，无缓存失效问题
- 与 `/img/*` 分开：`/img/*` 的 key 格式自描述宽高与主色（ADR-005），封面不需要这些；也避免 F-006 的引用扫描把封面当作未登记图片

### 5. 重建
条目新增、编辑、隐藏状态变化、删除后调用 `ShelfHooks.onShelfChanged()`；路由层用 `createDeployHookHooks` 适配（同一个 `DEPLOY_HOOK_URL`、`waitUntil`、失败只记日志）。`shelf` 领域只认识自己的钩子接口。

## 后果
- 正面：读者页零运行时数据库访问，除分类导航岛与电影、剧集海报墙岛外零 JS（2026-10-22 分类导航改用 GooeyNav、电影与剧集改为翻面海报墙，见 [gooey-media-tabs](../../../../../backlog/gooey-media-tabs.md)、[media-poster-wall](../../../../../backlog/media-poster-wall.md)；海报墙条目仍在静态 HTML 中完整输出）；与文章页同一套构建、夹具、重建与首次部署流程；封面长期缓存
- 负面：构建多一个请求；`/covers/*` 每次未命中缓存的读取消耗一次 Worker 调用（与 `/img/*` 相同）
- 风险：低。插件与路由形态已在 F-002 验证（ADR-007 验证结果 ①–③）
