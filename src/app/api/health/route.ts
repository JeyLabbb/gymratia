import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.USE_MOCK ?? 'unset',
    supaUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'unset',
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}

