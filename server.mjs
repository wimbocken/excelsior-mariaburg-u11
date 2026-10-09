import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const DATA_DIR = path.join(__dirname, 'data')
const LIVE_FILE = path.join(DATA_DIR, 'live-matches.json')
const STATE_FILE = path.join(DATA_DIR, 'app-state.json')
const PORT = Number(process.env.PORT || 80)

const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'Jon', active: true },
  { id: 'p2', name: 'Tijs', active: true },
  { id: 'p3', name: 'Felix', active: true },
  { id: 'p4', name: 'Mathis', active: true },
  { id: 'p5', name: 'Quinn', active: true },
  { id: 'p6', name: 'Lenn', active: true },
  { id: 'p7', name: 'Kerim', active: true },
  { id: 'p8', name: 'Adam', active: true },
  { id: 'p9', name: 'Summer', active: true },
  { id: 'p10', name: 'Lars', active: true },
  { id: 'p11', name: 'Jules', active: true },
  { id: 'p12', name: 'Nathan K', active: true },
  { id: 'p13', name: 'Linus', active: true },
  { id: 'p14', name: 'Sepp', active: true },
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  ensureDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function ensureLiveStore() {
  ensureDir()
  return readJson(LIVE_FILE, {})
}

function writeLiveStore(store) {
  writeJson(LIVE_FILE, store)
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PLAY_SECS = 15 * 60
const REST_SECS = 2 * 60
const PHONE_PAUSE_SECS = 10 * 60
const CLOCK_REPAIR_VERSION = 2

function sessionWallToPeriodClock(sessionWallSec) {
  let rem = Math.max(0, sessionWallSec)
  let matchSeconds = 0
  for (let p = 1; p <= 4; p++) {
    const playTake = Math.min(rem, PLAY_SECS)
    matchSeconds += playTake
    rem -= playTake
    if (rem <= 0) {
      return {
        period: p,
        periodClock: matchSeconds - (p - 1) * PLAY_SECS,
        matchSeconds,
      }
    }
    if (p < 4) {
      rem -= Math.min(rem, REST_SECS)
      if (rem <= 0) {
        return { period: p + 1, periodClock: 0, matchSeconds }
      }
    } else {
      matchSeconds += rem
      return {
        period: 4,
        periodClock: matchSeconds - 3 * PLAY_SECS,
        matchSeconds,
      }
    }
  }
  return {
    period: 4,
    periodClock: matchSeconds - 3 * PLAY_SECS,
    matchSeconds,
  }
}

function reconstructGoalTimes(goals) {
  if (!goals?.length) return goals
  const sorted = [...goals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  let sessionWall = Math.max(0, sorted[0].matchTimeSeconds)
  let lastEventMs =
    new Date(sorted[0].createdAt).getTime() - Math.max(0, sorted[0].matchTimeSeconds) * 1000
  const out = []
  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i]
    const at = new Date(g.createdAt).getTime()
    const wallGap = Math.max(0, Math.floor((at - lastEventMs) / 1000))
    if (i === 0) {
      sessionWall = Math.max(0, g.matchTimeSeconds)
    } else if (wallGap > PHONE_PAUSE_SECS) {
      const block = PLAY_SECS + REST_SECS
      const skipped = Math.max(1, Math.min(3, Math.floor(wallGap / block)))
      const current = sessionWallToPeriodClock(sessionWall)
      const targetPeriod = Math.min(4, current.period + skipped)
      sessionWall = (targetPeriod - 1) * block
      const residual = wallGap - skipped * block
      if (residual > 0) sessionWall += Math.min(residual, PLAY_SECS + 5 * 60)
    } else {
      sessionWall += wallGap
    }
    const { period, periodClock } = sessionWallToPeriodClock(sessionWall)
    out.push({
      ...g,
      period,
      matchTimeSeconds: Math.max(0, periodClock),
      clockLabel: formatClock(Math.max(0, periodClock)),
    })
    lastEventMs = at
  }
  return out
}

function repairMatch(match) {
  if (!match?.goals?.length) return match
  if (match.clockRepairVersion === CLOCK_REPAIR_VERSION) {
    return { ...match, lineup: match.lineup ?? {} }
  }
  return {
    ...match,
    goals: reconstructGoalTimes(match.goals),
    lineup: match.lineup ?? {},
    clockRepairVersion: CLOCK_REPAIR_VERSION,
  }
}

