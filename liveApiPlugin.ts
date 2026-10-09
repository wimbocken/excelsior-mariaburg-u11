import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'live-matches.json')

type Store = Record<string, unknown>

function ensureStore(): Store {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}', 'utf8')
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Store
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function attachLiveApi(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const rawUrl = req.url ?? ''
    if (!rawUrl.startsWith('/api/live')) return next()

    const url = new URL(rawUrl, 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)
    const id = parts[2]

    try {
      if (req.method === 'GET' && !id) {
        const store = ensureStore()
        const list = Object.entries(store).map(([matchId, payload]) => {
          const p = payload as {
            match?: {
              opponent?: string
              status?: string
              homeScore?: number
              awayScore?: number
              date?: string
            }
          }
          return {
            id: matchId,
            opponent: p.match?.opponent ?? '?',
            status: p.match?.status ?? 'planned',
            homeScore: p.match?.homeScore ?? 0,
            awayScore: p.match?.awayScore ?? 0,
            date: p.match?.date,
          }
        })
        return sendJson(res, 200, list)
      }

      if (req.method === 'GET' && id) {
        const store = ensureStore()
        const payload = store[id]
        if (!payload) return sendJson(res, 404, { error: 'not_found' })
        return sendJson(res, 200, payload)
      }

      if (req.method === 'PUT' && id) {
        const body = await readBody(req)
        const parsed = JSON.parse(body) as unknown
        const store = ensureStore()
        store[id] = parsed
        writeStore(store)
        return sendJson(res, 200, { ok: true })
      }

      if (req.method === 'DELETE' && id) {
        const store = ensureStore()
        delete store[id]
        writeStore(store)
        return sendJson(res, 200, { ok: true })
      }

      return sendJson(res, 405, { error: 'method_not_allowed' })
    } catch (err) {
      return sendJson(res, 500, {
        error: 'server_error',
        message: err instanceof Error ? err.message : 'unknown',
      })
    }
  })
}

export function liveApiPlugin(): Plugin {
  return {
    name: 'live-api',
    configureServer(server) {
      attachLiveApi(server.middlewares)
    },
    configurePreviewServer(server) {
      attachLiveApi(server.middlewares)
    },
  }
}
