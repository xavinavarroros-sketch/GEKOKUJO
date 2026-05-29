export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveEspionage, logEvent, notifyClan } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (profile.role !== 'daimyo' && !profile.is_gm) {
    return NextResponse.json({ error: 'Only the Daimyo commands the shinobi.' }, { status: 403 });
  }
  if (!profile.clan_id) return NextResponse.json({ error: 'No clan' }, { status: 400 });

  const { provinceId } = await req.json();
  const admin = createAdminClient();

  // load rule defaults
  const { data: rule } = await admin.from('game_rules').select('value').eq('key', 'espionage').maybeSingle();
  const cost = rule?.value?.base_cost ?? 100;
  const chance = rule?.value?.base_chance ?? 60;
  const visSeasons = rule?.value?.visibility_seasons ?? 1;

  // can't spy your own
  const { data: prov } = await admin.from('provinces').select('id,clan_id,name').eq('id', provinceId).single();
  if (!prov) return NextResponse.json({ error: 'Province not found' }, { status: 404 });
  if (prov.clan_id === profile.clan_id) {
    return NextResponse.json({ error: 'You already see your own province.' }, { status: 400 });
  }

  // pay koku
  const { data: cr } = await admin.from('clan_resources').select('*').eq('clan_id', profile.clan_id).single();
  if (!cr || Number(cr.koku) < cost) {
    return NextResponse.json({ error: `Not enough koku (need ${cost}).` }, { status: 400 });
  }
  await admin.from('clan_resources').update({ koku: Number(cr.koku) - cost }).eq('clan_id', profile.clan_id);

  const { data: season } = await admin.from('seasons').select('id,turn_number').eq('is_current', true).maybeSingle();
  const turn = season?.turn_number ?? 0;

  const outcome = resolveEspionage(chance, null);

  // record mission
  const { data: mission } = await admin.from('espionage_missions').insert({
    sending_clan_id: profile.clan_id, target_province_id: provinceId, season_id: season?.id,
    koku_cost: cost, success_chance: chance, status: outcome.status,
    discovered: outcome.discovered, expires_at_season_turn: turn + visSeasons,
    result_summary: outcome.status === 'success'
      ? `Infiltration successful. Intel on ${prov.name} secured for ${visSeasons} season(s).`
      : outcome.status === 'captured'
        ? `The shinobi was captured at ${prov.name}.`
        : `The mission to ${prov.name} failed. The koku is lost.`,
  }).select().single();

  let message = '';
  if (outcome.status === 'success') {
    // grant temporary visibility
    await admin.from('province_visibility').insert({
      clan_id: profile.clan_id, province_id: provinceId, visibility_type: 'espionage',
      season_id: season?.id, expires_at_season_turn: turn + visSeasons,
    });
    message = `Success! ${prov.name} is now under your watch for ${visSeasons} season(s).`;
  } else if (outcome.status === 'captured') {
    message = `Your shinobi was captured at ${prov.name}! The koku is lost.`;
    if (outcome.discovered && prov.clan_id) {
      await notifyClan(admin, prov.clan_id, 'espionage', 'A spy was captured!',
        `Your guards seized a shinobi from the ${ (await clanName(admin, profile.clan_id)) } Clan at ${prov.name}.`);
    }
  } else {
    message = `The mission failed. Your shinobi slipped away, but learned nothing. The koku is lost.`;
  }

  await logEvent(admin, `espionage_${outcome.status}`,
    `${profile.character_name} sent shinobi to ${prov.name}: ${outcome.status}.`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true, status: outcome.status, message });
}

async function clanName(admin: any, clanId: string) {
  const { data } = await admin.from('clans').select('name').eq('id', clanId).single();
  return data?.name ?? 'an unknown';
}
