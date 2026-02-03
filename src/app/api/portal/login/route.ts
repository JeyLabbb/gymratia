import { NextResponse } from 'next/server'
import { getPortalSession, validateAdminCredentials } from '@/lib/portal-session'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 400 })
    }

    if (!validateAdminCredentials(String(email).trim(), String(password))) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const session = await getPortalSession()
    session.email = String(email).trim()
    session.isAdmin = true
    session.createdAt = Date.now()
    await session.save()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Portal login error:', error)
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 500 })
  }
}
