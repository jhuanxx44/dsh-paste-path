import { spawn } from 'node:child_process'
import { Buffer } from 'node:buffer'
import { isLoopbackAddress, isSameOriginMutation, parsePaths } from './paths.js'

export const name = 'dsh-paste-path'
export const inject = []

const PEEK_ROUTE = '/dsh-paste-path/peek'
const PASTE_ROUTE = '/dsh-paste-path/paste'
const OSA_TIMEOUT_MS = 2500
const CHANGE_COUNT_SCRIPT = [
  'use framework "AppKit"',
  'use scripting additions',
  'set pb to current application\'s NSPasteboard\'s generalPasteboard',
  'return (pb\'s changeCount()) as text',
].join('\n')
const APPLESCRIPT = [
  'use framework "AppKit"',
  'use framework "Foundation"',
  'use scripting additions',
  'set pb to current application\'s NSPasteboard\'s generalPasteboard',
  'set names to pb\'s propertyListForType:"NSFilenamesPboardType"',
  'set out to ""',
  'if names is not missing value then',
  '  set theList to names as list',
  '  repeat with p in theList',
  '    set out to out & (p as text) & linefeed',
  '  end repeat',
  'end if',
  'if out is "" then',
  '  set theText to pb\'s stringForType:"public.utf8-plain-text"',
  '  if theText is not missing value then set out to theText as text',
  'end if',
  'return out',
].join('\n')

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value)
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('content-length', String(Buffer.byteLength(body)))
  res.end(body)
}

function runOsascript(script) {
  return new Promise((resolve) => {
    const child = spawn('osascript', [], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish({ ok: false, text: '', error: 'osascript timed out' })
    }, OSA_TIMEOUT_MS)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => {
      finish({ ok: false, text: '', error: errorMessage(error) })
    })
    child.on('close', (code) => {
      if (code === 0) finish({ ok: true, text: stdout, error: '' })
      else finish({ ok: false, text: stdout, error: stderr.trim() || `osascript exited ${code}` })
    })
    child.stdin.end(script)
  })
}

async function readChangeCount() {
  const ran = await runOsascript(CHANGE_COUNT_SCRIPT)
  if (!ran.ok) return null
  const n = Number(String(ran.text || '').trim())
  return Number.isFinite(n) ? n : null
}

async function canonicalizeOne(fs, raw) {
  if (fs === undefined) return { path: raw, ok: true }
  try {
    const target = await fs.resolve(raw)
    return { path: fs.processPath(target), ok: true }
  } catch {
    return { path: raw, ok: false }
  }
}

async function readClipboardPaths(fs, cache) {
  const changeCount = await readChangeCount()
  if (changeCount !== null && cache.lastChangeCount === changeCount) return cache.lastResult

  const ran = await runOsascript(APPLESCRIPT)
  if (!ran.ok) {
    const result = {
      ready: false,
      count: 0,
      paths: [],
      error: ran.error.includes('osascript')
        ? '读取系统剪贴板失败。请确认本机允许自动化 / osascript。'
        : ran.error || '当前环境无法读取系统剪贴板。',
    }
    cache.lastChangeCount = changeCount
    cache.lastResult = result
    return result
  }
  const found = parsePaths(ran.text)
  const paths = []
  for (const raw of found) paths.push(await canonicalizeOne(fs, raw))
  const result = {
    ready: paths.length > 0,
    count: paths.length,
    paths,
  }
  cache.lastChangeCount = changeCount
  cache.lastResult = result
  return result
}

function rejectUnlessLocal(req, res) {
  if (!isLoopbackAddress(req.socket.remoteAddress)) {
    sendJson(res, 403, { error: 'dsh-paste-path is available only over a loopback connection.' })
    return true
  }
  return false
}

function registerRoutes(ctx) {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return
  const cache = {
    lastChangeCount: null,
    lastResult: { ready: false, count: 0, paths: [] },
  }

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: PEEK_ROUTE,
    async handler(req, res) {
      if (rejectUnlessLocal(req, res)) return
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }
      try {
        const result = await readClipboardPaths(ctx.get('fs'), cache)
        sendJson(res, 200, { ready: result.ready, count: result.count })
      } catch (error) {
        sendJson(res, 500, { error: errorMessage(error) })
      }
    },
  }), 'dsh-paste-path: peek')

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: PASTE_ROUTE,
    async handler(req, res) {
      if (rejectUnlessLocal(req, res)) return
      if (req.method !== 'POST') {
        res.setHeader('allow', 'POST')
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }
      if (!isSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Paste requests require a same-origin browser request.' })
        return
      }
      try {
        const result = await readClipboardPaths(ctx.get('fs'), cache)
        if (!result.ready) {
          sendJson(res, 200, {
            paths: [],
            error: result.error || '剪贴板里没有文件路径。请先在 Finder 里选中文件或文件夹，按 Cmd+C，再回到这里按 Ctrl+V。',
          })
          return
        }
        sendJson(res, 200, { paths: result.paths })
      } catch (error) {
        sendJson(res, 500, { error: errorMessage(error) })
      }
    },
  }), 'dsh-paste-path: paste')
}

export function apply(ctx) {
  if (process.platform !== 'darwin') {
    console.log('dsh-paste-path: skipped on ' + process.platform + ' (macOS only)')
    return
  }
  registerRoutes(ctx)
}
