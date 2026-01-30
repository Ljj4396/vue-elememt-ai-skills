import http from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'
import 'dotenv/config' // 自动加载 .env 变量
import { log } from 'node:console'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 3000
const DB_PATH = join(__dirname, 'db.json')

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = '1h' // 1小时过期

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
    return db
  } catch {
    // 初始化
    await mkdir(dirname(DB_PATH), { recursive: true })
    const db = { nextId: 1, items: [], nextUserId: 1, users: [] }
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
      const token = signToken(user)
      return ok(res, {
        token,
        expiresIn: 3600, // 秒
        user: { id: user.id, username: user.username, nickname: user.nickname },
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

    // ========== AI 聊天接口 (接入 Claude/OpenAI) ==========
    if (method === 'POST' && pathname === '/api/chat') {
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const { messages } = body || {}
      if (!Array.isArray(messages)) return err(res, 40000, 'messages 格式错误')

      try {
        const API_KEY = process.env.AI_API_KEY
        const BASE_URL = process.env.AI_BASE_URL
        const MODEL = process.env.AI_MODEL

        const response = await fetch(`${BASE_URL}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: MODEL,
            input: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: false
          })
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
      const db = await readDb()
      // 返回时隐藏密码
      const users = db.users.map(({ password, ...rest }) => rest)
      return ok(res, users)
    }

    // 获取单个用户
    const getUserParams = match(pathname, '/api/users/:id')
    if (method === 'GET' && getUserParams) {
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
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const { username, password, nickname, phone, email, account } = body || {}
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
        createdAt: Date.now(),
      }
      db.users.push(newUser)
      await writeDb(db)
      const { password: _, ...rest } = newUser
      return ok(res, rest)
    }

    // 更新用户
    const putUserParams = match(pathname, '/api/users/:id')
    if (method === 'PUT' && putUserParams) {
      const id = Number(putUserParams.id)
      if (!Number.isFinite(id)) return err(res, 40000, 'id 参数非法')
      const body = await parseJsonBody(req)
      if (body === Symbol.for('invalid_json')) return err(res, 40000, 'JSON 解析失败')
      const db = await readDb()
      const idx = db.users.findIndex((x) => x.id === id)
      if (idx === -1) return err(res, 40400, '用户不存在', { id })
      const { username, password, nickname, phone, email, account } = body || {}
      // 检查用户名是否与其他用户冲突
      if (username && db.users.some((u) => u.username === username.trim() && u.id !== id)) {
        return err(res, 40000, '用户名已存在')
      }
      const oldUser = db.users[idx]
      db.users[idx] = {
        ...oldUser,
        username: username?.trim() || oldUser.username,
        password: password?.trim() || oldUser.password,
        nickname: nickname?.trim() ?? oldUser.nickname,
        account: account?.trim() ?? oldUser.account,
        phone: phone?.trim() ?? oldUser.phone,
        email: email?.trim() ?? oldUser.email,
        updatedAt: Date.now(),
      }
      await writeDb(db)
      const { password: _, ...rest } = db.users[idx]
      return ok(res, rest)
    }

    // 删除用户
    const delUserParams = match(pathname, '/api/users/:id')
    if (method === 'DELETE' && delUserParams) {
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
  console.log('AI_BASE_URL:', process.env.AI_BASE_URL ? '已加载' : '未找到!')
  console.log('AI_MODEL:', process.env.AI_MODEL)
  console.log('--------------------')
})

