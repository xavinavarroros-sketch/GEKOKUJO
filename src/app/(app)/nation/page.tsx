import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NationPanel } from '@/components/panels/nation-panel';


export const dynamic = 'force-dynamic';

export default async function NationPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');
  if (profile.role !== 'daimyo' && !profile.is_gm) {
    return <div className="text-washi2 py-20 text-center">Only a Daimyo may govern the clan.</div>;
  }

  const supabase = createClient();
  const clanId = profile.clan_id;
  if (!clanId && !profile.is_gm) {
    return <div className="text-washi2 py-20 text-center">You hold no clan.</div>;
  }

  const [{ data: clan }, { data: resources }, { data: provinces }, { data: members }, { data: taxes }, { data: armies }] =
    await Promise.all([
      supabase.from('clans').select('*').eq('id', clanId).maybeSingle(),
      supabase.from('clan_resources').select('*').eq('clan_id', clanId).maybeSingle(),
      supabase.from('provinces').select('*').eq('clan_id', clanId),
      supabase.from('profiles').select('id,character_name,role').eq('clan_id', clanId),
      supabase.from('taxes').select('*').eq('clan_id', clanId),
      supabase.from('armies').select('*').eq('clan_id', clanId),
    ]);

  const provIds = (provinces ?? []).map((p: any) => p.id);
  const { data: provRes } = await supabase.from('province_resources').select('*')
    .in('province_id', provIds.length ? provIds : ['none']);

  return (
    <NationPanel
      clan={clan}
      resources={resources}
      provinces={provinces ?? []}
      provinceResources={provRes ?? []}
      members={members ?? []}
      taxes={taxes ?? []}
      armies={armies ?? []}
    />
  );
}
