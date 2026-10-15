# 文章封面 验收测试

**US ID**: US-06
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-06-post-cover/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-06-post-cover/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。上传沿用 F-001 `POST /api/admin/images`；封面字段名 `cover` 与校验规则以 design-domain 为准。
> 封面是站内图片地址字符串（自描述 key，见 F-001 ADR-005）；无封面为 `null`。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US06-01 | SC-COVER-01 | 选择图片上传封面 | P0 | ui-interaction |
| TC-US06-02 | SC-COVER-02 | 拖入图片设置封面 | P1 | ui-interaction |
| TC-US06-03 | SC-COVER-03 | 更换与移除 | P0 | ui-interaction |
| TC-US06-04 | SC-COVER-04 | 上传失败保留原封面 | P1 | ui-interaction |
| TC-US06-05 | SC-COVER-05 | 已发布文章改封面 → 有未发布修改 | P0 | e2e |
| TC-US06-06 | SC-COVER-06 | 接口返回 cover 字段 | P0 | integration |
| TC-US06-07 | SC-COVER-07 | 动态照片作封面只传静态图 | P2 | e2e |
| TC-US06-08 | SC-COVER-08 | 封面字段校验 | P0 | integration |
| TC-US06-09 | SC-COVER-06 | 迁移后旧文章 cover 为 null | P1 | integration |

---

## 功能 / 接口测试

### TC-US06-05: 已发布文章改封面 → 有未发布修改

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-05 |
| covers | SC-COVER-05 |
| Scenario | 已发布文章改封面 → 有未发布修改 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 已发布文章（无未发布修改），封面 A

**步骤：**
1. 更换封面为 B，等待"已保存"
2. `GET /api/posts/:slug`
3. 点"发布更新"后再次 `GET /api/posts/:slug`

**预期结果：**
- 状态显示"有未发布修改"
- 发布更新前公开接口 `cover` 为 A
- 发布更新后为 B

**清理：** `resetPosts()`

---

### TC-US06-06: 接口返回 cover 字段

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-06 |
| covers | SC-COVER-06 |
| Scenario | 接口返回 cover 字段 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory：已发布有封面文章 P1、已发布无封面 P2

**步骤：**
1. `GET /api/posts/:slug`、`GET /api/posts`、`GET /api/admin/posts/:id`、`GET /api/admin/posts`

**预期结果：**
- P1：四个接口都有 `cover`，值为 `/img/yyyy/mm/{10 位}_{宽}x{高}_{6 位 hex}.{ext}`
- P2：`cover: null`
- 公开接口的 `cover` 取自已发布快照，后台接口取自工作稿

**清理：** `resetPosts()`

---

### TC-US06-07: 动态照片作封面只传静态图

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-07 |
| covers | SC-COVER-07 |
| Scenario | 动态照片作封面只传静态图 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】chromium-media 项目；OPPO 动态照片夹具

**步骤：**
1. 在封面区选择动态照片

**预期结果：**
- 上传请求只有 `file` 字段，没有 `video`
- 封面缩略图不显示 LIVE

**清理：** `resetPosts()`

---

### TC-US06-08: 封面字段校验

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-08 |
| covers | SC-COVER-08 |
| Scenario | 封面字段校验 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 草稿

**测试数据：**

| 字段 | 值 |
|------|------|
| 非法 cover | `'https://evil.example.com/a.jpg'`；`'/img/../etc/passwd'`；`'/img/2026/10/abc.jpg'`（key 格式不符）；`123`；`'javascript:alert(1)'` |
| 合法 cover | `null`；`'/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg'`（key 的 10 位 id 为 base32 `[a-z2-7]`） |

**步骤：**
1. `PUT /api/admin/posts/:id` 携带完整 DraftInput 与各 cover 值

**预期结果：**
- 非法值 → 400 `VALIDATION_FAILED`，`fields` 含 `cover`，文章未被修改
- 合法值 → 200
- 缺 `cover` 字段 → 400（DraftInput 字段齐全规则沿用 F-001）

**清理：** `resetPosts()`

---

### TC-US06-09: 迁移后旧文章 cover 为 null

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-09 |
| covers | SC-COVER-06 |
| Scenario | 迁移后旧文章 cover 为 null |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】迁移 0003 之前的库中有已发布文章

**步骤：**
1. 应用迁移 0003；读取公开与后台接口

**预期结果：**
- 旧文章 `cover: null`，`hasUnpublishedChanges` 不因迁移变为 true（工作稿与快照哈希一致）

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US06-01: 选择图片上传封面

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-01 |
| covers | SC-COVER-01 |
| Scenario | 选择图片上传封面 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 草稿，无封面
- 【环境前置】已登录，在写文章页，设置抽屉已打开

**步骤：**
1. 在"封面"区点"选择图片"，选择 `fixture.jpg`

**预期结果：**
- 封面区显示"上传中…"
- 完成后显示缩略图（`alt="封面"`）与"更换""移除"按钮
- 随后发出 1 次自动保存 `PUT`，请求体 `cover` 为上传返回的地址；保存状态变为"已保存"

**playwright_hint：**
```ts
const drawer = page.getByRole('complementary', { name: '文章设置' });
await drawer.getByLabel('选择封面图片').setInputFiles('tests/e2e/fixtures/fixture.jpg');
await expect(drawer.getByRole('img', { name: '封面' })).toBeVisible();
```

**清理：** `resetPosts()`

---

### TC-US06-02: 拖入图片设置封面

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-02 |
| covers | SC-COVER-02 |
| Scenario | 拖入图片设置封面 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 同 TC-US06-01

**步骤：**
1. 把 png 拖到封面区（`dragenter` → `drop`）

**预期结果：**
- 拖入时封面区高亮（`data-dragover`）
- 放下后上传并显示缩略图
- 拖入非图片文件（`.txt`）显示"仅支持 png、jpg、webp、gif"，不上传

**playwright_hint：**
```ts
await dropFiles(page, drawer.getByTestId('cover-dropzone'), ['fixture.png']);
```

**清理：** `resetPosts()`

---

### TC-US06-03: 更换与移除

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-03 |
| covers | SC-COVER-03 |
| Scenario | 更换与移除 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 草稿，已有封面 A

**步骤：**
1. 点"更换"选择图片 B；点"移除"
2. 读取 R2 中 A、B 的对象

**预期结果：**
- 更换后显示 B，自动保存请求 `cover` 为 B
- 移除后封面区回到空状态，自动保存请求 `cover: null`
- R2 中 A、B 对象仍存在

**清理：** `resetPosts()`

---

### TC-US06-04: 上传失败保留原封面

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-04 |
| covers | SC-COVER-04 |
| Scenario | 上传失败保留原封面 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 草稿，已有封面 A

**测试数据：**

| 字段 | 值 |
|------|------|
| 文件 | `a.bmp`；正常 jpg 但上传接口被 route 成 500；`big.jpg`（> 50MB，内存构造） |

**步骤：**
1. 分别选择三种文件

**预期结果：**
- 分别提示"仅支持 png、jpg、webp、gif""上传失败，请重试""图片不能超过 50MB"（`role="alert"`）
- 封面仍为 A，不发自动保存

**清理：** `resetPosts()`

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-COVER-01 | TC-US06-01 |
| SC-COVER-02 | TC-US06-02 |
| SC-COVER-03 | TC-US06-03 |
| SC-COVER-04 | TC-US06-04 |
| SC-COVER-05 | TC-US06-05 |
| SC-COVER-06 | TC-US06-06, TC-US06-09 |
| SC-COVER-07 | TC-US06-07 |
| SC-COVER-08 | TC-US06-08 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
