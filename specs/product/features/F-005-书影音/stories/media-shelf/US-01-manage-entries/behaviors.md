# US-01 后台管理书影音条目 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-MANAGE-01 | 从顶栏进入条目列表，按分类查看 | 正常 |
| BH-02 | SC-MANAGE-02 | 列表排序：进行中置顶，其余按标记日期倒序 | 正常 |
| BH-03 | SC-MANAGE-03 | 分类下没有条目时显示空状态 | UI |
| BH-04 | SC-MANAGE-04 | 新增条目的表单默认值 | UI |
| BH-05 | SC-MANAGE-05 | 只填必填项保存成功并触发重建 | 正常 |
| BH-06 | SC-MANAGE-06 | 填写全部字段保存成功 | 正常 |
| BH-07 | SC-MANAGE-07 | 标题为空时不保存 | 错误 |
| BH-08 | SC-MANAGE-08 | 评分、年份越界时不保存 | 边界 |
| BH-09 | SC-MANAGE-09 | 状态动词随分类变化 | UI |
| BH-10 | SC-MANAGE-10 | 上传本地封面并预览 | 正常 |
| BH-11 | SC-MANAGE-11 | 封面格式或大小不合规时拒绝 | 错误 |
| BH-12 | SC-MANAGE-12 | 把"在读"改成"读过" | 正常 |
| BH-13 | SC-MANAGE-13 | 编辑时换封面，旧封面被删除 | 边界 |
| BH-14 | SC-MANAGE-14 | 隐藏与取消隐藏 | 正常 |
| BH-15 | SC-MANAGE-15 | 删除条目需二次确认，连同封面删除 | 正常 |
| BH-16 | SC-MANAGE-16 | 取消删除确认时不删除 | UI |
| BH-17 | SC-MANAGE-17 | 保存中按钮显示加载态，防重复提交 | UI |
| BH-18 | SC-MANAGE-18 | 保存失败时提示并保留已填内容 | 错误 |
| BH-19 | SC-MANAGE-19 | 重建触发失败不影响保存结果 | 错误 |
| BH-20 | SC-MANAGE-20 | 清除豆瓣链接 | 边界 |
| BH-21 | SC-MANAGE-21 | 未登录访问后台页跳转登录 | 错误 |
| BH-22 | SC-MANAGE-22 | 未登录或跨站调用条目写接口被拒 | 错误 |
| BH-23 | SC-MANAGE-23 | 录入游戏：选平台、粘贴 IGDB 封面链接 | 正常 |
| BH-24 | SC-MANAGE-24 | IGDB 封面链接格式不对或打不开时不保存 | 错误 |
| BH-25 | SC-MANAGE-25 | 切换分类时平台与封面输入方式随之变化 | 边界 |

---

## BH-01: 从顶栏进入条目列表，按分类查看

**SC-ID**: SC-MANAGE-01

```gherkin
Given 我已登录后台
  And 有 3 条"书"、1 条"电影"条目，其中 1 条书已隐藏
When 我点后台顶栏的"书影音"
Then 进入 /admin/media，"书"标签高亮
  And 列表显示 3 条书，每行有封面缩略图、标题、作者、状态、评分、标记日期
  And 已隐藏的那条带"已隐藏"标记
When 我点"电影"标签
Then 列表只显示那 1 条电影
```

## BH-02: 列表排序：进行中置顶，其余按标记日期倒序

**SC-ID**: SC-MANAGE-02

```gherkin
Given "书"分类有：A 读过 2026-03-01、B 在读 2026-01-10、C 读过 2026-09-15、D 在读 2026-08-01
When 我查看"书"分类
Then 顺序为 D、B、C、A
```

## BH-03: 分类下没有条目时显示空状态

**SC-ID**: SC-MANAGE-03

```gherkin
Given "桌游"分类没有任何条目
When 我切到"桌游"标签
Then 显示"还没有桌游条目"和"新增条目"按钮
```

## BH-04: 新增条目的表单默认值

**SC-ID**: SC-MANAGE-04

```gherkin
Given 我在条目列表的"电影"标签
  And 今天是 2026-10-21
When 我点"新增条目"
Then 打开录入表单，分类为"电影"，状态为"看过"，标记日期为 2026-10-21
  And 标题、封面、导演、年份、评分、短评为空，豆瓣链接为空
```

