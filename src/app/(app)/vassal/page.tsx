import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VassalPanel } from '@/components/panels/vassal-panel';


export const dynamic = 'force-dynamic';

export default async function VassalPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');
  if (profile.role !== 'vassal' && !profile.is_gm) {
    return <div className="text-washi2 py-20 text-center">This hall belongs to the clan&apos;s vassals.</div>;
  }

  const supabase = createClient();
  const [{ data: playerRes }, { data: clan }, { data: subs }, { data: units }, { data: taxes }] = await Promise.all([
    supabase.from('player_resources').select('*').eq('player_id', profile.id).maybeSingle(),
    profile.clan_id ? supabase.from('clans').select('*').eq('id', profile.clan_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('subprovinces').select('*, provinces(name)').eq('controller_id', profile.id),
    supabase.from('units').select('*, unit_templates(name,type)').eq('owner_player_id', profile.id),
    supabase.from('taxes').select('*').eq('target_player_id', profile.id),
  ]);

  return (
    <VassalPanel
      profile={profile}
      clan={clan}
      resources={playerRes}
      subprovinces={subs ?? []}
      units={units ?? []}
      taxes={taxes ?? []}
    />
  );
}
