import { NextResponse } from 'next/server'
import { getPortalSession } from '@/lib/portal-session'

export async function POST(req: Request) {
  try {
    const session = await getPortalSession()
    session.destroy()
  } catch {
    // ignore
  }
  const url = new URL(req.url)
  const origin = url.origin
  return NextResponse.redirect(`${origin}/portal/login`)
}
