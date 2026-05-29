export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notify } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (profile.role !== 'vassal') {
    return NextResponse.json({ error: 'Only a vassal may rebel against their lord.' }, { status: 403 });
  }
  if (!profile.clan_id) return NextResponse.json({ error: 'You hold no clan to rebel against.' }, { status: 400 });

  const { manifesto } = await req.json();
  const admin = createAdminClient();

  // Subprovinces controlled by this vassal enter rebellion
  await admin.from('subprovinces').update({ in_rebellion: true }).eq('controller_id', user.id);

  // Provinces containing those subprovinces shift to rebellion state
  const { data: subs } = await admin.from('subprovinces').select('province_id').eq('controller_id', user.id);
  const provIds = [...new Set((subs ?? []).map((s: any) => s.province_id))];
  if (provIds.length) {
    await admin.from('provinces').update({ state: 'rebellion' }).in('id', provIds);
  }

  // Mark profile role as rebel-flavored (kept as vassal but flagged via log); units stay under owner
  await logEvent(admin, 'rebellion', `${profile.character_name} has declared rebellion! ${manifesto ? '"' + manifesto + '"' : ''}`,
    { clan_id: profile.clan_id, actor_id: user.id });

  // Notify daimyo and GM
  const { data: clan } = await admin.from('clans').select('daimyo_id,name').eq('id', profile.clan_id).single();
  if (clan?.daimyo_id) {
    await notify(admin, clan.daimyo_id, 'rebellion', 'A vassal has rebelled!',
      `${profile.character_name} has risen against you. Civil war engulfs the ${clan.name} Clan.`, profile.clan_id);
  }
  const { data: gms } = await admin.from('profiles').select('id').eq('is_gm', true);
  for (const g of gms ?? []) {
    await notify(admin, g.id, 'rebellion', 'Rebellion declared',
      `${profile.character_name} rebelled against the ${clan?.name} Clan.`);
  }

  return NextResponse.json({ ok: true });
}
