import crypto from 'node:crypto'
import { promisify } from 'node:util'

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 128

const SCRYPT_KEY_LENGTH = 64
const SCRYPT_OPTIONS = Object.freeze({ N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 })
const scryptAsync = promisify(crypto.scrypt)

function passwordError(message) {
  return Object.assign(new Error(message), { statusCode: 400, code: 'PASSWORD_INVALID' })
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || !password) throw passwordError('请输入新密码')
  if (password.length < PASSWORD_MIN_LENGTH) throw passwordError(`新密码不能少于 ${PASSWORD_MIN_LENGTH} 位`)
  if (password.length > PASSWORD_MAX_LENGTH) throw passwordError(`新密码不能超过 ${PASSWORD_MAX_LENGTH} 位`)
  if (!password.trim()) throw passwordError('新密码不能全部为空格')
  return password
}

export function secureTextEqual(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(String(actual ?? '')).digest()
  const expectedHash = crypto.createHash('sha256').update(String(expected ?? '')).digest()
  return crypto.timingSafeEqual(actualHash, expectedHash)
}

export function isStoredPasswordValid(passwordHash, passwordSalt) {
  try {
    const hash = Buffer.from(String(passwordHash || ''), 'base64url')
    const salt = Buffer.from(String(passwordSalt || ''), 'base64url')
    return hash.length === SCRYPT_KEY_LENGTH && salt.length >= 16
  } catch {
    return false
  }
}

export async function hashPassword(password) {
  validateNewPassword(password)
  const salt = crypto.randomBytes(16)
  const hash = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS)
  return {
    passwordHash: Buffer.from(hash).toString('base64url'),
    passwordSalt: salt.toString('base64url'),
  }
}

export async function verifyPassword(password, storedHash, storedSalt) {
  if (typeof password !== 'string' || !isStoredPasswordValid(storedHash, storedSalt)) return false
  try {
    const expected = Buffer.from(storedHash, 'base64url')
    const salt = Buffer.from(storedSalt, 'base64url')
    const actual = Buffer.from(await scryptAsync(password, salt, expected.length, SCRYPT_OPTIONS))
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
