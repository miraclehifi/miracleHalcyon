// MediaEntryRow（components.md"业务区块"、admin-media.md §一，设计稿 10 / 10m）：后台书影音条目行。
// 桌面：封面 32×48 · 标题（进行中 / 已隐藏徽标）· 作者 · 星级 · 状态 · 标记日期 · 编辑 / 隐藏 / 删除；
// 手机：封面 40×60，右侧标题行 + "作者 · 星级 · 状态 日期"，⋯ 打开菜单（编辑 / 隐藏或取消隐藏 / 删除），点行其余区域进编辑页
import { useRef, useState } from "react";
import { statusLabel } from "../../../domains/shelf/entry";
import type { ShelfEntryView } from "../../../lib/admin/shelf-client";
import { IconButton } from "../../ui/IconButton";
import { ICONS } from "../../ui/icons";
import { Menu } from "../../ui/Menu";
import { StarRating } from "../../ui/StarRating";

export interface MediaEntryRowProps {
  entry: ShelfEntryView;
  busy?: boolean; // 隐藏 / 取消隐藏请求中
  onToggleHidden(entry: ShelfEntryView): void;
  onDelete(entry: ShelfEntryView, trigger: HTMLElement): void;
}

const ImageOff = ICONS["image-off"];
const EyeOff = ICONS["eye-off"];

function Cover({ src, className }: { src: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <span role="img" aria-label="无封面" className={`flex shrink-0 items-center justify-center rounded-[3px] bg-surface-sunken text-ink-faint ${className}`}>
        <ImageOff size={14} aria-hidden="true" />
      </span>
    );
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`shrink-0 rounded-[3px] object-cover ${className}`} />;
}

function Badges({ entry }: { entry: ShelfEntryView }) {
  return (
    <>
      {entry.status === "in_progress" && (
        <span className="shrink-0 rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-caption font-semibold text-accent">{statusLabel(entry.type, "in_progress")}</span>
      )}
      {entry.hidden && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] bg-surface-sunken px-1.5 py-0.5 text-caption text-ink-muted">
          <EyeOff size={12} aria-hidden="true" />
          已隐藏
        </span>
      )}
    </>
  );
}

export function MediaEntryRow({ entry, busy = false, onToggleHidden, onDelete }: MediaEntryRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const editHref = `/admin/media/${entry.id}`;
  const name = `《${entry.title}》`;
  const status = statusLabel(entry.type, entry.status);
  const titleClass = `truncate text-[15px] ${entry.hidden ? "text-ink-muted" : "text-ink"}`;

  return (
    <li className="border-b border-line" data-entry-id={entry.id}>
      {/* 桌面 */}
      <div className="flex items-center gap-4 px-2 py-2.5 max-md:hidden">
        <Cover src={entry.cover} className="h-12 w-8" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <a href={editHref} className={`${titleClass} hover:underline`}>
            {entry.title}
          </a>
          <Badges entry={entry} />
        </div>
        <span className="w-40 shrink-0 truncate text-ui text-ink-muted">{entry.creator ?? "—"}</span>
        <span className="flex w-[88px] shrink-0 items-center">
          <StarRating value={entry.rating} size="sm" readOnly />
        </span>
        <span className="w-9 shrink-0 text-meta text-ink-muted">{status}</span>
        <span className="w-20 shrink-0 font-mono text-caption text-ink-faint tabular-nums">{entry.markedOn}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <a
            href={editHref}
            aria-label={`编辑${name}`}
            className="inline-flex size-7 items-center justify-center rounded-control text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <ICONS.pencil size={16} aria-hidden="true" />
          </a>
          <IconButton
            icon={entry.hidden ? "eye" : "eye-off"}
            aria-label={`${entry.hidden ? "取消隐藏" : "隐藏"}${name}`}
            disabled={busy}
            onClick={() => onToggleHidden(entry)}
          />
          <IconButton ref={deleteRef} icon="trash-2" aria-label={`删除${name}`} onClick={(e) => onDelete(entry, e.currentTarget)} />
        </div>
      </div>

      {/* 手机 */}
      <div className="relative flex items-center gap-3 py-2.5 md:hidden">
        <Cover src={entry.cover} className="h-[60px] w-10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <a href={editHref} className={`${titleClass} after:absolute after:inset-0`}>
              {entry.title}
            </a>
            <Badges entry={entry} />
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-caption text-ink-muted">
            {entry.creator && <span className="truncate">{entry.creator}</span>}
            {entry.creator && <span aria-hidden="true">·</span>}
            {entry.rating !== null && <StarRating value={entry.rating} size="sm" readOnly />}
            {entry.rating !== null && <span aria-hidden="true">·</span>}
            <span className="shrink-0">{`${status} ${entry.markedOn}`}</span>
          </p>
        </div>
        {/* 菜单打开时抬高层级，盖住后面各行的 ⋯ 按钮（每行按钮都是 z-10） */}
        <div className={`relative ${menuOpen ? "z-30" : "z-10"}`}>
          <IconButton ref={moreRef} icon="ellipsis" size="touch" aria-label={`${name}的操作`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
          <Menu
            open={menuOpen}
            aria-label={`${name}的操作`}
            onClose={() => {
              setMenuOpen(false);
              moreRef.current?.focus();
            }}
          >
            <Menu.Item onSelect={() => window.location.assign(editHref)}>编辑</Menu.Item>
            <Menu.Item disabled={busy} onSelect={() => onToggleHidden(entry)}>
              {entry.hidden ? "取消隐藏" : "隐藏"}
            </Menu.Item>
            <Menu.Item onSelect={() => moreRef.current && onDelete(entry, moreRef.current)}>删除</Menu.Item>
          </Menu>
        </div>
      </div>
    </li>
  );
}
