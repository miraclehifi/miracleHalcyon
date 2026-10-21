# US-13 插入 Afilmory 照片（外链存储） - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-AFIL-01 | 粘贴单张分享代码或照片页链接，占位后换成照片引用 | 正常 |
| BH-02 | SC-AFIL-02 | 粘贴多张分享代码，每张一行，成为组图 | 正常 |
| BH-03 | SC-AFIL-03 | 粘贴按标签的分享代码，不插入并提示 | 边界 |
| BH-04 | SC-AFIL-04 | 其他网站的分享代码、普通网址、夹带文字的代码按普通文本粘贴 | 边界 |
| BH-05 | SC-AFIL-05 | Afilmory 打不开或照片不存在，卡片失败可重试 / 移除 | 错误 |
| BH-06 | SC-AFIL-06 | 动态照片按实况开关决定是否带 live | 正常 |
| BH-07 | SC-AFIL-07 | 缩略图地址不符合约定，按普通外链插入并提示 | 边界 |
| BH-08 | SC-AFIL-08 | 显示：预留比例、先缩略图、进入视口换主图、组图主色 | UI |
| BH-09 | SC-AFIL-09 | 灯箱显示主图，已加载过的复用 | UI |
| BH-10 | SC-AFIL-10 | 实况：能播放 HEVC 时播放，否则退回静态图 | 错误 |
| BH-11 | SC-AFIL-11 | 未登记前缀的外链不解析扩展片段 | 边界 |
| BH-12 | SC-AFIL-12 | 主图读取失败时保留缩略图 | 错误 |
| BH-13 | SC-AFIL-13 | 照片信息接口只允许登录作者、只抓登记的站点 | 安全 |

---

## BH-01: 粘贴单张分享代码或照片页链接，占位后换成照片引用

**SC-ID**: SC-AFIL-01

```gherkin
Given 我在写文章页，源码区光标在第 3 行行尾，实况开关关闭
  And 剪贴板文本为 '<script async src="https://miraclehalcyon.afilmory.art/share/embed.js" data-afilmory-photo="18382" data-aspect="3068:4096" data-width="100%"></script>'
When 我粘贴
Then 光标处插入 "![处理中…]()"，预览显示进度卡片
  And 照片信息返回后占位被替换为 "![](https://raw.githubusercontent.com/miraclehifi/photo-assets/main/18382.jpg#ext=3068x4096x{rgb})"
  And 替换可撤销，作者的选区不变
When 剪贴板文本为 "https://miraclehalcyon.afilmory.art/photos/18382"（前后可有空白）
Then 结果相同
```

- 照片在子目录（`手办/wf2026/23473.jpg`）时地址按 URL 编码（`%E6%89%8B%E5%8A%9E/wf2026/23473.jpg`）
- `rgb` 为清单 `thumbHash` 的平均色（6 位小写十六进制）

## BH-02: 粘贴多张分享代码，每张一行，成为组图

**SC-ID**: SC-AFIL-02

```gherkin
Given 剪贴板为 data-afilmory-photos="23473,23514,18382" 的分享代码
When 我粘贴
Then 光标处插入 3 行占位（每行一个，不空行）
  And 各自取到信息后替换对应的那一行，顺序与代码中一致
  And 预览中 3 张成为一个网格组图
```

- id 去掉首尾空白、去掉空项；超过 9 张时按 US-12 的规则每 9 张一组

## BH-03: 粘贴按标签的分享代码，不插入并提示

**SC-ID**: SC-AFIL-03

```gherkin
Given 剪贴板为 data-afilmory-tag="手办" 的分享代码（站点为登记的 Afilmory）
When 我粘贴
Then 源码不变
  And 提示 "按标签分享的代码不能插入，请改用单张或多张分享"
```

## BH-04: 其他网站的分享代码、普通网址、夹带文字的代码按普通文本粘贴

**SC-ID**: SC-AFIL-04

```gherkin
Given 剪贴板为以下之一：
  | 内容 |
  | src 为 https://other.afilmory.art/share/embed.js 的 data-afilmory-photo 代码 |
  | https://miraclehalcyon.afilmory.art/（不是照片页） |
  | https://example.com/photos/18382 |
  | "看这张：" + 单张分享代码 |
When 我粘贴
Then 按原文本插入，不发请求、不显示卡片
```

## BH-05: Afilmory 打不开或照片不存在，卡片失败可重试 / 移除

**SC-ID**: SC-AFIL-05

```gherkin
Given 照片信息接口返回 502（Afilmory 打不开、清单解析失败）或 404（清单中没有这个 id）
When 粘贴单张分享代码
Then 占位变为 "![上传失败]()"，卡片红框
  And 502 显示 "Afilmory 暂时无法访问"，404 显示 "Afilmory 中没有这张照片"
When 我点"重试"
Then 占位改回 "处理中…"，重新请求；成功后替换为照片引用
When 我点"移除"
Then 删掉该行占位
```

