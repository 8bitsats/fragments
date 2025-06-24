import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory URL storage
const urlMap = new Map<string, string>();

export async function middleware(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop();
  
  if (!id) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Get stored URL if it exists
  const url = urlMap.get(`fragment:${id}`);
  if (url) {
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
  matcher: '/s/:path*',
}

// Helper functions for URL management (to be used by your API routes)
export function storeUrl(id: string, url: string) {
  urlMap.set(`fragment:${id}`, url);
}

export function getUrl(id: string) {
  return urlMap.get(`fragment:${id}`);
}

export function deleteUrl(id: string) {
  return urlMap.delete(`fragment:${id}`);
}
