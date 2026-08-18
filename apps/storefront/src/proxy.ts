import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {routing} from './platform/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// This is a private ordering portal, not a public storefront: nothing (catalog
// included) should be browsable without signing in. Only the auth-flow pages
// themselves are public.
const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';

const PUBLIC_PATHS = [
    '/sign-in',
    '/forgot-password',
    '/reset-password',
    '/register', // redirects to /sign-in, but must itself be reachable to do so
    '/verify',
    '/verify-pending',
];

function stripLocale(pathname: string): string {
    const match = pathname.match(/^\/(en|de)(\/.*)?$/);
    return match ? (match[2] || '/') : pathname;
}

export function proxy(request: NextRequest) {
    const pathname = stripLocale(request.nextUrl.pathname);
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (!isPublic && !request.cookies.has(AUTH_TOKEN_COOKIE)) {
        const locale = request.nextUrl.pathname.match(/^\/(en|de)(\/|$)/)?.[1] || routing.defaultLocale;
        const signInUrl = new URL(`/${locale}/sign-in`, request.url);
        // pathname here is already locale-stripped: the login action's redirect()
        // helper (next-intl) re-adds the locale prefix itself, so passing the
        // locale-prefixed request.nextUrl.pathname here would double it up
        // (e.g. /en/en/...) and 404 after a successful login.
        signInUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(signInUrl);
    }

    return intlMiddleware(request);
}

export const config = {matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']};