function bootstrapStateFromLive() {
  const live = ensureLiveStore()
  const entries = Object.values(live)
  const matches = entries.map((e) => e?.match).filter(Boolean).map(repairMatch)
  let players = DEFAULT_PLAYERS
  for (const e of entries) {
    if (Array.isArray(e?.players) && e.players.length) {
      players = e.players.map((p) => ({
        id: p.id,
        name: p.name,
        number: p.number,
        active: true,
      }))
      break
    }
  }
  return {
    players,
    matches,
    updatedAt: new Date().toISOString(),
  }
}

function ensureAppState() {
  ensureDir()
  if (fs.existsSync(STATE_FILE)) {
    const parsed = readJson(STATE_FILE, null)
    if (parsed && Array.isArray(parsed.players) && Array.isArray(parsed.matches)) {
      const matches = parsed.matches.map(repairMatch)
      const changed = JSON.stringify(matches) !== JSON.stringify(parsed.matches)
      const next = { ...parsed, matches }
      if (changed) {
        next.updatedAt = new Date().toISOString()
        writeJson(STATE_FILE, next)
        const live = ensureLiveStore()
        for (const match of matches) {
          live[match.id] = {
            match,
            players: next.players.map((p) => ({
              id: p.id,
              name: p.name,
              number: p.number,
            })),
            updatedAt: next.updatedAt,
          }
        }
        writeLiveStore(live)
      }
      return next
    }
  }
  const boot = bootstrapStateFromLive()
  writeJson(STATE_FILE, boot)
  return boot
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0])
  const cleaned = path.normalize(decoded).replace(/^([/\\])+/, '')
  const full = path.join(root, cleaned)
  if (!full.startsWith(root)) return null
  return full
}

async function handleLiveApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean)
  const id = parts[2]

  if (req.method === 'GET' && !id) {
    const store = ensureLiveStore()
    const list = Object.entries(store).map(([matchId, payload]) => {
      const p = payload
      return {
        id: matchId,
        opponent: p?.match?.opponent ?? '?',
        status: p?.match?.status ?? 'planned',
        homeScore: p?.match?.homeScore ?? 0,
        awayScore: p?.match?.awayScore ?? 0,
        date: p?.match?.date,
      }
    })
    return sendJson(res, 200, list)
  }

  if (req.method === 'GET' && id) {
    const store = ensureLiveStore()
    const payload = store[id]
    if (!payload) return sendJson(res, 404, { error: 'not_found' })
    return sendJson(res, 200, payload)
  }

  if (req.method === 'PUT' && id) {
    const body = await readBody(req)
    const parsed = JSON.parse(body)
    const store = ensureLiveStore()
    store[id] = parsed
    writeLiveStore(store)
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'DELETE' && id) {
    const store = ensureLiveStore()
    delete store[id]
    writeLiveStore(store)
    return sendJson(res, 200, { ok: true })
  }

  return sendJson(res, 405, { error: 'method_not_allowed' })
}

async function handleStateApi(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, ensureAppState())
  }

  if (req.method === 'PUT') {
    const body = await readBody(req)
    const parsed = JSON.parse(body)
    if (!parsed || !Array.isArray(parsed.players) || !Array.isArray(parsed.matches)) {
      return sendJson(res, 400, { error: 'invalid_state' })
    }
    const next = {
      players: parsed.players,
      matches: parsed.matches,
      updatedAt: new Date().toISOString(),
    }
    writeJson(STATE_FILE, next)

    // Keep spectator live payloads in sync for each match
    const live = ensureLiveStore()
    for (const match of next.matches) {
      live[match.id] = {
        match,
        players: next.players.map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
        })),
        updatedAt: next.updatedAt,
      }
    }
    writeLiveStore(live)

    return sendJson(res, 200, next)
  }

  return sendJson(res, 405, { error: 'method_not_allowed' })
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const type = MIME[ext] || 'application/octet-stream'
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
  })
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (url.pathname === '/api/state' || url.pathname === '/api/state/') {
      return await handleStateApi(req, res)
    }

    if (url.pathname.startsWith('/api/live')) {
      return await handleLiveApi(req, res, url)
    }

    let filePath = safeJoin(DIST, url.pathname === '/' ? '/index.html' : url.pathname)
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveFile(res, filePath)
    }

    const index = path.join(DIST, 'index.html')
    if (fs.existsSync(index)) return serveFile(res, index)

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  } catch (err) {
    sendJson(res, 500, {
      error: 'server_error',
      message: err instanceof Error ? err.message : 'unknown',
    })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  ensureAppState()
  console.log(`Excelsior U11 listening on :${PORT}`)
})
