// 上传并发上限（media-upload module-spec §1：逐项、并发 2）：超出的任务排队，前一个结束（成功或失败）后补上
export function createLimiter(max: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    running--;
    queue.shift()?.();
  };
  return function limit<T>(job: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        running++;
        job().then(resolve, reject).finally(next);
      };
      if (running < max) start();
      else queue.push(start);
    });
  };
}

export const UPLOAD_CONCURRENCY = 2;
