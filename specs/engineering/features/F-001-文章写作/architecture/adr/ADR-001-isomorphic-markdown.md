# ADR-001: Markdown 同构渲染

## 状态
Accepted（2026-10-12）

## 背景
US-04 要求预览在 300ms 内更新，并且与读者端（F-002）渲染完全一致。Expressive Code 依赖 Shiki，体积大，能否在 Cloudflare Workers 里运行还没有验证过。

## 决策
- `src/lib/markdown/render.ts` 是唯一的渲染实现，处理链为 unified + remark-gfm + rehype-sanitize + rehype-expressive-code + 图片插件。
- 后台预览在浏览器 **Web Worker** 中运行这个模块，按需加载，只在后台使用，不经过网络。
- F-002 读者端在 Worker SSR 中运行同一模块，加边缘缓存。Shiki 使用 JavaScript 正则引擎（不用 Oniguruma WASM），语言按白名单精简。
- Sprint 1 第一个任务是验证（spike），确认三件事：浏览器端万字文章渲染 < 300ms；Worker 打包体积在限额内；Worker 内单次渲染的 CPU 时间可以接受。

## 退路
如果 Worker 侧不可行：改为发布时渲染，把 HTML 存入 `posts.published_html`。渲染发生在 Worker 里一次性的发布请求中，或由浏览器渲染后提交，再由服务端二次 sanitize。预览部分不受影响。

## 后果
- 正面：预览不依赖网络，延迟最低；只有一份渲染规则。
- 负面：后台首次进入写文章页要下载高亮器（约数百 KB，可缓存）；读者端是否可行取决于 spike 结果。
