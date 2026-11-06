/**
 * "Since your last visit": the moment the previous browser session started.
 * Read once per session so the number doesn't reset while you work.
 */
export function lastVisitSince(userId: string): number {
  const sKey = `visit-since:${userId}`
  const lKey = `last-visit:${userId}`
  try {
    const cached = sessionStorage.getItem(sKey)
    if (cached) return Number(cached)
    const prev = Number(localStorage.getItem(lKey) || 0)
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    const since = prev || startOfToday
    sessionStorage.setItem(sKey, String(since))
    localStorage.setItem(lKey, String(Date.now()))
    return since
  } catch {
    return new Date(new Date().setHours(0, 0, 0, 0)).getTime()
  }
}
