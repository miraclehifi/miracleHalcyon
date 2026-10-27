// 豆瓣批量导入（shelf domain-model §4、§5.1，ADR-014）：一次导入一页、同步状态、结束时重建一次。由 createShelfService 并入 ShelfService
import type { CoverStore } from "./cover-store";
import type { DoubanClient } from "./douban/client";
import {
  IMPORT_KINDS, IMPORT_PAGE_SIZE, IMPORT_START_MAX, IMPORT_STATUSES, isDoubanTimestamp, isValidDoubanUid, KIND_TYPES, mapInterest, parseInterestPage,
  type ImportedFields, type ImportKind, type ImportMode, type ImportStatus, type MappedInterest,
} from "./douban/import";
import { isDoubanImageHost, isSafeUrl } from "./douban/link";
import { COVER_MAX_BYTES, detectCoverType, isShelfType, newCoverKey, normalizeEntryInput, type EntryData, type ShelfType } from "./entry";
import {
  DoubanForbiddenError, DoubanUserNotFoundError, DuplicateDoubanError, ImportError, ImportItemError, ShelfValidationError, type ImportItemReason,
} from "./errors";
import type { ShelfHooks } from "./hooks";
import { fillCategories, type ImportCategoryState, type ImportStateRepo } from "./import-state-repo";
import type { ShelfEntry, ShelfRepo } from "./repo";

export const IMPORT_TIMEOUT_MS = 25_000; // ADR-014 §1：整页共享时限
export const IMPORT_CONCURRENCY = 5; // 外部请求并发上限

export interface ImportRequest {
  uid: string;
  kind: ImportKind;
  status: ImportStatus;
  types: ShelfType[];
  mode: ImportMode;
  start: number;
  head: string | null;
}

export interface ImportFailure {
  doubanId: string | null;
  title: string | null;
  reason: ImportItemReason;
}

export interface ImportPageResult {
  total: number;
  head: string | null;
  nextStart: number | null;
  created: number;
  updated: number;
  coverFailed: number;
  failed: ImportFailure[];
}

export interface ImportState {
  uid: string | null;
  categories: ImportCategoryState[];
}

export interface ShelfImporterDeps {
  repo: ShelfRepo;
  store: CoverStore;
  hooks: ShelfHooks;
  douban?: DoubanClient;
  stateRepo?: ImportStateRepo;
  timeoutMs?: number;
  now: () => Date;
  log: (event: string, detail: Record<string, unknown>) => void;
}

const asObject = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

// 请求校验（api-contract"导入"）：任一字段不合法 → VALIDATION_FAILED，不发外部请求
export function parseImportRequest(raw: unknown): ImportRequest {
  const body = asObject(raw);
  const invalid: string[] = [];
  const kindOk = IMPORT_KINDS.includes(body.kind as ImportKind);
  if (!isValidDoubanUid(body.uid)) invalid.push("uid");
  if (!kindOk) invalid.push("kind");
  if (!IMPORT_STATUSES.includes(body.status as ImportStatus)) invalid.push("status");
  const types = body.types;
  const typesOk = Array.isArray(types) && types.length > 0 && types.every(isShelfType) && new Set(types).size === types.length && (!kindOk || types.every((t) => KIND_TYPES[body.kind as ImportKind].includes(t)));
  if (!typesOk) invalid.push("types");
  if (body.mode !== "full" && body.mode !== "incremental") invalid.push("mode");
  const start = body.start;
  const startOk = typeof start === "number" && Number.isInteger(start) && start >= 0 && start <= IMPORT_START_MAX && start % IMPORT_PAGE_SIZE === 0;
  if (!startOk) invalid.push("start");
  else if (start > 0 && body.head !== null && !isDoubanTimestamp(body.head)) invalid.push("head");
  if (invalid.length > 0) throw new ShelfValidationError(invalid);
  return {
    uid: body.uid as string, kind: body.kind as ImportKind, status: body.status as ImportStatus, types: types as ShelfType[], mode: body.mode as ImportMode,
    start: start as number, head: start === 0 ? null : (body.head as string | null),
  };
}

// 并发上限：完成的任务把名额直接交给排队者，避免新来的抢占后超限
function limiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
}

const TIMED_OUT = Symbol("timeout");
type Outcome = { kind: "skipped" } | { kind: "created" | "updated"; coverFailed: boolean };

// 已有条目按豆瓣有值的字段覆盖；hidden、封面、createdAt 不动；游戏平台映射不上时保留原值，新游戏默认 ps5（ADR-014 §4）
function entryInput(f: ImportedFields, existing: ShelfEntry | null) {
  const keepGame = f.type === "game" && existing?.type === "game";
  return {
    type: f.type, title: f.title, creator: f.creator ?? existing?.creator ?? null, year: f.year ?? existing?.year ?? null,
    status: f.status, rating: f.rating, markedOn: f.markedOn, comment: f.comment, doubanId: f.douban.id, doubanUrl: f.douban.url,
    platform: f.type === "game" ? (f.platform ?? (keepGame ? existing.platform : null) ?? "ps5") : null,
    coverUrl: keepGame ? existing.coverUrl : null,
  };
}

