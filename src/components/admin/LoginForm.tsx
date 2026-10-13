// 登录表单（admin-login.md，US-01）：账号或密码为空时按钮禁用（BH-05）；提交中禁用并显示"登录中…"（BH-10）
// 失败后显示错误提示条（role="alert"）、清空密码并把焦点放回密码框；成功后跳到已由 SSR 清洗过的 next
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";

const LOGIN_API = "/api/admin/login";
const NETWORK_ERROR = "网络异常，请重试";
const FALLBACK_ERROR = "登录失败，请稍后重试";

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? FALLBACK_ERROR;
  } catch {
    return FALLBACK_ERROR;
  }
}

export function LoginForm({ next }: { next: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const canSubmit = username !== "" && password !== "" && !submitting;

  // 水合前输入或浏览器自动填充的值不会触发 onChange，挂载时从 DOM 同步一次，否则按钮会一直禁用
  useEffect(() => {
    const filledUsername = usernameRef.current?.value ?? "";
    const filledPassword = passwordRef.current?.value ?? "";
    if (filledUsername) setUsername(filledUsername);
    if (filledPassword) setPassword(filledPassword);
  }, []);

  const fail = (message: string, clearPassword: boolean) => {
    setError(message);
    if (clearPassword) setPassword("");
    setSubmitting(false);
    requestAnimationFrame(() => passwordRef.current?.focus());
  };

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    let response: Response;
    try {
      response = await fetch(LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      fail(NETWORK_ERROR, false);
      return;
    }
    if (response.ok) {
      location.assign(next);
      return;
    }
    fail(await errorMessage(response), response.status === 401);
  };

  return (
    <div className="flex flex-col gap-8">
      {error && <Alert tone="error">{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="账号">
          <input
            ref={usernameRef}
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            readOnly={submitting}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field label="密码">
          <input
            ref={passwordRef}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            readOnly={submitting}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Button type="submit" disabled={!canSubmit} aria-busy={submitting} className="min-h-11 w-full md:min-h-10">
          {submitting ? "登录中…" : "登录"}
        </Button>
      </form>
    </div>
  );
}
