# 用户流程（作者后台 · 读者端）

**最后更新**: 2026-10-10
**关联 Feature**: F-001-文章写作、F-002-博客首页与阅读

## 1. 页面跳转

```mermaid
graph LR
    Any["任意 /admin/** 页面"] -->|未登录| Login[登录页<br>/admin/login]
    Login -->|成功：有 next| Any
    Login -->|成功：无 next| List[文章列表<br>/admin]
    Login -->|失败 / 限流| Login
    List -->|新建文章 / 写第一篇| New[写文章页<br>/admin/posts/new]
    List -->|点击文章| Edit[写文章页<br>/admin/posts/:id]
    New -->|首次自动保存| Edit
    Edit -->|← 文章| List
    Edit -->|删除并确认| List
    List -->|删除并确认| List
    List -->|登出| Login
    Edit -->|登出| Login
```

说明：新建页首次自动保存成功后，地址用 `history.replaceState` 换成 `/admin/posts/:id`，不刷新页面。

## 2. 文章状态

```mermaid
stateDiagram-v2
    [*] --> 草稿: 新建（首次自动保存）
    草稿 --> 草稿: 自动保存
    草稿 --> 已发布: 发布（标题、正文必填）
    已发布 --> 有未发布修改: 自动保存
    有未发布修改 --> 有未发布修改: 自动保存
    有未发布修改 --> 已发布: 发布更新
    已发布 --> 草稿: 撤回（确认）
    有未发布修改 --> 草稿: 撤回（确认，最新内容保留为草稿）
    草稿 --> [*]: 删除（确认）
    已发布 --> [*]: 删除（确认）
    有未发布修改 --> [*]: 删除（确认）
```

## 3. 保存状态（写文章页顶栏）

```mermaid
stateDiagram-v2
    [*] --> 已保存: 页面加载
    已保存 --> 未保存: 编辑
    未保存 --> 保存中: 停止输入 2 秒
    保存中 --> 已保存: 成功（显示 HH:mm）
    保存中 --> 未保存: 保存期间又有编辑
    保存中 --> 保存失败: 网络/服务错误（内容暂存浏览器本地）
    保存失败 --> 保存中: 自动重试 / 网络恢复
```

## 4. 图片上传（编辑区）

```mermaid
stateDiagram-v2
    [*] --> 校验: 粘贴 / 拖入 / 插入图片
    校验 --> 提示错误: 超过 5MB 或格式不支持（不插入占位）
    校验 --> 上传中: 光标处插入 ![上传中…]()
    上传中 --> 完成: 占位替换为 ![文件名](URL)
    上传中 --> 提示错误: 失败（移除占位）
    提示错误 --> [*]
    完成 --> [*]
```

多张图片：每张各自插入占位、按顺序替换。

## 5. 读者端页面跳转（F-002）

```mermaid
graph LR
    Home[首页 /] -->|顶栏 文章| Posts[文章 /posts]
    Posts -->|分页| PostsN["/posts/page/n"]
    Posts -->|卡片| Detail[文章详情 /posts/:slug]
    Posts -->|标签 / 标签索引| Tag[标签页 /tags/:tag]
    Tag -->|卡片| Detail
    Detail -->|标签| Tag
    Detail -->|同标签文章 / 上一篇 / 下一篇| Detail
    Detail -->|cd ..| Posts
    Posts -->|cd ..| Home
    Tag -->|cd ..| Home
    Any["未匹配路径（含 /media、/rss.xml）"] --> NF[404]
    NF -->|回首页| Home
    NF -->|看看全部文章| Posts
```

## 6. 发布到读者可见（F-002）

```mermaid
sequenceDiagram
    participant A as 作者（写文章页）
    participant W as Worker（/api/admin）
    participant H as Deploy Hook
    participant B as Workers Builds
    participant R as 读者
    A->>W: 发布 / 发布更新 / 撤回 / 删除
    W-->>A: 成功（"已发布，几分钟后读者可见"）
    W--)H: POST（waitUntil，失败只记日志）
    H->>B: 触发构建
    B->>W: 构建时读取 GET /api/posts[/:slug]
    B-->>R: 新的静态读者页上线（P95 ≤ 5 分钟）
```

## 7. 灯箱（文章详情）

```mermaid
stateDiagram-v2
    [*] --> 关闭
    关闭 --> 打开: 点击图片 / 手风琴已展开项 / Enter
    打开 --> 打开: ← → / 拖动切换（首尾不循环）
    打开 --> 关闭: Esc / 关闭按钮 / 点遮罩 / 下滑超过阈值
    关闭 --> [*]
```

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-10 | 初始版本 | miraclehifi |
| 2026-10-15 | 新增读者端页面跳转、发布到读者可见、灯箱（F-002） | miraclehifi |
