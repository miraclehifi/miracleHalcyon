// shelf 服务（shelf domain-model §4）：条目增删改、隐藏、读者端公开列表；封面在本领域内存取
import type { CoverStore } from "./cover-store";
import type { DoubanClient } from "./douban/client";
import { extractDoubanLink, isDoubanImageHost, isSafeUrl } from "./douban/link";
import { mapSubject, type MissingField } from "./douban/map";
import { canonicalDoubanUrl, COVER_MAX_BYTES, detectCoverType, isShelfType, newCoverKey, normalizeEntryInput, sortEntries, type EntryData, type ImageSize, type ShelfType } from "./entry";
import {
  CoverLinkUnreachableError, CoverTooLargeError, CoverTypeError, DoubanParseError, DuplicateDoubanError, EntryNotFoundError, GameCoverUploadError, RecognizeError, ShelfValidationError,
} from "./errors";
import { noopShelfHooks, type ShelfHooks } from "./hooks";
import type { IgdbImageClient } from "./igdb";
import type { DoubanMatch, ShelfEntry, ShelfRepo } from "./repo";

export interface CoverUpload {
  bytes: Uint8Array;
}

export type CoverChange = "keep" | "remove" | CoverUpload;

export interface ShelfServiceDeps {
  repo: ShelfRepo;
  store: CoverStore;
  hooks?: ShelfHooks;
  douban?: DoubanClient;
  igdb?: IgdbImageClient;
  recognizeTimeoutMs?: number;
  igdbTimeoutMs?: number;
  now?: () => Date;
  log?: (event: string, detail: Record<string, unknown>) => void;
}

export const RECOGNIZE_TIMEOUT_MS = 8000; // Feature NFR：单次识别总耗时
export const RECOGNIZE_TEXT_MAX = 10_000;
export const IGDB_TIMEOUT_MS = 8000; // ADR-013 §3：保存时读取 IGDB 封面宽高

export interface RecognizedFields {
  type: ShelfType;
  title: string;
  creator: string | null;
  year: number | null;
  coverData: string | null; // 服务端下载的封面 data: URL（ADR-011 §3）
  doubanUrl: string;
  doubanId: string;
}

export type RecognizeResult = { fields: RecognizedFields; missing: MissingField[]; duplicate?: undefined } | { duplicate: DoubanMatch; fields?: undefined; missing?: undefined };

const TIMED_OUT = Symbol("timeout");

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const defaultLog = (event: string, detail: Record<string, unknown>) => console.error(event, detail);

