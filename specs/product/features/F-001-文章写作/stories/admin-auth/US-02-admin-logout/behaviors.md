# US-02 管理员登出 - Behaviors

## Behavior 列表

| ID | SC-ID | 场景 | 类型 |
|----|-------|------|------|
| BH-01 | SC-LOGOUT-01 | 点击登出回到登录页并清除 Cookie | 正常 |
| BH-02 | SC-LOGOUT-02 | 登出后旧会话 Cookie 失效 | 边界 |
| BH-03 | SC-LOGOUT-03 | 有未保存修改时登出先提示 | UI |
| BH-04 | SC-LOGOUT-04 | 未登录状态调用登出不报错 | 错误 |

---

## BH-01: 点击登出回到登录页并清除 Cookie

**SC-ID**: SC-LOGOUT-01

```gherkin
Given 我已登录并在后台任意页面
When 我点击顶部"登出"
Then 我被跳转到 /admin/login
  And 会话 Cookie 被清除
```

## BH-02: 登出后旧会话 Cookie 失效

**SC-ID**: SC-LOGOUT-02

```gherkin
Given 我登出前保存了会话 Cookie 的值
  And 我已登出
When 我携带旧 Cookie 调用保存文章接口
Then 接口返回 401
```

## BH-03: 有未保存修改时登出先提示

**SC-ID**: SC-LOGOUT-03

```gherkin
Given 我在写文章页且有未保存修改
When 我点击"登出"
Then 弹出确认"有未保存的修改，确定登出吗？"
When 我点击"取消"
Then 我留在写文章页，仍为登录状态
```

## BH-04: 未登录状态调用登出不报错

**SC-ID**: SC-LOGOUT-04

```gherkin
Given 我没有有效会话
When 我调用登出接口
Then 返回成功并跳转登录页（幂等）
```
