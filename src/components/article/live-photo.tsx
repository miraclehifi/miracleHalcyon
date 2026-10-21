// 实况照片播放层（components.md"文章图片"、admin.pen ArticleImage/Live 说明、ADR-006 第 6 点）：ArticleImage、
// ImageGallery 网格单元格与手风琴展开项共用。静态图加载完成后叠在图片上：左上角 LiveBadge，视频 preload="none"、
// 首次播放时才加载；桌面指针移入 0.3s 后静音播放一次、移出暂停并归零；触屏长按 0.3s 播放（可用时震动 10ms）、
// 松手复原，阻止系统长按菜单与文字选择。视频 error、play() 不支持或 canPlayType 为空时隐藏标记，不再尝试播放。
// 外链动态照片（range，ADR-010）：HEVC 按 hvc1 判断；第一次要播放时才按字节范围读取视频（loadVideoRange），读取失败同样隐藏
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { useReducedMotion } from "../../lib/dom/theme";
import { loadVideoRange } from "./external-media";
import { LiveBadge } from "./LiveBadge";

export interface LiveSource {
  videoSrc: string; // 站内：同名 .live.mp4；外链动态照片：原图地址（视频在 range 指定的字节范围内）
  range?: { offset: number; size: number }; // 外链动态照片内嵌视频的字节范围：首次播放时才读取（ADR-010）
  codec?: "hevc"; // 外链动态照片的视频为 HEVC：按 hvc1 判断能否播放
}

const START_DELAY_MS = 300; // 避免划过误触 / 与轻点区分
// 能播放其中任一类型即视为支持。HEVC 必须带 profile：Chrome 对只写 "hvc1" 返回空串（2026-10-21 实测），
// 列出手机动态照片常见的 Main / Main 10（样本 18369 为 Main 10、level 6.0）；实际编码不支持时播放报错，同样退回静态图
const VIDEO_TYPES = {
  avc: ['video/mp4; codecs="avc1.42E01E"'],
  hevc: ['video/mp4; codecs="hvc1.1.6.L150.90"', 'video/mp4; codecs="hvc1.2.4.L180.B0"'],
} as const;

const canPlayCache: Partial<Record<keyof typeof VIDEO_TYPES, boolean>> = {};
const noopSubscribe = () => () => {};
const canPlay = (codec: keyof typeof VIDEO_TYPES) => () => {
  if (canPlayCache[codec] === undefined) {
    const video = document.createElement("video");
    canPlayCache[codec] = VIDEO_TYPES[codec].some((type) => video.canPlayType(type) !== "");
  }
  return canPlayCache[codec];
};
const canPlayAvc = canPlay("avc");
const canPlayHevc = canPlay("hevc");

export function LivePhotoLayer({ videoSrc, range, codec, radius = 8 }: LiveSource & { radius?: number }) {
  const supported = useSyncExternalStore(noopSubscribe, codec === "hevc" ? canPlayHevc : canPlayAvc, () => true);
  const wanted = useRef(false); // 外链视频读取期间指针已离开：读完不再播放
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 视频来源：站内为地址；外链为原图 + 字节范围（只改 mp= 时原图不变，也要换视频）
  const source = range ? `${videoSrc}#${range.offset}+${range.size}` : videoSrc;
  const [loadedSrc, setLoadedSrc] = useState(source);
  if (loadedSrc !== source) {
    setLoadedSrc(source);
    setFailed(false);
    setPlaying(false);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // 进度条：播放中逐帧更新宽度，不触发重新渲染
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && progressRef.current && video.duration > 0) {
        progressRef.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  if (!supported || failed) return null;

  const play = (video: HTMLVideoElement) =>
    video.play()?.catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "NotSupportedError") setFailed(true);
    });

  const start = (vibrate: boolean) => {
    clearTimeout(timer.current);
    wanted.current = true;
    timer.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      if (vibrate) navigator.vibrate?.(10);
      if (!range || video.getAttribute("src")) return void play(video);
      loadVideoRange(videoSrc, range).then(
        (url) => {
          if (videoRef.current !== video) return;
          video.src = url;
          if (wanted.current) play(video);
        },
        () => setFailed(true),
      );
    }, START_DELAY_MS);
  };

  const stop = () => {
    clearTimeout(timer.current);
    wanted.current = false;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  };

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== "touch") start(false);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch") start(true);
  };
  const onTouchEnd = (event: PointerEvent) => {
    if (event.pointerType === "touch") stop();
  };

  return (
    <span
      data-live-photo=""
      className="absolute inset-0 z-[1] block overflow-hidden select-none [-webkit-touch-callout:none]"
      style={{ borderRadius: radius }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={stop}
      onPointerDown={onPointerDown}
      onPointerUp={onTouchEnd}
      onPointerCancel={onTouchEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        key={source} // 外链视频的 src 是读取后命令式设置的，换来源时换新元素
        ref={videoRef}
        src={range ? undefined : videoSrc} // 外链：读取后再设置（见 start）
        muted
        playsInline
        preload="none"
        disableRemotePlayback
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,scale] duration-300 ease-out data-[playing]:opacity-100 ${reduce ? "" : "data-[playing]:scale-[1.06]"}`}
        data-playing={playing ? "" : undefined}
        onPlaying={() => setPlaying(true)}
        onEnded={stop}
        onError={() => {
          clearTimeout(timer.current);
          setFailed(true);
        }}
      />
      {playing && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-overlay">
          <span ref={progressRef} className="block h-full w-0 bg-overlay-ink" />
        </span>
      )}
      <span className="absolute top-3 left-3">
        <LiveBadge playing={playing} />
      </span>
    </span>
  );
}

// 测试用：清空 canPlayType 缓存
export function resetLiveSupportCache() {
  delete canPlayCache.avc;
  delete canPlayCache.hevc;
}