export function createShelfService({
  repo, store, hooks = noopShelfHooks, douban, igdb, recognizeTimeoutMs = RECOGNIZE_TIMEOUT_MS, igdbTimeoutMs = IGDB_TIMEOUT_MS, now = () => new Date(), log = defaultLog,
}: ShelfServiceDeps) {
  // 读取 IGDB 封面宽高：任何失败（含超时）都归为 COVER_LINK_UNREACHABLE
  async function readCoverSize(url: string): Promise<ImageSize> {
    if (!igdb) throw new CoverLinkUnreachableError();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new CoverLinkUnreachableError());
      }, igdbTimeoutMs);
    });
    try {
      return await Promise.race([igdb.readSize(url, controller.signal), deadline]);
    } catch {
      throw new CoverLinkUnreachableError();
    } finally {
      clearTimeout(timer);
    }
  }

  // 游戏封面只认 IGDB 链接（ADR-013）：链接与旧值相同沿用旧宽高，否则读取；非游戏 normalizeEntryInput 已置空
  async function withGameCover(data: EntryData, upload: boolean, old?: ShelfEntry): Promise<EntryData> {
    if (data.type !== "game") return data;
    if (upload) throw new GameCoverUploadError();
    if (!data.coverUrl) return data;
    if (old && old.coverUrl === data.coverUrl) return { ...data, coverWidth: old.coverWidth, coverHeight: old.coverHeight };
    const size = await readCoverSize(data.coverUrl);
    return { ...data, coverWidth: size.width, coverHeight: size.height };
  }

  async function putCover(cover: CoverUpload): Promise<string> {
    if (cover.bytes.byteLength > COVER_MAX_BYTES) throw new CoverTooLargeError();
    const mime = detectCoverType(cover.bytes);
    if (!mime) throw new CoverTypeError();
    const key = newCoverKey(now(), mime);
    await store.put(key, cover.bytes, mime);
    return key;
  }

  async function dropCover(key: string | null): Promise<void> {
    if (!key) return;
    try {
      await store.delete(key);
    } catch (error) {
      log("shelf_cover_delete_failed", { key, error: (error as Error)?.name ?? "Error" });
    }
  }

  // 封面只从豆瓣图片域下载；任何失败（超时、超限、非图片）都返回 null，由调用方列入 missing
  async function downloadCover(url: string, within: <T>(p: Promise<T>) => Promise<T | typeof TIMED_OUT>, signal: AbortSignal): Promise<string | null> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (!douban || !isSafeUrl(parsed) || !isDoubanImageHost(parsed.hostname)) return null;
    try {
      const bytes = await within(douban.fetchCover(parsed.href, signal));
      if (bytes === TIMED_OUT || bytes.byteLength > COVER_MAX_BYTES) return null;
      const mime = detectCoverType(bytes);
      return mime ? `data:${mime};base64,${toBase64(bytes)}` : null;
    } catch {
      return null;
    }
  }

  async function mustGet(id: number): Promise<ShelfEntry> {
    const entry = await repo.get(id);
    if (!entry) throw new EntryNotFoundError(id);
    return entry;
  }

  return {
    async list(type: unknown): Promise<ShelfEntry[]> {
      if (!isShelfType(type)) throw new ShelfValidationError(["type"]);
      return sortEntries(await repo.listByType(type));
    },

    get: mustGet,

    // 读者端：只含显示中，按 id 降序（同日新建在前，供 sortEntries 稳定排序）
    listPublic: (): Promise<ShelfEntry[]> => repo.listVisible(),

    async create(raw: unknown, cover?: CoverUpload): Promise<ShelfEntry> {
      const parsed = normalizeEntryInput(raw);
      if (parsed.type === "game" && cover) throw new GameCoverUploadError();
      if (parsed.douban) {
        const existing = await repo.findByDoubanId(parsed.douban.id);
        if (existing) throw new DuplicateDoubanError({ id: existing.id, title: existing.title });
      }
      const data = await withGameCover(parsed, Boolean(cover));
      const coverKey = cover ? await putCover(cover) : null;
      let entry: ShelfEntry;
      try {
        entry = await repo.insert({ ...data, coverKey, now: now().toISOString() });
      } catch (error) {
        await dropCover(coverKey);
        throw error;
      }
      await hooks.onShelfChanged();
      return entry;
    },

    // 豆瓣字段只能保持原值或清除（不变量 2）；新封面先写入，更新成功后删除旧对象；游戏没有上传封面（不变量 6、8）
    async update(id: number, raw: unknown, coverChange: CoverChange): Promise<ShelfEntry> {
      const old = await mustGet(id);
      const parsed = normalizeEntryInput(raw);
      const data = await withGameCover({ ...parsed, douban: parsed.douban === null ? null : old.douban }, typeof coverChange === "object", old);
      const newKey = typeof coverChange === "object" ? await putCover(coverChange) : null;
      const coverKey = data.type === "game" ? null : coverChange === "keep" ? old.coverKey : newKey;
      let entry: ShelfEntry | null;
      try {
        entry = await repo.update(id, { ...data, coverKey, now: now().toISOString() });
      } catch (error) {
        await dropCover(newKey);
        throw error;
      }
      if (!entry) {
        await dropCover(newKey);
        throw new EntryNotFoundError(id);
      }
      if (old.coverKey !== coverKey) await dropCover(old.coverKey);
      await hooks.onShelfChanged();
      return entry;
    },

    async setHidden(id: number, hidden: boolean): Promise<ShelfEntry> {
      const result = await repo.setHidden(id, hidden, now());
      if (!result) throw new EntryNotFoundError(id);
      if (result.changed) await hooks.onShelfChanged();
      return result.entry;
    },

    async remove(id: number): Promise<void> {
      const removed = await repo.delete(id);
      if (!removed) throw new EntryNotFoundError(id);
      await dropCover(removed.coverKey);
      await hooks.onShelfChanged();
    },

    // shelf domain-model §5：只解析条目本身；识别不写 D1 / R2；封面失败只列入 missing；整次识别共享一个时限
    async recognize(text: string, excludeId?: number | null): Promise<RecognizeResult> {
      const input = typeof text === "string" ? text.trim() : "";
      if (input === "" || input.length > RECOGNIZE_TEXT_MAX) throw new ShelfValidationError(["text"]);
      const link = extractDoubanLink(input);
      if (!link) throw new RecognizeError("NOT_DOUBAN_LINK");
      if (link.kind === "not_subject") throw new RecognizeError("NOT_SUBJECT_LINK");
      const { ref } = link;

      const existing = await repo.findByDoubanId(ref.id);
      if (existing && existing.id !== excludeId) return { duplicate: existing };
      if (!douban) throw new RecognizeError("FETCH_FAILED");

      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(TIMED_OUT);
        }, recognizeTimeoutMs);
      });
      const within = <T>(promise: Promise<T>) => Promise.race([promise, deadline]);
      try {
        const subject = within(douban.fetchSubject(ref, controller.signal));
        const tags = ref.kind === "book" ? within(douban.fetchBookTags(ref.id, controller.signal)).catch(() => [] as string[]) : Promise.resolve([] as string[]);
        let json: unknown;
        try {
          json = await subject;
        } catch (error) {
          throw new RecognizeError(error instanceof DoubanParseError ? "PARSE_FAILED" : "FETCH_FAILED");
        }
        if (json === TIMED_OUT) throw new RecognizeError("FETCH_FAILED");
        const tagList = await tags;
        let mapped;
        try {
          mapped = mapSubject(ref.kind, json, tagList === TIMED_OUT ? [] : tagList);
        } catch {
          throw new RecognizeError("PARSE_FAILED");
        }
        const missing = [...mapped.missing];
        let coverData: string | null = null;
        if (mapped.fields.type === "game") {
          if (!missing.includes("cover")) missing.push("cover"); // 游戏封面用 IGDB 链接，不取豆瓣封面（ADR-013 §5）
        } else if (mapped.coverUrl) {
          coverData = await downloadCover(mapped.coverUrl, within, controller.signal);
          if (coverData === null) missing.push("cover");
        }
        return { fields: { ...mapped.fields, coverData, doubanUrl: canonicalDoubanUrl(ref.kind, ref.id), doubanId: ref.id }, missing };
      } finally {
        clearTimeout(timer);
      }
    },

    async counts(type: ShelfType) {
      const entries = await repo.listByType(type);
      const visible = entries.filter((e) => !e.hidden);
      return { total: visible.length, inProgress: visible.filter((e) => e.status === "in_progress").length, hidden: entries.length - visible.length };
    },
  };
}

export type ShelfService = ReturnType<typeof createShelfService>;
