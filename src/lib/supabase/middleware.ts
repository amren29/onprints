import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/store',
  '/s/',
  '/track',
  '/proofing',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/api/',
]

function isPublicRoute(path: string): boolean {
  if (path === '/') return true
  return PUBLIC_ROUTES.some((route) => path === route || path.startsWith(route + '/') || path.startsWith(route))
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Rewrite /s/[slug]/... → /store/... (pass slug via query param)
  if (path.startsWith('/s/')) {
    const segments = path.split('/') // ['', 's', 'my-shop', 'products', ...]
    const slug = segments[2]
    if (slug) {
      const rest = '/' + segments.slice(3).join('/') // '/products/...'
      const storePath = '/store' + (rest === '/' ? '' : rest)
      const url = request.nextUrl.clone()
      url.pathname = storePath
      url.searchParams.set('_slug', slug)
      return NextResponse.rewrite(url)
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — IMPORTANT: do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = isPublicRoute(path)
  const isAuthPage = path === '/login' || path === '/register' || path === '/reset-password' || path === '/verify-email'

  // Protected routes: redirect to /login if no session
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
