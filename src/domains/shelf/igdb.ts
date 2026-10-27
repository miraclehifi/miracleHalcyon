// IGDB 封面宽高读取（shelf domain-model §3，ADR-013 §3）：只请求规范地址，不跟随跳转，读够文件头即停
import { normalizeIgdbCoverUrl, readImageSize, type ImageSize } from "./entry";
import { IgdbImageError } from "./errors";

export interface IgdbImageClient {
  readSize(url: string, signal: AbortSignal): Promise<ImageSize>;
}

export const IGDB_HEAD_MAX = 65_536;
const SIZE_MAX = 20_000; // data-model cover_width / cover_height 上限

export function createIgdbImageClient(fetchImpl: typeof fetch = fetch): IgdbImageClient {
  return {
    async readSize(url, signal) {
      if (normalizeIgdbCoverUrl(url) !== url) throw new IgdbImageError("不是规范 IGDB 地址");
      let response: Response;
      try {
        response = await fetchImpl(url, { redirect: "manual", signal });
      } catch (error) {
        throw new IgdbImageError((error as Error)?.name ?? "network");
      }
      if (response.status < 200 || response.status >= 300 || !response.body) {
        await response.body?.cancel();
        throw new IgdbImageError(String(response.status));
      }
      const reader = response.body.getReader();
      const head = new Uint8Array(IGDB_HEAD_MAX);
      let size = 0;
      try {
        while (size < IGDB_HEAD_MAX) {
          const { done, value } = await reader.read();
          if (done) break;
          const take = Math.min(value.byteLength, IGDB_HEAD_MAX - size);
          head.set(value.subarray(0, take), size);
          size += take;
          const found = readImageSize(head.subarray(0, size));
          if (found) {
            if (found.width > SIZE_MAX || found.height > SIZE_MAX) throw new IgdbImageError("尺寸超出范围");
            return found;
          }
        }
        throw new IgdbImageError("解析不出宽高");
      } catch (error) {
        throw error instanceof IgdbImageError ? error : new IgdbImageError((error as Error)?.name ?? "read");
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    },
  };
}
