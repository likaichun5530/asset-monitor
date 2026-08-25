export function shouldIgnorePullRefresh(target) {
  return Boolean(target?.closest?.('[data-pull-refresh-ignore="true"], [role="dialog"]'))
}
