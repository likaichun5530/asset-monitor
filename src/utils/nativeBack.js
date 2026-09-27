export const NATIVE_BACK_EVENT = 'youshu:native-back'

const DETAIL_PAGES = new Set(['/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto', '/future', '/cash'])
const PRIMARY_PAGES = new Set(['/market', '/holdings', '/target', '/settings'])

export function getNativeBackTarget(pathname) {
  if (/^\/settings\/[^/]+$/.test(pathname)) return '/settings'
  if (DETAIL_PAGES.has(pathname)) return '/holdings'
  if (PRIMARY_PAGES.has(pathname)) return '/'
  return null
}

export function requestInPageBack() {
  const event = new CustomEvent(NATIVE_BACK_EVENT, { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}
