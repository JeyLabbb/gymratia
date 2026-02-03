import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface PortalSession {
  email: string
  isAdmin: boolean
  createdAt: number
}

const SESSION_COOKIE = 'portal_session'
const MAX_AGE_DAYS = 7

export const portalSessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET || 'fallback-dev-only-change-in-prod-min32chars!!',
  cookieName: SESSION_COOKIE,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  },
}

export async function getPortalSession() {
  const cookieStore = await cookies()
  return getIronSession<PortalSession>(cookieStore, portalSessionOptions)
}

export function validateAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) return false
  return email === adminEmail && password === adminPassword
}
