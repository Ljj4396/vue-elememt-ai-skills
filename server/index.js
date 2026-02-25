import http from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'
import Busboy from 'busboy'
import * as XLSX from 'xlsx'
import dotenv from 'dotenv'
// 根据启动参数加载不同的 .env 文件：npm run server:claude 或 npm run server:codex
// 用法：node server/index.js codex  或  node server/index.js claude
// .env = Codex 配置（默认），.env.claude = Claude 配置
const providerArg = process.argv[2]?.toLowerCase()
const envFile = providerArg === 'claude' ? '.env.claude' : '.env'
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: join(projectRoot, envFile) })
console.log(`加载配置文件: ${envFile}`)
import { log } from 'node:console'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 3000
const DB_PATH = join(__dirname, 'db.json')

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = '1h' // 1小时过期
const AI_DAILY_LIMIT = 10

// 默认权限（可在权限管理页修改）
const DEFAULT_PERMISSIONS = {
  users: true, // 用户管理
  ai: true, // 智能助手
  vip: false, // 智能助手 VIP
}
const DEFAULT_ADMIN_USERNAME = 'zhangsan'

function normalizePermissions(permissions) {
  const base = { ...DEFAULT_PERMISSIONS }
  if (permissions && typeof permissions === 'object') {
    Object.assign(base, permissions)
  }
  base.users = Boolean(base.users)
  base.ai = Boolean(base.ai)
  base.vip = Boolean(base.vip)
  return base
}

function ensureUserPermissions(user) {
  if (!user || typeof user !== 'object') return false
  let changed = false
  const isAdmin = user.isAdmin === true || user.username === DEFAULT_ADMIN_USERNAME
  if (isAdmin && user.isAdmin !== true) {
    user.isAdmin = true
    changed = true
  }
  const nextPermissions = normalizePermissions(user.permissions)
  if (isAdmin) {
    nextPermissions.users = true
    nextPermissions.ai = true
    nextPermissions.vip = true
  }
  const curr = user.permissions || {}
  if (
    curr.users !== nextPermissions.users ||
    curr.ai !== nextPermissions.ai ||
    curr.vip !== nextPermissions.vip
  ) {
    user.permissions = nextPermissions
    changed = true
  }
  return changed
}

