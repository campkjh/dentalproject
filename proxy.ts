import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, Next internals, images, and the upload API
    '/((?!_next/static|_next/image|favicon.ico|icons/|images/|api/upload).*)',
  ],
};