## BH-05: 只填必填项保存成功并触发重建

**SC-ID**: SC-MANAGE-05

```gherkin
Given 我在录入表单，分类"书"、状态"读过"、标记日期 2026-10-01
When 我填写标题"原则"并点"保存"
Then 提示"已保存"，回到"书"列表，能看到"原则"（无封面时显示占位）
  And 服务端触发一次 Deploy Hook
```

## BH-06: 填写全部字段保存成功

**SC-ID**: SC-MANAGE-06

```gherkin
Given 我在录入表单
When 我填写分类"游戏"、标题"塞尔达传说"、开发商"任天堂"、年份 2023、状态"玩过"、评分 5、标记日期 2026-05-01、短评"神作"，并上传封面
  And 点"保存"
Then 再次打开该条目的编辑表单，所有字段与填写一致
```

## BH-07: 标题为空时不保存

**SC-ID**: SC-MANAGE-07

```gherkin
Given 我在录入表单，标题为空或只有空格
When 我点"保存"
Then 不发送保存请求，标题下提示"请填写标题"
  And 其他已填字段保持不变
```

## BH-08: 评分、年份越界时不保存

**SC-ID**: SC-MANAGE-08

```gherkin
Given 我在录入表单，标题已填
When 年份填"23"并保存
Then 不保存，年份下提示"年份为 4 位数字"
When 年份清空、通过接口直接提交评分 6
Then 接口返回 400，提示评分须为 1–5
When 评分为空
Then 允许保存
```

表单上的评分控件只能选 1–5 或清空，越界只能经接口出现，因此评分越界由接口校验覆盖。

## BH-09: 状态动词随分类变化

**SC-ID**: SC-MANAGE-09

```gherkin
Given 我在录入表单
When 分类为"书"或"漫画"
Then 状态选项显示"读过 / 在读"
When 我把分类改为"剧集"
Then 状态选项显示"看过 / 在看"，已选的状态（已完成 / 进行中）保持不变
When 我把分类改为"桌游"
Then 状态选项显示"玩过 / 在玩"
```

## BH-10: 上传本地封面并预览

**SC-ID**: SC-MANAGE-10

```gherkin
Given 我在录入表单
When 我选择一张 300 KB 的 jpg 作为封面
Then 表单显示该封面预览
When 我保存
Then 封面存入 R2，条目记录指向 R2 地址
```

## BH-11: 封面格式或大小不合规时拒绝

**SC-ID**: SC-MANAGE-11

```gherkin
Given 我在录入表单
When 我选择一个 svg 文件，或一张 6 MB 的 jpg 作为封面
Then 提示"封面只支持 jpg / png / webp，且不超过 5 MB"
  And 表单原有封面不变
```

## BH-12: 把"在读"改成"读过"

**SC-ID**: SC-MANAGE-12

```gherkin
Given 条目"三体"状态为"在读"，在"书"列表置顶
When 我编辑它，状态改为"读过"、评分 4、短评"好看"、标记日期 2026-10-20，并保存
Then "三体"不再置顶，按 2026-10-20 排在已完成条目中
  And 服务端触发一次 Deploy Hook
```

## BH-13: 编辑时换封面，旧封面被删除

**SC-ID**: SC-MANAGE-13

```gherkin
Given 条目 X 的封面是 R2 对象 old
When 我编辑 X，上传新封面并保存
Then X 的封面指向新的 R2 对象
  And R2 中 old 已删除
When 我编辑 X、移除封面并保存
Then X 无封面，原封面对象已删除
```

## BH-14: 隐藏与取消隐藏

**SC-ID**: SC-MANAGE-14

```gherkin
Given 条目 X 为显示状态
When 我在列表中点 X 的"隐藏"
Then X 带"已隐藏"标记留在列表，操作按钮变为"取消隐藏"
  And 服务端触发一次 Deploy Hook
When 我点"取消隐藏"
Then "已隐藏"标记消失
  And 服务端再触发一次 Deploy Hook
```

## BH-15: 删除条目需二次确认，连同封面删除

**SC-ID**: SC-MANAGE-15

```gherkin
Given 条目 X 有 R2 封面
When 我点 X 的"删除"
Then 弹出确认框"删除「X」？此操作不可撤销"
When 我点"删除"确认
Then X 从列表消失，提示"已删除"
  And X 的 R2 封面已删除
  And 服务端触发一次 Deploy Hook
```