// 生成 token
function signToken(user) {
  const payload = { id: user.id, username: user.username, nickname: user.nickname }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// 验证 token（返回解码后的 payload 或 null）
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// 从请求头提取 token
function extractToken(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

// 401 响应
function unauthorized(res, message = 'Token 无效或已过期') {
  res.writeHead(401, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(JSON.stringify({ code: 40100, data: { message } }))
}

function forbidden(res, message = '无权限访问') {
  res.writeHead(403, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(JSON.stringify({ code: 40300, data: { message } }))
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(body)
}

function ok(res, data) {
  sendJson(res, 200, { code: 0, data })
}

function err(res, code, message, extra = {}) {
  // 约定：错误信息也放在 data 里，保持 {code,data}
  sendJson(res, 200, { code, data: { message, ...extra } })
}

async function readDb() {
  try {
    const txt = await readFile(DB_PATH, 'utf-8')
    const db = JSON.parse(txt)
    if (!db || typeof db !== 'object') throw new Error('db invalid')
    if (!Array.isArray(db.items)) db.items = []
    if (typeof db.nextId !== 'number') db.nextId = 1
    // 用户管理数据
    if (!Array.isArray(db.users)) db.users = []
    if (typeof db.nextUserId !== 'number') db.nextUserId = 1
    if (!db.chatHistory || typeof db.chatHistory !== 'object') db.chatHistory = {}
    if (!db.chatUsage || typeof db.chatUsage !== 'object') db.chatUsage = {}
    if (!Array.isArray(db.aiAccessRequests)) db.aiAccessRequests = []
    if (typeof db.nextRequestId !== 'number') db.nextRequestId = 1
    if (!Array.isArray(db.balanceUploads)) db.balanceUploads = []
    if (typeof db.nextBalanceId !== 'number') db.nextBalanceId = 1
    let changed = false
    db.users.forEach((u) => {
      if (ensureUserPermissions(u)) changed = true
    })
    if (changed) await writeDb(db)
    return db
  } catch {
    // 初始化
    await mkdir(dirname(DB_PATH), { recursive: true })
    const db = {
      nextId: 1,
      items: [],
      nextUserId: 1,
      users: [],
      chatHistory: {},
      chatUsage: {},
      aiAccessRequests: [],
      nextRequestId: 1,
      balanceUploads: [],
      nextBalanceId: 1,
    }
    await writeDb(db)
    return db
  }
}

async function writeDb(db) {
  const tmpPath = DB_PATH + '.tmp'
  await writeFile(tmpPath, JSON.stringify(db, null, 2), 'utf-8')
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

async function parseJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8').trim()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return Symbol.for('invalid_json')
  }
}

function normalizeKey(key) {
  return String(key || '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

function matchKey(keys, candidates) {
  const normalized = keys.map((k) => ({ raw: k, norm: normalizeKey(k) }))
  for (const candidate of candidates) {
    const c = normalizeKey(candidate)
    const found = normalized.find((k) => k.norm === c || k.norm.includes(c))
    if (found) return found.raw
  }
  return null
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value ?? '')
    .replace(/[,，\s]/g, '')
    .trim()
  if (!cleaned) return 0
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : 0
}

function buildBalanceTable(rows) {
  const keys = Object.keys(rows[0] || {})
  if (!keys.length) return null
  const accountKey = matchKey(keys, ['科目', '科目名称', '科目编码', '科目编号', 'account', 'accountname', '账户'])
  const debitKey = matchKey(keys, ['借方', 'debit', 'dr'])
  const creditKey = matchKey(keys, ['贷方', 'credit', 'cr'])
  const openDebitKey = matchKey(keys, ['期初借方', '期初借'])
  const openCreditKey = matchKey(keys, ['期初贷方', '期初贷'])
  const periodDebitKey = matchKey(keys, ['本期借方', '本期借'])
  const periodCreditKey = matchKey(keys, ['本期贷方', '本期贷'])

  if (!accountKey) return null
  if (!debitKey && !creditKey && !(openDebitKey || openCreditKey || periodDebitKey || periodCreditKey)) {
    return null
  }

  const map = new Map()
  for (const row of rows) {
    const account = String(row?.[accountKey] ?? '').trim()
    if (!account) continue
    const debit = debitKey
      ? toNumber(row[debitKey])
      : toNumber(row[openDebitKey]) + toNumber(row[periodDebitKey])
    const credit = creditKey
      ? toNumber(row[creditKey])
      : toNumber(row[openCreditKey]) + toNumber(row[periodCreditKey])
    const current = map.get(account) || { account, debit: 0, credit: 0 }
    current.debit += debit
    current.credit += credit
    map.set(account, current)
  }

  const rowsOut = Array.from(map.values()).map((item) => ({
    account: item.account,
    debit: Number(item.debit.toFixed(2)),
    credit: Number(item.credit.toFixed(2)),
    balance: Number((item.debit - item.credit).toFixed(2)),
  }))

  const summary = rowsOut.reduce(
    (acc, item) => {
      acc.debit += item.debit
      acc.credit += item.credit
      acc.balance += item.balance
      return acc
    },
    { debit: 0, credit: 0, balance: 0 },
  )

  return {
    mode: 'balance',
    columns: [
      { key: 'account', label: '科目' },
      { key: 'debit', label: '借方' },
      { key: 'credit', label: '贷方' },
      { key: 'balance', label: '余额' },
    ],
    rows: rowsOut,
    summary: {
      debit: Number(summary.debit.toFixed(2)),
      credit: Number(summary.credit.toFixed(2)),
      balance: Number(summary.balance.toFixed(2)),
    },
  }
}

function buildRawTable(rows) {
  const keys = Object.keys(rows[0] || {})
  return {
    mode: 'raw',
    columns: keys.map((key) => ({ key, label: key })),
    rows,
  }
}

function getTodayKey() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function ensureChatUsage(db, userId) {
  if (!db.chatUsage || typeof db.chatUsage !== 'object') db.chatUsage = {}
  const today = getTodayKey()
  const current = db.chatUsage[userId]
  if (!current || current.date !== today) {
    db.chatUsage[userId] = { date: today, count: 0 }
  }
  return db.chatUsage[userId]
}

async function requirePermission(tokenPayload, key, res) {
  const db = await readDb()
  const user = db.users.find((u) => u.id === tokenPayload?.id)
  if (!user) {
    unauthorized(res, '用户不存在')
    return null
  }
  ensureUserPermissions(user)
  if (user.isAdmin) return user
  if (!user.permissions?.[key]) {
    forbidden(res)
    return null
  }
  return user
}

async function requireAdmin(tokenPayload, res) {
  const db = await readDb()
  const user = db.users.find((u) => u.id === tokenPayload?.id)
  if (!user) {
    unauthorized(res, '用户不存在')
    return null
  }
  ensureUserPermissions(user)
  if (!user.isAdmin) {
    forbidden(res)
    return null
  }
  return { db, user }
}

function match(pathname, pattern) {
  // pattern: /api/items/:id
  const p1 = pathname.split('/').filter(Boolean)
  const p2 = pattern.split('/').filter(Boolean)
  if (p1.length !== p2.length) return null
  const params = {}
  for (let i = 0; i < p1.length; i += 1) {
    const a = p1[i]
    const b = p2[i]
    if (b.startsWith(':')) params[b.slice(1)] = a
    else if (a !== b) return null
  }
  return params
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const { pathname } = url
    const method = (req.method || 'GET').toUpperCase()

    if (method === 'OPTIONS') return sendJson(res, 200, { code: 0, data: 'ok' })

    // ========== 公开接口（无需 token）==========

    // health
    if (method === 'GET' && pathname === '/api/health') {
      return ok(res, { status: 'ok', time: Date.now() })
    }

    // 登录（从 db.json 的 users 表验证）
    if (method === 'POST' && pathname === '/api/login') {
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const { username, password } = body || {}
      if (!username || !password) return err(res, 40000, '用户名和密码必填')
      const db = await readDb()
      const user = db.users.find((u) => u.username === username && u.password === password)
      if (!user) return err(res, 40100, '用户名或密码错误')
      ensureUserPermissions(user)
      const token = signToken(user)
      return ok(res, {
        token,
        expiresIn: 3600, // 秒
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          permissions: user.permissions,
          isAdmin: user.isAdmin === true,
        },
      })
    }

    // 获取当前用户信息（需要 token，从 db.json 读取）
    if (method === 'GET' && pathname === '/api/user/info') {
      const token = extractToken(req)
      const payload = verifyToken(token)
      if (!payload) return unauthorized(res)
      const db = await readDb()
      const user = db.users.find((u) => u.id === payload.id)
      if (!user) return unauthorized(res, '用户不存在')
      const { password: _, ...safeUser } = user
      return ok(res, safeUser)
    }

    // ========== 以下接口需要 token 校验 ==========
    const token = extractToken(req)
    const tokenPayload = verifyToken(token)
    if (!tokenPayload) return unauthorized(res)

    // 调试日志
    console.log(`[API] ${method} ${pathname}`)

    // ========== AI 聊天记录 (后端存储) ==========
    if (method === 'GET' && pathname === '/api/chat/history') {
      const permUser = await requirePermission(tokenPayload, 'ai', res)
      if (!permUser) return
      const db = await readDb()
      const history = db.chatHistory?.[permUser.id] || { activeId: null, conversations: [] }
      return ok(res, history)
    }

    if (method === 'PUT' && pathname === '/api/chat/history') {
      const permUser = await requirePermission(tokenPayload, 'ai', res)
      if (!permUser) return
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const { activeId = null, conversations = [] } = body || {}
      if (!Array.isArray(conversations)) return err(res, 40000, 'conversations 格式错误')
      const db = await readDb()
      db.chatHistory[permUser.id] = {
        activeId: typeof activeId === 'string' ? activeId : null,
        conversations,
        updatedAt: Date.now(),
      }
      await writeDb(db)
      return ok(res, db.chatHistory[permUser.id])
    }

    if (method === 'DELETE' && pathname === '/api/chat/history') {
      const permUser = await requirePermission(tokenPayload, 'ai', res)
      if (!permUser) return
      const db = await readDb()
      db.chatHistory[permUser.id] = { activeId: null, conversations: [], updatedAt: Date.now() }
      await writeDb(db)
      return ok(res, db.chatHistory[permUser.id])
    }

    // ========== 余额表上传 ==========
    if (method === 'POST' && pathname === '/api/balance/upload') {
      const MAX_FILE_SIZE = 5 * 1024 * 1024
      const bb = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_FILE_SIZE },
      })
      let fileBuffer = null
      let fileName = ''
      let fileError = ''

      bb.on('file', (fieldname, file, info) => {
        if (fileBuffer) {
          file.resume()
          return
        }
        fileName = info.filename || ''
        const lower = fileName.toLowerCase()
        if (lower && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
          fileError = '仅支持 .xlsx 或 .xls 文件'
          file.resume()
          return
        }
        const chunks = []
        file.on('data', (data) => {
          chunks.push(data)
        })
        file.on('limit', () => {
          fileError = '文件过大（最大 5MB）'
          file.resume()
        })
        file.on('end', () => {
          if (!fileError) {
            fileBuffer = Buffer.concat(chunks)
          }
        })
      })

      bb.on('finish', async () => {
        if (fileError) return err(res, 40000, fileError)
        if (!fileBuffer) return err(res, 40000, '请上传 Excel 文件')
        let workbook
        try {
          workbook = XLSX.read(fileBuffer, { type: 'buffer' })
        } catch {
          return err(res, 40000, 'Excel 解析失败')
        }
        const sheetName = workbook.SheetNames?.[0]
        if (!sheetName) return err(res, 40000, '未找到工作表')
        const sheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const rows = rawRows.filter((row) =>
          Object.values(row).some((v) => String(v ?? '').trim() !== ''),
        )
        if (!rows.length) return err(res, 40000, '表格内容为空')
        const balance = buildBalanceTable(rows)
        const result = balance || buildRawTable(rows)
        const db = await readDb()
        const user = db.users.find((u) => u.id === tokenPayload?.id)
        if (!user) return unauthorized(res, '用户不存在')
        const entry = {
          id: db.nextBalanceId++,
          userId: user.id,
          fileName,
          sheetName,
          createdAt: Date.now(),
          mode: result.mode,
          rowCount: result.rows?.length || 0,
          summary: result.summary || null,
          data: result,
        }
        db.balanceUploads.unshift(entry)
        await writeDb(db)
        return ok(res, entry)
      })

      bb.on('error', () => {
        return err(res, 40000, '上传失败')
      })

      req.pipe(bb)
      return
    }

    if (method === 'GET' && pathname === '/api/balance/list') {
      const db = await readDb()
      const user = db.users.find((u) => u.id === tokenPayload?.id)
      if (!user) return unauthorized(res, '用户不存在')
      const page = Number(url.searchParams.get('page') || 1)
      const pageSize = Number(url.searchParams.get('pageSize') || 10)
      const safePage = Number.isFinite(page) && page > 0 ? page : 1
      const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10
      const isAdmin = user.isAdmin === true
      const all = (db.balanceUploads || []).filter(
        (item) => isAdmin || item.userId === user.id,
      )
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      const total = all.length
      const start = (safePage - 1) * safePageSize
      const list = all.slice(start, start + safePageSize)
      return ok(res, { page: safePage, pageSize: safePageSize, total, list })
    }

    const balanceParams = match(pathname, '/api/balance/:id')
    if (method === 'DELETE' && balanceParams) {
      const id = Number(balanceParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const db = await readDb()
      const user = db.users.find((u) => u.id === tokenPayload?.id)
      if (!user) return unauthorized(res, '用户不存在')
      const idx = db.balanceUploads.findIndex((item) => item.id === id)
      if (idx === -1) return err(res, 40400, '记录不存在')
      const target = db.balanceUploads[idx]
      if (!user.isAdmin && target.userId !== user.id) {
        return forbidden(res)
      }
      const removed = db.balanceUploads.splice(idx, 1)[0]
      await writeDb(db)
      return ok(res, removed)
    }

    // ========== AI 权限申请 ==========
    if (method === 'POST' && pathname === '/api/ai/requests') {
      const permUser = await requirePermission(tokenPayload, 'ai', res)
      if (!permUser) return
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const reason = String(body?.reason || '').trim()
      if (!reason) return err(res, 40000, '申请原因必填')
      const db = await readDb()
      const user = db.users.find((u) => u.id === permUser.id)
      if (!user) return unauthorized(res, '用户不存在')
      ensureUserPermissions(user)
      if (user.isAdmin || user.permissions?.vip) {
        return err(res, 40000, '已拥有 VIP 权限')
      }
      let request = db.aiAccessRequests.find(
        (r) => r.userId === user.id && r.status === 'pending',
      )
      if (request) {
        request.reason = reason
        request.updatedAt = Date.now()
      } else {
        request = {
          id: db.nextRequestId++,
          userId: user.id,
          username: user.username,
          nickname: user.nickname,
          reason,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        db.aiAccessRequests.unshift(request)
      }
      await writeDb(db)
      return ok(res, request)
    }

    if (method === 'GET' && pathname === '/api/ai/requests') {
      const admin = await requireAdmin(tokenPayload, res)
      if (!admin) return
      return ok(res, admin.db.aiAccessRequests || [])
    }

    const approveParams = match(pathname, '/api/ai/requests/:id/approve')
    if (method === 'PUT' && approveParams) {
      const admin = await requireAdmin(tokenPayload, res)
      if (!admin) return
      const requestId = Number(approveParams.id)
      if (!Number.isFinite(requestId)) return err(res, 40000, 'id 参数非法')
      const db = admin.db
      const reqItem = db.aiAccessRequests.find((r) => r.id === requestId)
      if (!reqItem) return err(res, 40400, '申请不存在')
      reqItem.status = 'approved'
      reqItem.reviewedBy = admin.user.id
      reqItem.reviewedAt = Date.now()
      const targetUser = db.users.find((u) => u.id === reqItem.userId)
      if (targetUser) {
        targetUser.permissions = normalizePermissions(targetUser.permissions)
        targetUser.permissions.vip = true
        ensureUserPermissions(targetUser)
      }
      await writeDb(db)
      return ok(res, reqItem)
    }

    const rejectParams = match(pathname, '/api/ai/requests/:id/reject')
    if (method === 'PUT' && rejectParams) {
      const admin = await requireAdmin(tokenPayload, res)
      if (!admin) return
      const requestId = Number(rejectParams.id)
      if (!Number.isFinite(requestId)) return err(res, 40000, 'id 参数非法')
      const db = admin.db
      const reqItem = db.aiAccessRequests.find((r) => r.id === requestId)
      if (!reqItem) return err(res, 40400, '申请不存在')
      reqItem.status = 'rejected'
      reqItem.reviewedBy = admin.user.id
      reqItem.reviewedAt = Date.now()
      await writeDb(db)
      return ok(res, reqItem)
    }

    // ========== AI 聊天接口 (接入 Claude/OpenAI) ==========
    if (method === 'POST' && pathname === '/api/chat') {
      const permUser = await requirePermission(tokenPayload, 'ai', res)
      if (!permUser) return
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const { messages } = body || {}
      if (!Array.isArray(messages)) return err(res, 40000, 'messages 格式错误')

      const usageDb = await readDb()
      const usageUser = usageDb.users.find((u) => u.id === permUser.id)
      if (!usageUser) return unauthorized(res, '用户不存在')
      ensureUserPermissions(usageUser)
      if (!usageUser.isAdmin && !usageUser.permissions?.vip) {
        const usage = ensureChatUsage(usageDb, usageUser.id)
        if (usage.count >= AI_DAILY_LIMIT) {
          return err(res, 42901, '今日提问次数已达上限，请申请 VIP 权限', {
            limit: AI_DAILY_LIMIT,
            count: usage.count,
          })
        }
        usage.count += 1
        await writeDb(usageDb)
      }

      try {
        const API_KEY = process.env.AI_API_KEY
        const BASE_URL = process.env.AI_BASE_URL
        const MODEL = process.env.AI_MODEL
        const PROVIDER = (process.env.AI_PROVIDER || 'claude').toLowerCase()

        // 根据 AI_PROVIDER 自动适配端点和请求体
        const isCodex = PROVIDER === 'codex'
        const endpoint = isCodex ? '/responses' : '/chat/completions'
        const mappedMessages = messages.map((m) => ({ role: m.role, content: m.content }))
        const requestBody = isCodex
          ? { model: MODEL, input: mappedMessages, stream: false }
          : { model: MODEL, messages: mappedMessages, stream: false }

        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(requestBody)
        })
        // 增强：先检查响应类型，防止 HTML 导致解析崩溃
        const contentType = response.headers.get('content-type') || ''      
        if (!contentType.includes('application/json')) {
          const errorText = await response.text()
          console.error('API 返回非 JSON 响应:', errorText.slice(0, 200))
          return err(res, response.status, '接口返回格式错误 (可能是 40412121 或 WAF 拦截)', { 
            detail: errorText.slice(0, 100) 
          })
        }
        const data = await response.json()
        console.log(response, contentType, 'contentType', data)
        if (!response.ok) {
          return err(res, response.status, data.error?.message || 'AI 接口报错')
        }

        const aiContent =
          data.output
            ?.filter((item) => item.type === 'message' && Array.isArray(item.content))
            .flatMap((item) => item.content)
            .map((c) => c?.text || '')
            .join('')
            .trim() ||
          data.choices?.[0]?.message?.content ||
          ''
        return ok(res, { content: aiContent })
      } catch (e) {
        return err(res, 50000, 'AI 服务连接失败', { detail: String(e.message) })
      }
    }

    // list
    if (method === 'GET' && pathname === '/api/items') {
      const db = await readDb()
      return ok(res, db.items)
    }

    // get by id
    const getParams = match(pathname, '/api/items/:id')
    if (method === 'GET' && getParams) {
      const id = Number(getParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const db = await readDb()
      const item = db.items.find((x) => x.id === id)
      if (!item) return err(res, 40400, '资源不存在', { id })
      return ok(res, item)
    }

    // create
    if (method === 'POST' && pathname === '/api/items') {
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const name = body?.name
      if (typeof name !== 'string' || !name.trim()) return err(res, 40000, 'name 必填')
      const db = await readDb()
      const item = { id: db.nextId++, name: name.trim(), createdAt: Date.now() }
      db.items.push(item)
      await writeDb(db)
      return ok(res, item)
    }

    // update
    const putParams = match(pathname, '/api/items/:id')
    if (method === 'PUT' && putParams) {
      const id = Number(putParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const name = body?.name
      if (typeof name !== 'string' || !name.trim()) return err(res, 40000, 'name 必填')
      const db = await readDb()
      const idx = db.items.findIndex((x) => x.id === id)
      if (idx === -1) return err(res, 40400, '资源不存在', { id })
      db.items[idx] = { ...db.items[idx], name: name.trim(), updatedAt: Date.now() }
      await writeDb(db)
      return ok(res, db.items[idx])
    }

    // delete
    const delParams = match(pathname, '/api/items/:id')
    if (method === 'DELETE' && delParams) {
      const id = Number(delParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const db = await readDb()
      const idx = db.items.findIndex((x) => x.id === id)
      if (idx === -1) return err(res, 40400, '资源不存在', { id })
      const removed = db.items.splice(idx, 1)[0]
      await writeDb(db)
      return ok(res, removed)
    }

    // ========== 用户管理 CRUD ==========

    // 获取用户列表
    if (method === 'GET' && pathname === '/api/users') {
      const permUser = await requirePermission(tokenPayload, 'users', res)
      if (!permUser) return
      const db = await readDb()
      const today = getTodayKey()
      // 返回时隐藏密码
      const users = db.users.map(({ password, ...rest }) => {
        const usage = db.chatUsage?.[rest.id]
        const count = usage && usage.date === today ? usage.count : 0
        return {
          ...rest,
          aiUsage: { date: today, count, limit: AI_DAILY_LIMIT },
        }
      })
      return ok(res, users)
    }

    // 获取单个用户
    const getUserParams = match(pathname, '/api/users/:id')
    if (method === 'GET' && getUserParams) {
      const permUser = await requirePermission(tokenPayload, 'users', res)
      if (!permUser) return
      const id = Number(getUserParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const db = await readDb()
      const user = db.users.find((x) => x.id === id)
      if (!user) return err(res, 40400, '用户不存在', { id })
      const { password, ...rest } = user
      return ok(res, rest)
    }

    // 创建用户
    if (method === 'POST' && pathname === '/api/users') {
      const permUser = await requirePermission(tokenPayload, 'users', res)
      if (!permUser) return
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const { username, password, nickname, phone, email, account, permissions } = body || {}
      if (!username?.trim()) return err(res, 40000, '用户名必填')
      if (!password?.trim()) return err(res, 40000, '密码必填')
      const db = await readDb()
      // 检查用户名是否已存在
      if (db.users.some((u) => u.username === username.trim())) {
        return err(res, 40000, '用户名已存在')
      }
      const newUser = {
        id: db.nextUserId++,
        username: username.trim(),
        password: password.trim(),
        nickname: nickname?.trim() || '',
        account: account?.trim() || username.trim(),
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        permissions: normalizePermissions(permissions),
        isAdmin: username.trim() === DEFAULT_ADMIN_USERNAME,
        createdAt: Date.now(),
      }
      ensureUserPermissions(newUser)
      db.users.push(newUser)
      await writeDb(db)
      const { password: _, ...rest } = newUser
      return ok(res, rest)
    }

    // 更新用户
    const putUserParams = match(pathname, '/api/users/:id')
    if (method === 'PUT' && putUserParams) {
      const permUser = await requirePermission(tokenPayload, 'users', res)
      if (!permUser) return
      const id = Number(putUserParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const db = await readDb()
      const idx = db.users.findIndex((x) => x.id === id)
      if (idx === -1) return err(res, 40400, '用户不存在', { id })
      const { username, password, nickname, phone, email, account, permissions } = body || {}
      // 检查用户名是否与其他用户冲突
      if (username && db.users.some((u) => u.username === username.trim() && u.id !== id)) {
        return err(res, 40000, '用户名已存在')
      }
      const oldUser = db.users[idx]
      const safeOldPermissions = normalizePermissions(oldUser.permissions)
      const nextPermissions =
        permissions === undefined ? safeOldPermissions : normalizePermissions(permissions)
      db.users[idx] = {
        ...oldUser,
        username: username?.trim() || oldUser.username,
        password: password?.trim() || oldUser.password,
        nickname: nickname?.trim() ?? oldUser.nickname,
        account: account?.trim() ?? oldUser.account,
        phone: phone?.trim() ?? oldUser.phone,
        email: email?.trim() ?? oldUser.email,
        permissions: nextPermissions,
        isAdmin: oldUser.isAdmin === true || oldUser.username === DEFAULT_ADMIN_USERNAME,
        updatedAt: Date.now(),
      }
      ensureUserPermissions(db.users[idx])
      await writeDb(db)
      const { password: _, ...rest } = db.users[idx]
      return ok(res, rest)
    }

    // 删除用户
    const delUserParams = match(pathname, '/api/users/:id')
    if (method === 'DELETE' && delUserParams) {
      const permUser = await requirePermission(tokenPayload, 'users', res)
      if (!permUser) return
      const id = Number(delUserParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const db = await readDb()
      const idx = db.users.findIndex((x) => x.id === id)
      if (idx === -1) return err(res, 40400, '用户不存在', { id })
      const removed = db.users.splice(idx, 1)[0]
      await writeDb(db)
      const { password: _, ...rest } = removed
      return ok(res, rest)
    }

    return err(res, 40400, '接口不存在', { path: pathname, method })
  } catch (e) {
    return err(res, 50000, '服务器异常', { detail: String(e?.message || e) })
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`)
  console.log('--- 环境配置检查 ---')
  console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'claude (默认)')
  console.log('AI_BASE_URL:', process.env.AI_BASE_URL ? '已加载' : '未找到!')
  console.log('AI_MODEL:', process.env.AI_MODEL)
  console.log('--------------------')
})

