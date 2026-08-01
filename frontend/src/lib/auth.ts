/** Auth helpers — token stored after login */

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem('sabzi_token') || localStorage.getItem('sabzi_auth') === '1')
}

export function clearAuth() {
  localStorage.removeItem('sabzi_token')
  localStorage.removeItem('sabzi_auth')
  localStorage.removeItem('sabzi_user')
}
