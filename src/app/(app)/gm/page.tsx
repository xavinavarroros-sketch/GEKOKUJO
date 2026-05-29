import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GMPanel } from '@/components/panels/gm-panel';


export const dynamic = 'force-dynamic';

export default async function GMPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');
  if (!profile.is_gm) return <div className="text-washi2 py-20 text-center">Only the Game Master may enter this hall.</div>;

  const supabase = createClient();
  const [
    { data: season }, { data: clans }, { data: provinces }, { data: players },
    { data: battles }, { data: sieges }, { data: missions }, { data: logs }, { data: shogunate },
  ] = await Promise.all([
    supabase.from('seasons').select('*').eq('is_current', true).maybeSingle(),
    supabase.from('clans').select('*'),
    supabase.from('provinces').select('*, province_resources(*)'),
    supabase.from('profiles').select('*'),
    supabase.from('battles').select('*, provinces(name)').neq('state', 'resolved'),
    supabase.from('sieges').select('*, provinces(name)').eq('state', 'ongoing'),
    supabase.from('espionage_missions').select('*, provinces(name), clans:sending_clan_id(name)').order('created_at', { ascending: false }).limit(40),
    supabase.from('game_logs').select('*').order('created_at', { ascending: false }).limit(60),
    supabase.from('shogunate').select('*').eq('active', true).maybeSingle(),
  ]);

  return (
    <GMPanel
      season={season}
      clans={clans ?? []}
      provinces={provinces ?? []}
      players={players ?? []}
      battles={battles ?? []}
      sieges={sieges ?? []}
      missions={missions ?? []}
      logs={logs ?? []}
      shogunate={shogunate}
    />
  );
}
