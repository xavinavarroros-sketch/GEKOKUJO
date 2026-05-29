import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

function supabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutMs = process.env.NEXT_PHASE === 'phase-production-build' ? 1000 : 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();
  return fetch(input, { ...init, signal: init?.signal ?? controller.signal })
    .finally(() => clearTimeout(timeout));
}


export function createClient() {
  // Next 16 types cookies() as async, while Supabase SSR's adapter still expects
  // a synchronous cookie interface. The runtime keeps sync access available here.
  const cookieStore = cookies() as unknown as ReadonlyRequestCookies;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware refreshes sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service role key. NEVER expose to the browser.
 * Used inside API routes for privileged, validated mutations.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: supabaseFetch } }
  );
}
