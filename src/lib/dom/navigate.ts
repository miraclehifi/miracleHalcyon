// 整页跳转（单独成模块，单元测试可替换）
export function navigate(url: string) {
  window.location.assign(url);
}
