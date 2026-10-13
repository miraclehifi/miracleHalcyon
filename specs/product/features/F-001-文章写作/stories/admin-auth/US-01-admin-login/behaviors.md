# US-01 管理员登录 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-LOGIN-01 | 正确账号密码登录成功并进入后台 | 正常 |
| BH-02 | SC-LOGIN-02 | 未登录访问后台页面跳转登录，登录后回到原页面 | 正常 |
| BH-03 | SC-LOGIN-03 | 已登录访问登录页直接进入后台 | 正常 |
| BH-04 | SC-LOGIN-04 | 账号或密码错误时登录失败 | 错误 |
| BH-05 | SC-LOGIN-05 | 账号或密码为空时无法提交 | 边界 |
| BH-06 | SC-LOGIN-06 | 连续失败 5 次后锁定 15 分钟 | 边界 |
| BH-07 | SC-LOGIN-07 | 锁定期满后可再次登录 | 边界 |
| BH-08 | SC-LOGIN-08 | 未登录调用写接口返回 401 | 错误 |
| BH-09 | SC-LOGIN-09 | 会话过期后访问后台需重新登录 | 边界 |
| BH-10 | SC-LOGIN-10 | 提交中按钮禁用并显示加载态 | UI |
| BH-11 | SC-LOGIN-11 | 登录跳转参数不允许跳到站外 | 错误 |

---

## BH-01: 正确账号密码登录成功并进入后台

**SC-ID**: SC-LOGIN-01

```gherkin
Given 我未登录
  And 我在登录页 /admin/login
When 我输入正确的账号和密码
  And 我点击"登录"
Then 我被跳转到 /admin（文章列表页）
  And 响应设置了 HttpOnly、Secure、SameSite=Lax 的会话 Cookie
```

## BH-02: 未登录访问后台页面跳转登录，登录后回到原页面

**SC-ID**: SC-LOGIN-02

```gherkin
Given 我未登录
When 我访问 /admin/posts/abc/edit
Then 我被跳转到 /admin/login?next=/admin/posts/abc/edit
When 我输入正确的账号和密码并登录
Then 我被跳转到 /admin/posts/abc/edit
```

## BH-03: 已登录访问登录页直接进入后台

**SC-ID**: SC-LOGIN-03

```gherkin
Given 我已登录且会话有效
When 我访问 /admin/login
Then 我被跳转到 /admin
```

## BH-04: 账号或密码错误时登录失败

**SC-ID**: SC-LOGIN-04

```gherkin
Given 我在登录页
When 我输入正确的账号和错误的密码并登录
Then 表单上方显示"账号或密码错误"
  And 不设置会话 Cookie
  And 密码输入框被清空，账号保留
```

## BH-05: 账号或密码为空时无法提交

**SC-ID**: SC-LOGIN-05

```gherkin
Given 我在登录页
  And 账号或密码任一为空
When 我查看"登录"按钮
Then "登录"按钮为禁用状态
```

## BH-06: 连续失败 5 次后锁定 15 分钟

**SC-ID**: SC-LOGIN-06

```gherkin
Given 同一 IP 已连续登录失败 5 次
When 我在 15 分钟内输入正确的账号密码并登录
Then 显示"尝试次数过多，请 15 分钟后再试"
  And 接口返回 429
  And 不设置会话 Cookie
```

## BH-07: 锁定期满后可再次登录

**SC-ID**: SC-LOGIN-07

```gherkin
Given 同一 IP 因连续失败被锁定
  And 距最后一次失败已超过 15 分钟
When 我输入正确的账号密码并登录
Then 登录成功，失败计数清零
```

## BH-08: 未登录调用写接口返回 401

**SC-ID**: SC-LOGIN-08

```gherkin
Given 我没有有效会话 Cookie
When 我调用任一写接口（创建/保存/发布/删除文章、上传图片）
Then 接口返回 401
  And 数据库与存储无任何变化
```

## BH-09: 会话过期后访问后台需重新登录

**SC-ID**: SC-LOGIN-09

```gherkin
Given 我的会话已超过 7 天有效期
When 我访问 /admin
Then 我被跳转到登录页
```

## BH-10: 提交中按钮禁用并显示加载态

**SC-ID**: SC-LOGIN-10

```gherkin
Given 我已填写账号和密码
When 我点击"登录"且请求尚未返回
Then "登录"按钮显示加载指示并禁用，防止重复提交
```

## BH-11: 登录跳转参数不允许跳到站外

**SC-ID**: SC-LOGIN-11

```gherkin
Given 我访问 /admin/login?next=https://evil.example.com
When 我登录成功
Then 我被跳转到 /admin，而不是站外地址
```
