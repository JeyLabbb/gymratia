import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Portal protection is done in layout.tsx (Server Component) to use iron-session (Node).
// Middleware only ensures /portal/* routes exist; layout handles auth redirect.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
