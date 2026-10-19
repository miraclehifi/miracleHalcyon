// AdminHeader（components.md"业务区块"，admin-post-list.md"布局"、admin-storage.md）：后台顶栏，站点名 + 导航"文章 / 存储" +"查看博客""登出"
// current 标当前项（accent + 600，aria-current）；手机端导航与两个操作都只留图标（44×44，带 aria-label），隐藏"后台"字样。
// "登出"：POST 登出接口后跳登录页（列表页没有未保存内容，不需确认）
import { logout } from "../../lib/admin/logout";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { ICONS, type IconName } from "../ui/icons";

export type AdminSection = "posts" | "storage";

const NAV: { section: AdminSection; label: string; href: string; icon: IconName }[] = [
  { section: "posts", label: "文章", href: "/admin", icon: "file-text" },
  { section: "storage", label: "存储", href: "/admin/storage", icon: "hard-drive" },
];

const openBlog = () => window.open("/", "_blank", "noopener");

export interface AdminHeaderProps {
  current?: AdminSection;
}

export function AdminHeader({ current }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-line px-10 py-3.5 max-md:py-1 max-md:pr-1 max-md:pl-4">
      <div className="flex items-center gap-8">
        <a href="/admin" className="flex items-baseline gap-2.5">
          <span className="text-title-sm font-semibold text-ink">miracleHalcyon</span>
          <span className="text-meta text-ink-muted max-md:hidden">后台</span>
        </a>
        <nav aria-label="后台导航" className="flex items-center gap-5 max-md:hidden">
          {NAV.map(({ section, label, href }) => (
            <a
              key={section}
              href={href}
              aria-current={current === section ? "page" : undefined}
              className={`text-ui transition-colors hover:text-ink ${current === section ? "font-semibold text-accent" : "text-ink-muted"}`}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1 max-md:hidden">
        <Button variant="ghost" icon="external-link" onClick={openBlog}>
          查看博客
        </Button>
        <Button variant="ghost" icon="log-out" onClick={() => void logout()}>
          登出
        </Button>
      </div>
      <div className="flex items-center md:hidden">
        <nav aria-label="后台导航" className="flex items-center">
          {NAV.map(({ section, label, href, icon }) => {
            const Icon = ICONS[icon];
            return (
              <a
                key={section}
                href={href}
                aria-label={label}
                aria-current={current === section ? "page" : undefined}
                className={`inline-flex size-11 items-center justify-center rounded-control hover:bg-surface-sunken ${current === section ? "text-accent" : "text-ink-muted"}`}
              >
                <Icon size={16} aria-hidden="true" />
              </a>
            );
          })}
        </nav>
        <IconButton icon="external-link" size="touch" aria-label="查看博客" onClick={openBlog} />
        <IconButton icon="log-out" size="touch" aria-label="登出" onClick={() => void logout()} />
      </div>
    </header>
  );
}
