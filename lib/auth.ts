import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto'

const SALT_LEN = 16
const KEY_LEN = 32
const ITERATIONS = 100000
const DIGEST = 'sha256'
const SESSION_COOKIE = 'restaurant_session'
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const raw = process.env.AUTH_SECRET || process.env.SESSION_SECRET
  const secret = typeof raw === 'string' ? raw.trim() : ''
  if (!secret) {
    throw new Error(
      'AUTH_SECRET is not set. Add AUTH_SECRET (or SESSION_SECRET) to .env or .env.local in the project root (min 8 characters), then restart the dev server.'
    )
  }
  if (secret.length < 8) {
    throw new Error('AUTH_SECRET is too short (min 8 characters).')
  }
  return secret
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString('hex')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'))
  } catch {
    return false
  }
}

export type SessionPayload = { userId: string; restaurantId: string; email: string }

export function signSession(payload: SessionPayload): string {
  const secret = getSecret()
  const data = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC })
  const b64 = Buffer.from(data, 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifySession(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  try {
    const secret = getSecret()
    const expected = createHmac('sha256', secret).update(b64).digest('base64url')
    if (sig !== expected) return null
    const raw = Buffer.from(b64, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as SessionPayload & { exp: number }
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null
    return { userId: parsed.userId, restaurantId: parsed.restaurantId, email: parsed.email }
  } catch {
    return null
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE_SEC
}
