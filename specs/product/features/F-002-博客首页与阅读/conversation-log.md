# 对话记录 — F-002

> 本文件由 sdd:log-conversation 自动维护，记录每个 SDD 阶段结束时的关键决策与对话摘要。

## [define-feature] 2026-10-15 · miraclehifi

**关键决策**
- 文章封面在 F-002 内作为 F-001 增量完成：post 新增封面字段（迁移 0003）、设置抽屉上传、公开接口返回
- 灯箱（DepthCarousel 层叠、引入 gsap）纳入 F-002
- 列表摘要优先用 F-001 已有的 `summary` 字段，没填时截正文纯文本约 120 字
- 顶栏书影音、RSS、摄影外链照常显示，功能上线前为 404（F-002 补读者端 404 页）
- 首页个人内容放配置文件 `src/config/site.ts`，先用占位内容，真实文案由作者提供
- 成功指标：零 Worker CPU、发布后 P95 ≤ 5 分钟可见、草稿 100% 不可见、手机 Lighthouse ≥ 90 / CLS < 0.1、390 宽三栏 / 目录 / 灯箱可用；性能要求已在全局 NFR，不另建 Feature nfr.md
- F-002 开发全部完成后，再统一做 F-001 + F-002 的 code-review、verify 与全量回归；任务内仍按 TDD 写本任务测试

**对话摘要**
- 用户：「Sprint 3 收尾，然后开始F-002 博客首页与阅读的开发，全部开发完成后再做测试」
- AI：Sprint 3 收尾（修 TC-US09-02 竞态、DoD 勾选、状态收口）后建 F-002；就封面、灯箱、摘要来源、未上线入口、成功指标、首页内容维护方式提问
- 用户：封面「F-002 一起做」；灯箱纳入；摘要优先用字段；未完成入口「照常显示」；成功指标按推荐；首页内容用配置文件

## [design-domain] 2026-10-15 · miraclehifi

**关键决策**
- 用户授权「文档都按照你的设计来，不要找我确认」：write-story 起各文档阶段由 AI 直接定稿
- design-ui：06 先行稿拆为首页（自我介绍）与 `/posts`（07）；窄屏目录改为浮动按钮 + 底部抽屉；新增 404（08）与 `BackLink` 组件；`/posts` 第 1 页加标签索引（补 US-04 验收 8）
- design-arch：不新增 Domain；构建数据经 Vite 虚拟模块 `virtual:reader-data` 一次性注入（`READER_API_ORIGIN` / `READER_FIXTURE` / `READER_BOOTSTRAP`），预渲染保持 workerd（middleware 依赖 `cloudflare:workers`）；Deploy Hook 经 `locals.cfContext.waitUntil` 触发，失败只记日志（ADR-007）
- 读者页交互原生脚本优先，React 岛只用于正文图片 + 灯箱、文章列表；首页与 404 不加载 React（ADR-008）
- 封面存为站内图片地址字符串（自描述 key 已含宽高与主色），迁移 0003 加 `cover` / `pub_cover`；`contentHash` 仅在封面非空时追加第 7 项，旧数据哈希不变
- 引用署名放进 markdown 共享内核（`rehypeQuoteAttribution`），预览与读者页一致；h1 降级、首字下沉标记、标题 id 在读者页后处理

**对话摘要**
- 用户：「文档都按照你的设计来，不要找我确认」
- AI：按 Backlog 与先行稿定 UI，按适配器实测能力（预渲染默认 workerd、`cfContext.waitUntil`）定构建与重建方案，spike 列为 Sprint 首个任务

## [verify] 2026-10-15 · miraclehifi

**关键决策**
- F-002 验证通过：83 个 TC 中 82 个已覆盖，TC-US03-10（线上发布到可见时长）留到上线后实测
- 回归中发现灯箱懒加载首次打开时焦点移入有约 100ms 空窗（WebKit 下 Esc 无效），改为 `useLayoutEffect` 设置初始焦点，计入 code-review MUST-FIX
- Lighthouse（本地移动端模拟）：首页 91 分、LCP 1.5s 达标；`/posts` 与文章页的 LCP 超标，原因是本地 preview 不压缩 CSS（88KB，gzip 后 16.7KB），上线后用线上地址复测
- 发布时机跟随 F-001（读者端内容来自后台写作）

**对话摘要**
- 用户：「继续」（接上 Sprint 4 完成后的状态）
- AI：发现工作区有另一会话留下、未提交且无记录的 code-review 修复，`npm run check` 有 2 个错误，询问如何接手
- 用户：选「接手并收尾」（补记审查、修 check、跑回归、分批提交，再进入 verify）
- AI：verify 前询问是否做本地联调（dev:local + Playwright 走完整旅程并截图）
- 用户：选「不做联调」