- 返回 401 时同 US-05：占位改为"上传失败"并走会话过期流程

## BH-06: 动态照片按实况开关决定是否带 live

**SC-ID**: SC-AFIL-06

```gherkin
Given 18369 是动态照片（清单 video.type = motion-photo，offset 3337665，size 14749941）
When 实况开关开启时粘贴 18369
Then 片段为 "#ext=3072x4096x{rgb},mp=3337665+14749941,live"
When 实况开关关闭时粘贴
Then 片段为 "#ext=3072x4096x{rgb},mp=3337665+14749941"（不带 live）
  And 预览图片菜单显示"实况"项（未勾选），勾选后片段加上 live
Given 18382 不是动态照片
Then 片段不含 mp，图片菜单不显示"实况"项
```

## BH-07: 缩略图地址不符合约定，按普通外链插入并提示

**SC-ID**: SC-AFIL-07

```gherkin
Given 清单中该照片的 thumbnailUrl 不等于 "{存储前缀}.afilmory/thumbnails/{文件名去扩展名}.jpg"
  Or 原图地址不在登记的存储前缀下
When 粘贴
Then 插入 "![](原图地址)"（不带 ext / mp / live）
  And 提示 "这张照片的存储位置不符合约定，已按普通外链插入"
```

## BH-08: 显示：预留比例、先缩略图、进入视口换主图、组图主色

**SC-ID**: SC-AFIL-08

```gherkin
Given 正文含 "![](…/18369.jpg#ext=3072x4096x8a7b6c,mp=3337665+14749941 \"图注\")"
When 读者打开文章（预览同样）
Then 图片按 3072 / 4096 预留宽高比，图注显示
  And 首屏 img 的地址是缩略图 "…/.afilmory/thumbnails/18369.jpg"
When 图片进入视口
Then 按字节范围读取原图 0–3337664，读完后显示的图片换成这部分内容（加载过程中保持缩略图，不回到加载中状态）
Given 照片不带 mp（非动态照片）
Then 进入视口后直接换成原图地址
Given 3 张 Afilmory 照片组成网格
Then 每格背景为各自 ext 中的主色
```

- 构建产物（无 JS）中 `img` 的地址为缩略图，`figure` 带 `data-thumb` / `data-mp`

## BH-09: 灯箱显示主图，已加载过的复用

**SC-ID**: SC-AFIL-09

```gherkin
Given 读者点开一张 Afilmory 照片的灯箱
Then 灯箱中显示主图（动态照片为字节范围 0 到 mp 偏移；其余为原图）
  And 正文中已经读完的主图不再重复请求
  And 灯箱切换到尚未读取的照片时，先显示缩略图，读完后换成主图
```

## BH-10: 实况：能播放 HEVC 时播放，否则退回静态图

**SC-ID**: SC-AFIL-10

```gherkin
Given 正文中 18369 带 "live"
  And 浏览器 canPlayType('video/mp4; codecs="hvc1"') 不为空
When 读者悬停（手机长按）
Then 第一次播放时按字节范围读取 3337665 起 14749941 字节作为视频，与本站实况照片一样静音播放一次
  And LIVE 标记、进度条、移出暂停与 US-11 BH-10 一致
Given canPlayType 为空，或视频读取 / 播放出错
Then 只显示静态图，不显示 LIVE 标记，不再尝试
```

## BH-11: 未登记前缀的外链不解析扩展片段

**SC-ID**: SC-AFIL-11

```gherkin
Given 源码为 "![a](https://example.com/a.jpg#ext=800x600x112233,mp=10+20,live,wide)"
When 渲染
Then 输出普通外链图片：不带 data-w / data-h / data-rgb / data-thumb / data-mp / data-live，img 地址为 "https://example.com/a.jpg"
  And wide 照常生效
Given 登记前缀下的地址 ext 格式错误（如 "ext=0x600x112233"、"ext=800x600"）或 mp 格式错误
Then 对应片段整体忽略（ext 错 → 不预留比例、不换缩略图；mp 错 → 不读字节范围、不支持 live）
```

## BH-12: 主图读取失败时保留缩略图

**SC-ID**: SC-AFIL-12

```gherkin
Given 缩略图已显示，主图字节范围请求失败（网络错误、非 206 / 200）
Then 继续显示缩略图，不显示加载失败
Given 缩略图本身加载失败
Then 与普通图片一样显示"加载失败"与"重试"
```

## BH-13: 照片信息接口只允许登录作者、只抓登记的站点

**SC-ID**: SC-AFIL-13

```gherkin
Given 未登录
When 请求 GET /api/admin/afilmory/photos/18369
Then 返回 401
Given 已登录
When id 含非法字符（如 "../x"、"a b"、超过 64 字符）
Then 返回 400 VALIDATION_FAILED，不请求外部
When id 合法
Then 服务端只请求 "{登记的 Afilmory 站点}/photos/{id}"，不跟随到其他站点的重定向
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-19 | 1.0 | 初始版本 | miraclehifi |
