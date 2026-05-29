export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notifyClan } from '@/lib/game-engine';


/** GM-only: force an espionage mission to success/failure/captured and apply effects. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { missionId, outcome } = await req.json();
  if (!missionId || !['success', 'failure', 'captured'].includes(outcome)) {
    return NextResponse.json({ error: 'Missing or invalid outcome' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: m } = await admin.from('espionage_missions').select('*').eq('id', missionId).maybeSingle();
  if (!m) return NextResponse.json({ error: 'Mission not found' }, { status: 404 });

  const { data: season } = await admin.from('seasons').select('id,turn_number').eq('is_current', true).maybeSingle();
  const turn = season?.turn_number ?? 0;
  const { data: rule } = await admin.from('game_rules').select('value').eq('key', 'espionage').maybeSingle();
  const visSeasons = rule?.value?.visibility_seasons ?? 1;
  const { data: prov } = await admin.from('provinces').select('name,clan_id').eq('id', m.target_province_id).maybeSingle();

  await admin.from('espionage_missions').update({
    status: outcome,
    forced_outcome: outcome,
    discovered: outcome === 'captured',
    result_summary: outcome === 'success'
      ? `GM granted the shinobi success at ${prov?.name ?? 'the province'}.`
      : outcome === 'captured'
        ? `GM ruled the shinobi captured at ${prov?.name ?? 'the province'}.`
        : `GM ruled the mission a failure.`,
  }).eq('id', missionId);

  if (outcome === 'success') {
    // grant/refresh espionage visibility for the sending clan
    await admin.from('province_visibility')
      .delete().eq('clan_id', m.sending_clan_id).eq('province_id', m.target_province_id).eq('visibility_type', 'espionage');
    await admin.from('province_visibility').insert({
      clan_id: m.sending_clan_id, province_id: m.target_province_id, visibility_type: 'espionage',
      season_id: season?.id ?? null, expires_at_season_turn: turn + visSeasons,
    });
    await notifyClan(admin, m.sending_clan_id, 'espionage', 'Intelligence secured',
      `Your shinobi report on ${prov?.name ?? 'the target'} is in hand.`);
  } else if (outcome === 'captured' && prov?.clan_id) {
    await notifyClan(admin, prov.clan_id, 'espionage', 'A spy was captured!',
      `Your guards seized an enemy shinobi at ${prov.name}.`);
  }

  await logEvent(admin, `espionage_forced_${outcome}`, `GM forced an espionage outcome: ${outcome}.`,
    { clan_id: m.sending_clan_id, actor_id: user.id, season_id: season?.id ?? null });

  return NextResponse.json({ ok: true, message: `Mission forced to ${outcome}.` });
}
