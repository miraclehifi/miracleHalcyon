// 实况照片播放层（components.md"文章图片"、admin.pen ArticleImage/Live 说明、ADR-006 第 6 点）：ArticleImage、
// ImageGallery 网格单元格与手风琴展开项共用。静态图加载完成后叠在图片上：左上角 LiveBadge，视频 preload="none"、
// 首次播放时才加载；桌面指针移入 0.3s 后静音播放一次、移出暂停并归零；触屏长按 0.3s 播放（可用时震动 10ms）、
// 松手复原，阻止系统长按菜单与文字选择。视频 error、play() 不支持或 canPlayType 为空时隐藏标记，不再尝试播放
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { useReducedMotion } from "../../lib/dom/theme";
import { LiveBadge } from "./LiveBadge";

export interface LiveSource {
  videoSrc: string;
}

const START_DELAY_MS = 300; // 避免划过误触 / 与轻点区分
const VIDEO_TYPE = 'video/mp4; codecs="avc1.42E01E"';

let canPlayCache: boolean | undefined;
const noopSubscribe = () => () => {};
function canPlayMp4(): boolean {
  canPlayCache ??= document.createElement("video").canPlayType(VIDEO_TYPE) !== "";
  return canPlayCache;
}

export function LivePhotoLayer({ videoSrc, radius = 8 }: LiveSource & { radius?: number }) {
  const supported = useSyncExternalStore(noopSubscribe, canPlayMp4, () => true);
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [loadedSrc, setLoadedSrc] = useState(videoSrc);
  if (loadedSrc !== videoSrc) {
    setLoadedSrc(videoSrc);
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

  const start = (vibrate: boolean) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      if (vibrate) navigator.vibrate?.(10);
      video.play()?.catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "NotSupportedError") setFailed(true);
      });
    }, START_DELAY_MS);
  };

  const stop = () => {
    clearTimeout(timer.current);
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
        ref={videoRef}
        src={videoSrc}
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
