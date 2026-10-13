import { expect, test } from "@playwright/test";

test("构建产物在 workerd 中可访问登录页", async ({ request }) => {
  const res = await request.get("/admin/login");

  expect(res.status()).toBe(200);
});
