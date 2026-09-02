export const REFRESH_SOURCE_ORDER = Object.freeze(['holdings', 'history', 'target', 'market', 'futures'])

const HISTORY_DETAIL_PAGES = new Set(['/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto'])

export function getPageRefreshPlan(pathname) {
  let primary
  if (pathname === '/') primary = ['holdings', 'history']
  else if (pathname === '/market') primary = ['market']
  else if (pathname === '/target') primary = ['target']
  else if (pathname === '/future') primary = ['holdings', 'futures']
  else if (pathname === '/cash') primary = ['holdings', 'target']
  else if (pathname === '/holdings') primary = ['holdings']
  else if (HISTORY_DETAIL_PAGES.has(pathname)) primary = ['holdings', 'history']
  else if (pathname === '/settings' || pathname.startsWith('/settings/')) primary = []
  else primary = ['holdings', 'history']

  const primarySet = new Set(primary)
  return {
    primary,
    queued: REFRESH_SOURCE_ORDER.filter((source) => !primarySet.has(source)),
  }
}
