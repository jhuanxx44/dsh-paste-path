export function normalizePathCandidate(raw) {
  let value = String(raw || '').trim()
  if (value === '' || value.startsWith('#')) return ''
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  if (value.startsWith('file://localhost')) value = value.slice(16)
  else if (value.startsWith('file://')) value = value.slice(7)
  try {
    value = decodeURIComponent(value)
  } catch {
    // Keep the raw path when it is not percent-encoded.
  }
  if (typeof value.normalize === 'function') value = value.normalize('NFC')
  return value.startsWith('/') ? value : ''
}

export function parsePaths(text) {
  const lines = String(text || '').split(/\r?\n/)
  const paths = []
  const seen = {}
  let sawContent = false
  for (const line of lines) {
    if (line.trim() === '') continue
    sawContent = true
    const value = normalizePathCandidate(line)
    if (!value) return []
    if (seen[value]) continue
    seen[value] = true
    paths.push(value)
  }
  return sawContent ? paths : []
}

export function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

export function isSameOriginMutation(req) {
  const host = req.headers.host
  const origin = req.headers.origin
  if (typeof host !== 'string') return false
  try {
    const hostname = new URL(`http://${host}`).hostname
    if (hostname !== '127.0.0.1' && hostname !== 'localhost' && hostname !== '[::1]') return false
  } catch {
    return false
  }
  if (typeof origin === 'string') {
    try {
      const parsed = new URL(origin)
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
    } catch {
      return false
    }
  }
  return req.headers['sec-fetch-site'] === 'same-origin'
}