export function createShelfImporter({ repo, store, hooks, douban, stateRepo, timeoutMs = IMPORT_TIMEOUT_MS, now, log }: ShelfImporterDeps) {
  function normalized(f: ImportedFields, existing: ShelfEntry | null): EntryData {
    let data: EntryData;
    try {
      data = normalizeEntryInput(entryInput(f, existing));
    } catch {
      throw new ImportItemError(f.douban.id, "PARSE_FAILED", f.title);
    }
    const keepGame = data.type === "game" && existing?.type === "game";
    return keepGame ? { ...data, coverWidth: existing.coverWidth, coverHeight: existing.coverHeight } : data;
  }

  async function overwrite(existing: ShelfEntry, f: ImportedFields): Promise<void> {
    const data = normalized(f, existing);
    const coverKey = data.type === "game" ? null : existing.coverKey;
    const entry = await repo.update(existing.id, { ...data, coverKey, now: now().toISOString() });
    if (!entry) throw new ImportItemError(f.douban.id, "WRITE_FAILED", f.title);
    if (existing.coverKey && existing.coverKey !== coverKey) {
      await store.delete(existing.coverKey).catch((error: unknown) => log("shelf_cover_delete_failed", { key: existing.coverKey, error: (error as Error)?.name ?? "Error" }));
    }
  }

  return {
    async importState(uid?: unknown): Promise<ImportState> {
      if (uid !== undefined && uid !== null && !isValidDoubanUid(uid)) throw new ShelfValidationError(["uid"]);
      if (!stateRepo) throw new Error("ImportStateRepo 未配置");
      const resolved = (uid as string | null | undefined) ?? (await stateRepo.lastUid());
      return { uid: resolved, categories: resolved ? await stateRepo.get(resolved) : fillCategories([]) };
    },

    async finishImport(changed: unknown): Promise<void> {
      if (typeof changed !== "number" || !Number.isInteger(changed) || changed < 0) throw new ShelfValidationError(["changed"]);
      if (changed > 0) await hooks.onShelfChanged();
    },

    // shelf domain-model §5.1：不触发重建；单条失败进 failed；一步完整结束（nextStart = null）才前移 types 中各类别的水位
    async importPage(raw: unknown): Promise<ImportPageResult> {
      const req = parseImportRequest(raw);
      if (!douban || !stateRepo) throw new ImportError("FETCH_FAILED");
      const startedAt = now().toISOString();
      await stateRepo.touch(req.uid, req.types, req.status, startedAt);
      const states = (await stateRepo.get(req.uid)).filter((s) => s.status === req.status && req.types.includes(s.type));
      const watermarks = states.map((s) => s.watermark);
      const cut = req.mode === "incremental" && watermarks.every((w) => w !== null) ? (watermarks as string[]).sort()[0] : null;

      const controller = new AbortController();
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          resolve(TIMED_OUT);
        }, timeoutMs);
      });
      const limit = limiter(IMPORT_CONCURRENCY);
      const call = <T>(fn: (signal: AbortSignal) => Promise<T>) => Promise.race([limit(() => fn(controller.signal)), deadline]);
      const client = douban;

      try {
        let listed: unknown;
        try {
          listed = await call((signal) => client.fetchInterests({ uid: req.uid, kind: req.kind, status: req.status, start: req.start, count: IMPORT_PAGE_SIZE }, signal));
        } catch (error) {
          if (error instanceof DoubanUserNotFoundError) throw new ImportError("DOUBAN_USER_NOT_FOUND");
          if (error instanceof DoubanForbiddenError) throw new ImportError("DOUBAN_FORBIDDEN");
          throw new ImportError("FETCH_FAILED");
        }
        if (listed === TIMED_OUT) throw new ImportError("FETCH_FAILED");
        let page;
        try {
          page = parseInterestPage(listed);
        } catch {
          throw new ImportError("FETCH_FAILED");
        }

        const first = asObject(page.interests[0]).create_time;
        const head = req.start === 0 ? (isDoubanTimestamp(first) ? first : null) : req.head;
        let reached = false;
        const items = page.interests.filter((item) => {
          const time = asObject(item).create_time;
          const early = cut !== null && isDoubanTimestamp(time) && time < cut;
          if (early) reached = true;
          return !early;
        });
        const ids = items.map((item) => asObject(asObject(item).subject).id).filter((id): id is string => typeof id === "string");
        const existing = await repo.findByDoubanIds([...new Set(ids)]);
        const notTimedOut = (doubanId: string, title: string) => {
          if (timedOut) throw new ImportItemError(doubanId, "FETCH_FAILED", title);
        };

        // 封面只从豆瓣图片域下载并直接写 R2；任何失败返回 null（条目照常写入）
        async function importCover(url: string | null, m: MappedInterest): Promise<string | null> {
          let parsed: URL;
          try {
            parsed = new URL(url ?? "");
          } catch {
            return null;
          }
          if (!isSafeUrl(parsed) || !isDoubanImageHost(parsed.hostname)) return null;
          let bytes: Uint8Array | typeof TIMED_OUT;
          try {
            bytes = await call((signal) => client.fetchCover(parsed.href, signal));
          } catch {
            return null;
          }
          notTimedOut(m.doubanId, m.fields.title);
          if (bytes === TIMED_OUT || bytes.byteLength > COVER_MAX_BYTES) return null;
          const mime = detectCoverType(bytes);
          if (!mime) return null;
          const key = newCoverKey(now(), mime);
          try {
            await store.put(key, bytes, mime);
            return key;
          } catch {
            return null;
          }
        }

        async function create(m: MappedInterest): Promise<Outcome> {
          const data = normalized(m.fields, null);
          const coverKey = data.type === "game" ? null : await importCover(m.coverUrl, m);
          notTimedOut(m.doubanId, m.fields.title);
          try {
            await repo.insert({ ...data, coverKey, now: now().toISOString() });
            return { kind: "created", coverFailed: data.type !== "game" && coverKey === null };
          } catch (error) {
            if (coverKey) await store.delete(coverKey).catch(() => undefined);
            if (!(error instanceof DuplicateDoubanError)) throw error;
          }
          const raced = (await repo.findByDoubanIds([m.doubanId])).get(m.doubanId); // 并发写入：转为覆盖一次
          if (!raced) throw new ImportItemError(m.doubanId, "WRITE_FAILED", m.fields.title);
          await overwrite(raced, m.fields);
          return { kind: "updated", coverFailed: false };
        }

        async function processItem(item: unknown): Promise<Outcome> {
          const pre = mapInterest(req.kind, item, {});
          if ("skip" in pre) return { kind: "skipped" };
          if (req.kind !== "book" && !req.types.includes(pre.fields.type)) return { kind: "skipped" }; // 书要先取标签才能判定漫画
          let m: MappedInterest = pre;
          if (req.kind === "book") {
            // 与识别不同，导入不按书降级：否则漫画被写成书、已有漫画被覆盖成书（单条失败，重新导入可补）
            const tags = await call((signal) => client.fetchBookTags(pre.doubanId, signal)).catch(() => null);
            notTimedOut(pre.doubanId, pre.fields.title);
            if (tags === null || tags === TIMED_OUT) throw new ImportItemError(pre.doubanId, "FETCH_FAILED", pre.fields.title);
            m = mapInterest("book", item, { tags }) as MappedInterest;
            if (!req.types.includes(m.fields.type)) return { kind: "skipped" };
          } else if (req.kind === "game") {
            const game = await call((signal) => client.fetchSubject({ kind: "game", id: pre.doubanId }, signal)).catch(() => undefined);
            notTimedOut(pre.doubanId, pre.fields.title);
            m = mapInterest("game", item, { game: game === TIMED_OUT ? undefined : game }) as MappedInterest;
          }
          const old = existing.get(m.doubanId);
          if (!old) return create(m);
          notTimedOut(m.doubanId, m.fields.title);
          await overwrite(old, m.fields);
          return { kind: "updated", coverFailed: false };
        }

        const result: ImportPageResult = { total: page.total, head, nextStart: null, created: 0, updated: 0, coverFailed: 0, failed: [] };
        const outcomes = await Promise.all(
          items.map((item) =>
            processItem(item).catch((error: unknown): ImportFailure => {
              if (error instanceof ImportItemError) return { doubanId: error.doubanId, title: error.title, reason: error.reason };
              const subject = asObject(asObject(item).subject);
              log("shelf_import_write_failed", { doubanId: subject.id, error: (error as Error)?.name ?? "Error" });
              return { doubanId: typeof subject.id === "string" ? subject.id : null, title: typeof subject.title === "string" ? subject.title : null, reason: "WRITE_FAILED" };
            }),
          ),
        );
        for (const outcome of outcomes) {
          if ("reason" in outcome) result.failed.push(outcome);
          else if (outcome.kind !== "skipped") {
            result[outcome.kind]++;
            if (outcome.coverFailed) result.coverFailed++;
          }
        }
        result.nextStart = reached || req.start + IMPORT_PAGE_SIZE >= page.total ? null : req.start + IMPORT_PAGE_SIZE;
        if (result.nextStart === null) await stateRepo.complete(req.uid, req.types, req.status, head, now().toISOString());
        return result;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
