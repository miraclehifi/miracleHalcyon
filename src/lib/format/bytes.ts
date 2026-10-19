// 文件体积显示（shared-field-formats"文件体积"）：1 MB = 1,048,576 B，与上传上限"50MB = 50 MiB"同口径
const KB = 1024;
const MB = 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  if (bytes < MB) return `${Math.ceil(bytes / KB)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}