## BH-16: 取消删除确认时不删除

**SC-ID**: SC-MANAGE-16

```gherkin
Given 删除确认框已打开
When 我点"取消"或按 Esc
Then 确认框关闭，X 仍在列表中，未发出删除请求
```

## BH-17: 保存中按钮显示加载态，防重复提交

**SC-ID**: SC-MANAGE-17

```gherkin
Given 我在录入表单，内容合法
When 我点"保存"且请求尚未返回
Then "保存"按钮显示加载态并禁用
  And 连续点击只发出一次保存请求
```

## BH-18: 保存失败时提示并保留已填内容

**SC-ID**: SC-MANAGE-18

```gherkin
Given 我在录入表单，内容合法
When 保存请求返回 500 或网络断开
Then 提示"保存失败，请重试"，表单保持打开且已填内容不丢失
  And "保存"按钮恢复可用
```

## BH-19: 重建触发失败不影响保存结果

**SC-ID**: SC-MANAGE-19

```gherkin
Given Deploy Hook 调用返回错误
When 我保存一个条目
Then 条目照常保存，接口返回成功
  And 行为与文章发布时 Deploy Hook 失败的处理一致
```

## BH-20: 清除豆瓣链接

**SC-ID**: SC-MANAGE-20

```gherkin
Given 条目 X 有豆瓣链接，表单中以只读形式显示
When 我点豆瓣链接旁的"清除"并保存
Then X 的豆瓣链接与豆瓣条目 ID 都为空
```

## BH-21: 未登录访问后台页跳转登录

**SC-ID**: SC-MANAGE-21

```gherkin
Given 我未登录
When 我访问 /admin/media
Then 跳转登录页
```

## BH-22: 未登录或跨站调用条目写接口被拒

**SC-ID**: SC-MANAGE-22

```gherkin
Given 我未登录
When 调用新增、编辑、隐藏、删除条目或上传封面的接口
Then 返回 401，数据不变
Given 我已登录但请求的 Origin 不是本站
When 调用上述接口
Then 返回 403，数据不变
```

## BH-23: 录入游戏：选平台、粘贴 IGDB 封面链接

**SC-ID**: SC-MANAGE-23

```gherkin
Given 我在条目列表的"游戏"标签，点"新增条目"
Then 表单显示"平台"下拉，默认 PS5；封面区没有"上传"按钮，改为"封面链接（IGDB）"输入框
When 我填写标题"黑神话：悟空"，平台选 PS5，封面链接粘贴 "https://images.igdb.com/igdb/image/upload/t_cover_big/co8h3y.webp"
Then 封面预览显示该图，按原图比例（3:4）完整显示
When 我点"保存"
Then 条目保存成功，平台为 PS5
  And 封面地址保存为 "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg"，宽高为 810×1080
  And 服务端触发一次 Deploy Hook
```

封面链接可留空（无封面）。IGDB 链接不下载到本站，读者页直接引用（[ADR-013](../../../../../../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)）。

## BH-24: IGDB 封面链接格式不对或打不开时不保存

**SC-ID**: SC-MANAGE-24

```gherkin
Given 我在录入表单，分类"游戏"，标题已填
When 封面链接填 "https://example.com/a.jpg" 并保存
Then 不保存，封面链接下提示"请粘贴 images.igdb.com 的封面图片地址"
When 封面链接填 "https://images.igdb.com/igdb/image/upload/t_cover_big/nope000.jpg"（图片不存在）并保存
Then 不保存，封面链接下提示"封面链接打不开，请检查后重试"，已填内容保留
```

## BH-25: 切换分类时平台与封面输入方式随之变化

**SC-ID**: SC-MANAGE-25

```gherkin
Given 我在录入表单，分类"书"，已上传一张封面
When 我把分类改为"游戏"
Then 出现"平台"下拉（默认 PS5），封面区换成"封面链接（IGDB）"输入框
When 我保存
Then 条目为游戏、有平台，原上传的封面从 R2 删除
Given 我在编辑一个游戏条目（平台 Switch、有 IGDB 封面链接）
When 我把分类改为"桌游"并保存
Then 条目没有平台、没有封面，封面区恢复为上传方式
```
