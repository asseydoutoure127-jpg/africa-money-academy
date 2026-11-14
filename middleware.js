import { NextResponse } from 'next/server';

// Si ADMIN_HOST est défini (ex. admin.votre-domaine.com), l'espace /admin n'est servi que sur cette adresse
// (et l'adresse publique ne montre plus l'admin). Sans ADMIN_HOST, /admin reste sur le site principal.
export function middleware(request) {
  const adminHost = process.env.ADMIN_HOST;
  if (!adminHost) return NextResponse.next();
  const host = (request.headers.get('host') || '').toLowerCase();
  const isAdminPath = request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/');
  if (isAdminPath && host !== adminHost.toLowerCase()) {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/admin'] };
