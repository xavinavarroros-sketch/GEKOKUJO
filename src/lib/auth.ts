import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

export async function getSessionProfile(): Promise<{ user: any; profile: Profile | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return { user, profile: (profile as Profile) ?? null };
}

/** API-route guard: returns the authenticated user or throws 401 shape. */
export async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile: profile as Profile | null, supabase };
}
