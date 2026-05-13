import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys'
import { dispatchMattermost, dispatchTelegram, formatChatMessage, type DispatchPayload } from './adapters.js'

type WhatsAppSession = {
  connectorId: string
  status: 'disconnected' | 'pairing' | 'connected' | 'error'
  qr: string | null
  lastError: string | null
  socket: WASocket | null
  targets: Map<string, { id: string; name: string; type: 'chat' | 'group' }>
}

const port = Number(process.env.PORT ?? 6075)
const gatewayToken = process.env.CONNECTOR_GATEWAY_TOKEN
const sessionDir = process.env.CONNECTOR_SESSION_DIR ?? path.join(process.cwd(), 'sessions')
const sessions = new Map<string, WhatsAppSession>()

if (!gatewayToken) {
  console.warn('CONNECTOR_GATEWAY_TOKEN is not configured; all authenticated routes will reject requests.')
}

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

const sendJson = (res: ServerResponse, status: number, body: Record<string, unknown>) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const requireAuth = (req: IncomingMessage, res: ServerResponse) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!gatewayToken || auth !== gatewayToken) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return false
  }
  return true
}

const getSession = (connectorId: string): WhatsAppSession => {
  const existing = sessions.get(connectorId)
  if (existing) return existing

  const session: WhatsAppSession = {
    connectorId,
    status: 'disconnected',
    qr: null,
    lastError: null,
    socket: null,
    targets: new Map(),
  }
  sessions.set(connectorId, session)
  return session
}

const waitForQrOrConnection = async (session: WhatsAppSession) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 12_000) {
    if (session.qr || session.status === 'connected' || session.status === 'error') break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

const startWhatsAppPairing = async (connectorId: string) => {
  await mkdir(path.join(sessionDir, connectorId), { recursive: true })
  const session = getSession(connectorId)

  if (session.socket) {
    session.socket.end(undefined)
  }

  session.status = 'pairing'
  session.qr = null
  session.lastError = null

  const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, connectorId))
  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  })

  session.socket = socket
  socket.ev.on('creds.update', saveCreds)
  socket.ev.on('connection.update', (update: {
    qr?: string
    connection?: 'open' | 'close' | 'connecting'
    lastDisconnect?: { error?: Error & { output?: { statusCode?: number } } }
  }) => {
    if (update.qr) {
      session.qr = update.qr
      session.status = 'pairing'
    }
    if (update.connection === 'open') {
      session.status = 'connected'
      session.qr = null
    }
    if (update.connection === 'close') {
      const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
      session.status = statusCode === DisconnectReason.loggedOut ? 'disconnected' : 'error'
      session.lastError = update.lastDisconnect?.error?.message ?? 'WhatsApp connection closed'
      session.socket = null
    }
  })
  socket.ev.on('chats.upsert', (chats: Array<{ id?: string; name?: string | null }>) => {
    for (const chat of chats) {
      if (!chat.id) continue
      session.targets.set(chat.id, {
        id: chat.id,
        name: chat.name ?? chat.id,
        type: chat.id.endsWith('@g.us') ? 'group' : 'chat',
      })
    }
  })

  await waitForQrOrConnection(session)
  return {
    connectorId,
    status: session.status,
    qr: session.qr,
    message: (session.status as string) === 'connected' ? 'WhatsApp is connected.' : undefined,
  }
}

const dispatchWhatsApp = async (payload: DispatchPayload) => {
  const session = getSession(payload.connectorId)
  if (session.status !== 'connected' || !session.socket) {
    throw new Error('WhatsApp connector is not connected')
  }

  const result = await session.socket.sendMessage(payload.providerTargetId, {
    text: formatChatMessage(payload),
  })

  return { messageId: result?.key?.id ?? null }
}

const handleDispatch = async (payload: DispatchPayload) => {
  if (payload.channel === 'telegram') {
    return dispatchTelegram(payload, process.env.TELEGRAM_BOT_TOKEN)
  }
  if (payload.channel === 'mattermost') {
    return dispatchMattermost(payload, {
      webhookMapJson: process.env.MATTERMOST_WEBHOOKS_JSON,
      baseUrl: process.env.MATTERMOST_BASE_URL,
      botToken: process.env.MATTERMOST_BOT_TOKEN,
    })
  }
  return dispatchWhatsApp(payload)
}

const server = createServer(async (req, res) => {
  try {
    if (!requireAuth(req, res)) return
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

    if (req.method === 'POST' && url.pathname === '/connectors/whatsapp/start-pairing') {
      const body = await readBody(req)
      const connectorId = typeof body.connectorId === 'string' ? body.connectorId : null
      if (!connectorId) {
        sendJson(res, 400, { error: 'connectorId is required' })
        return
      }
      sendJson(res, 200, await startWhatsAppPairing(connectorId))
      return
    }

    const statusMatch = url.pathname.match(/^\/connectors\/([^/]+)\/status$/)
    if (req.method === 'GET' && statusMatch) {
      const session = getSession(statusMatch[1])
      sendJson(res, 200, {
        connectorId: session.connectorId,
        status: session.status,
        qr: session.qr,
        error: session.lastError,
      })
      return
    }

    const targetsMatch = url.pathname.match(/^\/connectors\/([^/]+)\/targets$/)
    if (req.method === 'GET' && targetsMatch) {
      const session = getSession(targetsMatch[1])
      sendJson(res, 200, {
        connectorId: session.connectorId,
        targets: [...session.targets.values()],
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/dispatch') {
      const payload = await readBody(req) as DispatchPayload
      sendJson(res, 200, await handleDispatch(payload))
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Connector gateway error' })
  }
})

server.listen(port, () => {
  console.log(`StoQR alert connector gateway listening on ${port}`)
})
