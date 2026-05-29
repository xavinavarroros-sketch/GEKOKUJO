import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EspionagePanel } from '@/components/panels/espionage-panel';


export const dynamic = 'force-dynamic';

export default async function EspionagePage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');
  if (profile.role !== 'daimyo' && !profile.is_gm) {
    return <div className="text-washi2 py-20 text-center">Only the Daimyo commands the clan&apos;s shinobi.</div>;
  }

  const supabase = createClient();
  const [{ data: missions }, { data: provinces }, { data: clanRes }, { data: season }, { data: visibility }] =
    await Promise.all([
      supabase.from('espionage_missions').select('*, provinces(name)').eq('sending_clan_id', profile.clan_id)
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('provinces').select('id,name,clan_id, clans(name)').neq('clan_id', profile.clan_id ?? '').not('clan_id', 'is', null),
      supabase.from('clan_resources').select('koku').eq('clan_id', profile.clan_id).maybeSingle(),
      supabase.from('seasons').select('turn_number').eq('is_current', true).maybeSingle(),
      supabase.from('province_visibility').select('*, provinces(name)').eq('clan_id', profile.clan_id).eq('visibility_type', 'espionage'),
    ]);

  return (
    <EspionagePanel
      missions={missions ?? []}
      provinces={provinces ?? []}
      koku={clanRes?.koku ?? 0}
      currentTurn={season?.turn_number ?? 0}
      visibility={visibility ?? []}
    />
  );
}
