# 参考素材

存放写博客、做设计、写代码时收集的参考素材。全部提交到 git。

| 目录 | 放什么 | 示例 |
|------|--------|------|
| `design/` | 别人站点的截图、配色、排版、交互灵感 | `tw93-home.png`、`pseudoyu-sitemap.png` |
| `articles/` | 文章摘录、读书笔记、写作素材 | `astro-islands-notes.md` |
| `code/` | 代码片段、实现思路（不参与 lint / 类型检查 / 构建） | `view-transition-demo.ts` |
| `assets/` | 字体、图标、图片等原始素材 | `noise-texture.png` |
| [`links.md`](links.md) | 不下载的在线参考，按类别记链接 | — |

## 约定

- 文件名小写英文连字符，带来源前缀便于检索：`{来源}-{内容}.{ext}`
- 截图尽量压缩后再放（建议单张 < 1 MB），大视频只记链接
- 被某个 Backlog 条目 / 设计稿采用时，在对应 spec 里用相对路径引用这里的文件
- `code/` 只是参考，不会被项目引用；要用时复制到 `src/` 并按项目规范改写
