import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

function gameMasterEmails(): string[] {
  return [
    process.env.GAME_MASTER_EMAIL,
    process.env.NEXT_PUBLIC_GAME_MASTER_EMAIL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isConfiguredGameMasterEmail(email?: string | null): boolean {
  if (!email) return false;
  return gameMasterEmails().includes(email.toLowerCase());
}

async function promoteConfiguredGameMaster(user: any, profile: Profile | null): Promise<Profile | null> {
  if (!user?.email || !profile) return profile;
  if (profile.is_gm && profile.role === 'gm') return profile;
  if (!isConfiguredGameMasterEmail(user.email)) return profile;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('profiles')
      .update({ is_gm: true, role: 'gm', clan_id: null, approved: true, blocked: false })
      .eq('id', user.id)
      .select('*')
      .single();

    return (data as Profile) ?? { ...profile, is_gm: true, role: 'gm', clan_id: null };
  } catch {
    return profile;
  }
}

export async function getSessionProfile(): Promise<{ user: any; profile: Profile | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return { user, profile: await promoteConfiguredGameMaster(user, (profile as Profile) ?? null) };
}

/** API-route guard: returns the authenticated user or throws 401 shape. */
export async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile: await promoteConfiguredGameMaster(user, profile as Profile | null), supabase };
}
