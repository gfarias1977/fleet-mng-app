import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-out',
  '/unauthorized',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, orgRole } = await auth();

  // Not authenticated → redirect to sign-in
  if (!userId) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('redirect_url', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated but not org:admin → unauthorized page
  if (orgRole !== 'org:admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
