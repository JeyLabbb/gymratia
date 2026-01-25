import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { bucketId } = body

    if (!bucketId) {
      return NextResponse.json({ error: 'Bucket ID is required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if bucket already exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const existingBucket = buckets?.find(b => b.id === bucketId)

    if (existingBucket) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bucket already exists',
        bucket: existingBucket 
      })
    }

    // Try to create bucket using REST API directly
    // Supabase Storage API endpoint for creating buckets
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const bucketName = bucketId
    const isPublic = true

    // Use the Storage Management API to create bucket
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        id: bucketId,
        name: bucketName,
        public: isPublic
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error creating bucket via API:', errorText)
      
      // Return helpful error message with SQL instructions
      return NextResponse.json({ 
        error: 'No se pudo crear el bucket automáticamente',
        manualSetupRequired: true,
        instructions: {
          message: 'Por favor, ejecuta el siguiente SQL en Supabase SQL Editor:',
          sql: `INSERT INTO storage.buckets (id, name, public) VALUES ('${bucketId}', '${bucketName}', ${isPublic}) ON CONFLICT (id) DO NOTHING;`,
          steps: [
            '1. Ve a https://supabase.com/dashboard y selecciona tu proyecto',
            '2. Haz clic en "SQL Editor" en el menú lateral',
            '3. Copia y pega el SQL de arriba',
            '4. Haz clic en "Run"'
          ]
        }
      }, { status: 500 })
    }

    const bucketData = await response.json()

    return NextResponse.json({ 
      success: true, 
      message: 'Bucket created successfully',
      bucket: bucketData
    })
  } catch (error: any) {
    console.error('Setup bucket error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      manualSetupRequired: true,
      instructions: {
        message: 'Por favor, ejecuta el script create-progress-photos-bucket-only.sql en Supabase SQL Editor',
        file: 'create-progress-photos-bucket-only.sql'
      }
    }, { status: 500 })
  }
}

