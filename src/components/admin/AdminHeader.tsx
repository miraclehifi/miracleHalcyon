// AdminHeader（components.md"文章列表"，admin-post-list.md"布局"）：后台顶栏，站点名 +"查看博客""登出"
// 手机端两个操作只留图标（44×44，带 aria-label）。"登出"在 Sprint 2（US-02）接入，此前禁用
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

const openBlog = () => window.open("/", "_blank", "noopener");

export function AdminHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-10 py-3.5 max-md:px-4 max-md:py-1">
      <a href="/admin" className="flex items-baseline gap-2.5">
        <span className="text-title-sm font-semibold text-ink">miracleHalcyon</span>
        <span className="text-meta text-ink-muted">后台</span>
      </a>
      <div className="flex items-center gap-1 max-md:hidden">
        <Button variant="ghost" icon="external-link" onClick={openBlog}>
          查看博客
        </Button>
        <Button variant="ghost" icon="log-out" disabled>
          登出
        </Button>
      </div>
      <div className="flex items-center md:hidden">
        <IconButton icon="external-link" size="touch" aria-label="查看博客" onClick={openBlog} />
        <IconButton icon="log-out" size="touch" aria-label="登出" disabled />
      </div>
    </header>
  );
}
