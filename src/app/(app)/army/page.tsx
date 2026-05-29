import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ArmyPanel } from '@/components/panels/army-panel';


export const dynamic = 'force-dynamic';

export default async function ArmyPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');

  const supabase = createClient();
  const clanId = profile.clan_id;

  // commander sees armies they command; daimyo sees all clan armies
  let armyQuery = supabase.from('armies').select('*').eq('clan_id', clanId);
  if (profile.role === 'commander') armyQuery = supabase.from('armies').select('*').eq('commander_id', profile.id);

  const [{ data: armies }, { data: units }, { data: provinces }, { data: members }] = await Promise.all([
    armyQuery,
    supabase.from('units').select('*, unit_templates(name,type)').eq('clan_id', clanId).eq('status', 'active'),
    supabase.from('provinces').select('id,name,clan_id'),
    supabase.from('profiles').select('id,character_name,role').eq('clan_id', clanId),
  ]);

  return (
    <ArmyPanel
      profile={profile}
      armies={armies ?? []}
      units={units ?? []}
      provinces={provinces ?? []}
      members={members ?? []}
    />
  );
}
