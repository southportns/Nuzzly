"use client"

/**
 * 统一登录入口 — 所有调用 openLoginModal() 的地方都会跳转到 /login 页面
 */
export function openLoginModal() {
  window.location.href = "/login"
}

export function closeLoginModal() {
  // no-op: 不再有弹窗
}

/**
 * 兼容旧接口，返回固定值。Header 等组件已不再需要此 hook。
 */
export function useLoginModal() {
  return [false, (_v: boolean) => {}] as const
}
