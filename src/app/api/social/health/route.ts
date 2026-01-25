import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// GET /api/social/health - Verificar estado de las tablas
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const tables = [
      'social_posts',
      'post_likes',
      'post_comments',
      'post_shares',
      'user_follows',
      'post_views'
    ]

    const results: Record<string, { exists: boolean; error?: string }> = {}

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST116') {
            results[table] = { exists: false, error: 'Tabla no existe' }
          } else {
            results[table] = { exists: true, error: error.message }
          }
        } else {
          results[table] = { exists: true }
        }
      } catch (err: any) {
        results[table] = { exists: false, error: err.message }
      }
    }

    return NextResponse.json({ 
      status: 'ok',
      tables: results,
      message: 'Ejecuta create-social-features.sql en Supabase si alguna tabla no existe'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

