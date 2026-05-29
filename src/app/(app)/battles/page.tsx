import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BattlesPanel } from '@/components/panels/battles-panel';


export const dynamic = 'force-dynamic';

export default async function BattlesPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');

  const supabase = createClient();
  const clanId = profile.clan_id;

  const [{ data: battles }, { data: sieges }, { data: orders }] = await Promise.all([
    supabase.from('battles').select('*, provinces(name)')
      .or(`attacker_clan_id.eq.${clanId},defender_clan_id.eq.${clanId}`)
      .order('created_at', { ascending: false }).limit(30),
    supabase.from('sieges').select('*, provinces(name)')
      .or(`attacker_clan_id.eq.${clanId},defender_clan_id.eq.${clanId}`)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('battle_orders').select('*').eq('clan_id', clanId),
  ]);

  return (
    <BattlesPanel
      profile={profile}
      battles={battles ?? []}
      sieges={sieges ?? []}
      orders={orders ?? []}
    />
  );
}
