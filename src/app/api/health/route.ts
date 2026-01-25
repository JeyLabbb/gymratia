import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'unset'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'unset'
  
  let supabaseConnection = false
  let supabaseError = null
  
  if (supabaseUrl !== 'unset' && supabaseAnonKey !== 'unset') {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      // Try to get auth session (this will test the connection)
      const { error } = await supabase.auth.getSession()
      supabaseConnection = !error
      supabaseError = error?.message || null
    } catch (err: any) {
      supabaseError = err.message
    }
  }
  
  return NextResponse.json({
    ok: true,
    env: process.env.USE_MOCK ?? 'unset',
    supaUrl: supabaseUrl,
    hasAnon: !!supabaseAnonKey,
    supabaseConnection,
    supabaseError,
    timestamp: new Date().toISOString()
  })
}

