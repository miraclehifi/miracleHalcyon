// 实况视频检查（media-upload module-spec §3"实况视频检查"）：图片菜单"实况"项只在同名 .live.mp4 存在时显示。
// 只对站内图片 key 请求（复用 GET /img/* 的 Range 支持，只取第一个字节、不走缓存）：200 / 206 → true，其余与网络错误 → false。
// 结果按地址（去掉片段）存在模块级 Map，本次页面会话有效，并发调用复用同一个请求
import { liveVideoSrc, parseImageKey, stripFragment } from "../markdown/plugins/image-key";

const cache = new Map<string, Promise<boolean>>();

export function hasLiveVideo(imageUrl: string): Promise<boolean> {
  const src = stripFragment(imageUrl);
  if (!parseImageKey(src)) return Promise.resolve(false);
  let result = cache.get(src);
  if (!result) {
    result = fetch(liveVideoSrc(src), { headers: { Range: "bytes=0-0" }, cache: "no-store" }).then(
      (response) => response.status === 200 || response.status === 206,
      () => false,
    );
    cache.set(src, result);
  }
  return result;
}

// 测试用：清空会话缓存
export const resetLiveVideoCache = () => cache.clear();
