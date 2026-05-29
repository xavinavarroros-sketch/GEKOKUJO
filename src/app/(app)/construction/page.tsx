import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConstructionPanel } from '@/components/panels/construction-panel';


export const dynamic = 'force-dynamic';

export default async function ConstructionPage() {
  const { profile } = await getSessionProfile();
  if (!profile) redirect('/auth/login');
  if (!['daimyo', 'vassal'].includes(profile.role) && !profile.is_gm) {
    return <div className="text-washi2 py-20 text-center">Only lords may order construction.</div>;
  }

  const supabase = createClient();
  const clanId = profile.clan_id;
  const [{ data: templates }, { data: provinces }, { data: clanRes }] = await Promise.all([
    supabase.from('building_templates').select('*').order('category'),
    supabase.from('provinces').select('id,name').eq('clan_id', clanId),
    supabase.from('clan_resources').select('*').eq('clan_id', clanId).maybeSingle(),
  ]);

  const provIds = (provinces ?? []).map((p: any) => p.id);
  const { data: built } = await supabase
    .from('province_buildings').select('*, building_templates(name,category), provinces(name)')
    .in('province_id', provIds.length ? provIds : ['none']);

  return (
    <ConstructionPanel
      templates={templates ?? []}
      provinces={provinces ?? []}
      built={built ?? []}
      clanResources={clanRes}
    />
  );
}
