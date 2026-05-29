export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notifyClan, resolveBattle } from '@/lib/game-engine';


/** GM-only: immediately resolve one pending battle. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { battleId } = await req.json();
  if (!battleId) return NextResponse.json({ error: 'Missing battleId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: b } = await admin.from('battles').select('*').eq('id', battleId).maybeSingle();
  if (!b) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  if (b.state === 'resolved') return NextResponse.json({ error: 'Already resolved' }, { status: 400 });

  const { data: bOrders } = await admin.from('battle_orders').select('*').eq('battle_id', b.id).eq('submitted', true);
  const atkOrders = bOrders?.find((o: any) => o.is_attacker)?.orders ?? ['Frontal Assault'];
  const defOrders = bOrders?.find((o: any) => !o.is_attacker)?.orders ?? ['Ordered Defense'];

  const atk = await armyStrength(admin, b.attacker_army_id);
  const def = await armyStrength(admin, b.defender_army_id);
  const { data: prov } = await admin.from('provinces').select('has_main_castle').eq('id', b.province_id).maybeSingle();
  const { data: pres } = await admin.from('province_resources').select('devastation_level').eq('province_id', b.province_id).maybeSingle();
  const { data: season } = await admin.from('seasons').select('*').eq('is_current', true).maybeSingle();

  const outcome = resolveBattle(
    { totalStrength: atk.total, avgAttack: atk.atk, avgDefense: atk.def, morale: 55, supplies: 100, orders: atkOrders },
    { totalStrength: def.total, avgAttack: def.atk, avgDefense: def.def, morale: 60, supplies: 100, orders: defOrders },
    { season: season?.season ?? 'spring', devastation: pres?.devastation_level ?? 0, fortified: !!prov?.has_main_castle },
  );

  await applyLosses(admin, b.attacker_army_id, outcome.attackerLossPct);
  await applyLosses(admin, b.defender_army_id, outcome.defenderLossPct);

  // Winner takes the field; on a decisive attacker victory the province changes hands.
  if (outcome.winner === 'attacker' && outcome.result.startsWith('Decisive') && b.attacker_clan_id) {
    await admin.from('provinces').update({ clan_id: b.attacker_clan_id, state: 'normal' }).eq('id', b.province_id);
  } else {
    await admin.from('provinces').update({ state: 'normal' }).eq('id', b.province_id);
  }

  await admin.from('battles').update({ state: 'resolved', result: outcome.result, log: outcome.log }).eq('id', b.id);
  if (b.attacker_clan_id) await notifyClan(admin, b.attacker_clan_id, 'battle', 'Battle resolved', outcome.result);
  if (b.defender_clan_id) await notifyClan(admin, b.defender_clan_id, 'battle', 'Battle resolved', outcome.result);
  await logEvent(admin, 'battle_resolved', `GM resolved a battle: ${outcome.result}.`,
    { actor_id: user.id, season_id: season?.id ?? null });

  return NextResponse.json({ ok: true, message: outcome.result });
}

async function armyStrength(admin: any, armyId: string | null) {
  if (!armyId) return { total: 0, atk: 10, def: 10 };
  const { data: units } = await admin.from('units')
    .select('current_strength, unit_templates(attack,defense)').eq('army_id', armyId).eq('status', 'active');
  let total = 0, atk = 0, def = 0, n = 0;
  for (const u of units ?? []) {
    total += u.current_strength; atk += u.unit_templates?.attack ?? 10; def += u.unit_templates?.defense ?? 10; n++;
  }
  return { total, atk: n ? atk / n : 10, def: n ? def / n : 10 };
}

async function applyLosses(admin: any, armyId: string | null, pct: number) {
  if (!armyId) return;
  const { data: units } = await admin.from('units').select('*').eq('army_id', armyId).eq('status', 'active');
  for (const u of units ?? []) {
    const s = Math.max(0, Math.round(u.current_strength * (1 - pct)));
    await admin.from('units').update({ current_strength: s, status: s <= 0 ? 'destroyed' : 'active' }).eq('id', u.id);
  }
}
