import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TroopsPanel } from '@/components/panels/troops-panel';


export const dynamic = 'force-dynamic';

export default async function TroopsPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');
  if (!['daimyo', 'vassal'].includes(profile.role) && !profile.is_gm) {
    return <div className="text-washi2 py-20 text-center">Only lords may raise troops.</div>;
  }

  const supabase = createClient();
  const clanId = profile.clan_id;

  const [{ data: templates }, { data: units }, { data: provinces }, { data: clanRes }, { data: playerRes }] =
    await Promise.all([
      supabase.from('unit_templates').select('*').order('koku_cost'),
      supabase.from('units').select('*, unit_templates(name,type,max_strength:size_max)').eq('clan_id', clanId),
      supabase.from('provinces').select('id,name').eq('clan_id', clanId),
      supabase.from('clan_resources').select('*').eq('clan_id', clanId).maybeSingle(),
      supabase.from('player_resources').select('*').eq('player_id', profile.id).maybeSingle(),
    ]);

  const provIds = (provinces ?? []).map((p: any) => p.id);
  const { data: provRes } = await supabase.from('province_resources').select('province_id,population')
    .in('province_id', provIds.length ? provIds : ['none']);

  return (
    <TroopsPanel
      profile={profile}
      templates={templates ?? []}
      units={units ?? []}
      provinces={(provinces ?? []).map((p: any) => ({
        ...p, population: (provRes ?? []).find((r: any) => r.province_id === p.id)?.population ?? 0,
      }))}
      clanResources={clanRes}
      playerResources={playerRes}
    />
  );
}
