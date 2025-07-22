import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

// Define protected routes
const protectedRoutes = ['/dashboard']
const authRoutes = ['/signin', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Check if the route is an auth route (signin, signup)
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  // If accessing a protected route
  if (isProtectedRoute) {
    if (!token) {
      // Redirect to signin if no token
      return NextResponse.redirect(new URL('/signin', request.url))
    }

    try {
      // Verify the token
      await jwtVerify(token, JWT_SECRET)
      // Token is valid, continue to the protected route
      return NextResponse.next()
    } catch (error) {
      // Token is invalid, redirect to signin
      const response = NextResponse.redirect(new URL('/signin', request.url))
      // Clear invalid token
      response.cookies.delete('auth-token')
      return response
    }
  }

  // If accessing auth routes while already authenticated
  if (isAuthRoute && token) {
    try {
      // Verify the token
      await jwtVerify(token, JWT_SECRET)
      // User is authenticated, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      // Token is invalid, clear it and allow access to auth routes
      const response = NextResponse.next()
      response.cookies.delete('auth-token')
      return response
    }
  }

  // For all other routes, continue normally
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}