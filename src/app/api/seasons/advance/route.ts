export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import {

  logEvent, notifyClan, nextSeason, resolveBattle,
} from '@/lib/game-engine';
import { devastationMultiplier } from '@/lib/utils';

/**
 * Full season resolution. GM-only. Steps:
 * 1. Province production -> clan treasuries (minus devastation)
 * 2. Army maintenance
 * 3. Construction tick
 * 4. Unit formation tick
 * 5. Army movement
 * 6. Battle detection + resolution (for battles with submitted orders)
 * 7. Expire espionage visibility
 * 8. Advance the season counter
 */
export async function POST() {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) return NextResponse.json({ ok: false, error: 'Game Master only.' }, { status: 403 });

  const admin = createAdminClient();
  const { data: season } = await admin.from('seasons').select('*').eq('is_current', true).maybeSingle();
  if (!season) return NextResponse.json({ ok: false, error: 'No active season.' }, { status: 400 });

  const summary: string[] = [];

  // ---- 1. PRODUCTION ----
  const { data: clans } = await admin.from('clans').select('id,name').eq('status', 'active');
  for (const clan of clans ?? []) {
    const { data: provs } = await admin.from('provinces').select('id').eq('clan_id', clan.id);
    const ids = (provs ?? []).map((p: any) => p.id);
    if (!ids.length) continue;
    const { data: rr } = await admin.from('province_resources').select('*').in('province_id', ids);
    let koku = 0, food = 0, horses = 0, pop = 0;
    for (const r of rr ?? []) {
      const mult = devastationMultiplier(r.devastation_level ?? 0);
      koku += Number(r.koku_output || 0) * mult;
      food += Number(r.food_output || 0) * mult;
      horses += Number(r.horse_output || 0) * mult;
      pop += Number(r.population || 0);
    }
    const { data: cr } = await admin.from('clan_resources').select('*').eq('clan_id', clan.id).maybeSingle();
    if (cr) {
      await admin.from('clan_resources').update({
        koku: Number(cr.koku) + Math.round(koku),
        food: Number(cr.food) + Math.round(food),
        horses: Number(cr.horses) + Math.round(horses),
        total_population: Math.round(pop),
      }).eq('clan_id', clan.id);
    }
  }
  summary.push('Provinces yielded their harvest and koku.');

  // ---- 2. ARMY MAINTENANCE ----
  const { data: allUnits } = await admin.from('units').select('*, unit_templates(koku_maintenance,food_maintenance)')
    .eq('status', 'active');
  const maintByClan = new Map<string, { koku: number; food: number }>();
  for (const u of allUnits ?? []) {
    const m = maintByClan.get(u.clan_id) ?? { koku: 0, food: 0 };
    m.koku += Number(u.unit_templates?.koku_maintenance || 0);
    m.food += Number(u.unit_templates?.food_maintenance || 0);
    maintByClan.set(u.clan_id, m);
  }
  for (const [clanId, m] of maintByClan) {
    const { data: cr } = await admin.from('clan_resources').select('*').eq('clan_id', clanId).maybeSingle();
    if (!cr) continue;
    const newKoku = Number(cr.koku) - m.koku;
    const newFood = Number(cr.food) - m.food;
    await admin.from('clan_resources').update({ koku: Math.max(0, newKoku), food: Math.max(0, newFood) }).eq('clan_id', clanId);
    // starving army loses morale if food went negative
    if (newFood < 0) {
      await admin.from('armies').update({ morale: 30 }).eq('clan_id', clanId);
      await notifyClan(admin, clanId, 'supply', 'Your armies hunger!', 'There was not enough food to feed your troops. Morale falters.');
    }
  }
  summary.push('Armies consumed their upkeep.');

  // ---- 3. CONSTRUCTION TICK ----
  const { data: building } = await admin.from('province_buildings').select('*').eq('state', 'constructing');
  for (const b of building ?? []) {
    const remaining = (b.seasons_remaining ?? 1) - 1;
    if (remaining <= 0) {
      await admin.from('province_buildings').update({ state: 'active', seasons_remaining: 0 }).eq('id', b.id);
    } else {
      await admin.from('province_buildings').update({ seasons_remaining: remaining }).eq('id', b.id);
    }
  }
  summary.push('Construction projects advanced.');

  // ---- 4. UNIT FORMATION TICK ----
  const { data: forming } = await admin.from('units').select('*').eq('status', 'creating');
  for (const u of forming ?? []) {
    const remaining = (u.seasons_remaining ?? 1) - 1;
    if (remaining <= 0) {
      await admin.from('units').update({ status: 'active', seasons_remaining: 0 }).eq('id', u.id);
    } else {
      await admin.from('units').update({ seasons_remaining: remaining }).eq('id', u.id);
    }
  }
  summary.push('New levies completed their training.');

  // ---- 5. ARMY MOVEMENT ----
  const { data: marching } = await admin.from('armies').select('*').eq('state', 'marching');
  for (const a of marching ?? []) {
    const remaining = (a.seasons_to_arrival ?? 1) - 1;
    if (remaining <= 0 && a.destination_province_id) {
      await admin.from('armies').update({
        current_province_id: a.destination_province_id, destination_province_id: null,
        seasons_to_arrival: 0, state: 'idle',
      }).eq('id', a.id);
      await notifyClan(admin, a.clan_id, 'movement', 'Army arrived', `"${a.name}" has reached its destination.`);
    } else {
      await admin.from('armies').update({ seasons_to_arrival: remaining }).eq('id', a.id);
    }
  }

  // ---- 6. BATTLE DETECTION ----
  // any province with armies from 2+ different clans -> create a battle if none pending
  const { data: armies } = await admin.from('armies').select('id,clan_id,current_province_id,name');
  const byProvince = new Map<string, any[]>();
  for (const a of armies ?? []) {
    if (!a.current_province_id) continue;
    const arr = byProvince.get(a.current_province_id) ?? [];
    arr.push(a); byProvince.set(a.current_province_id, arr);
  }
  for (const [provId, list] of byProvince) {
    const clanIds = [...new Set(list.map((a) => a.clan_id))];
    if (clanIds.length < 2) continue;
    // mark province at war
    await admin.from('provinces').update({ state: 'at_war' }).eq('id', provId);
    const { data: existing } = await admin.from('battles').select('id').eq('province_id', provId).neq('state', 'resolved').maybeSingle();
    if (existing) continue;
    const { data: prov } = await admin.from('provinces').select('clan_id').eq('id', provId).single();
    const defenderClan = prov?.clan_id ?? clanIds[0];
    const attackerClan = clanIds.find((c) => c !== defenderClan) ?? clanIds[1];
    const attackerArmy = list.find((a) => a.clan_id === attackerClan);
    const defenderArmy = list.find((a) => a.clan_id === defenderClan);
    await admin.from('battles').insert({
      province_id: provId, season_id: season.id,
      attacker_army_id: attackerArmy?.id, defender_army_id: defenderArmy?.id,
      attacker_clan_id: attackerClan, defender_clan_id: defenderClan,
      state: 'awaiting_orders',
    });
    await notifyClan(admin, attackerClan, 'battle', 'Battle imminent!', 'Your forces have met the enemy. Issue battle orders.');
    await notifyClan(admin, defenderClan, 'battle', 'You are under attack!', 'Enemy forces approach. Issue battle orders.');
  }

  // resolve battles that have both orders (or are awaiting and at least 1 turn old)
  const { data: pendingBattles } = await admin.from('battles').select('*').eq('state', 'awaiting_orders');
  for (const b of pendingBattles ?? []) {
    const { data: bOrders } = await admin.from('battle_orders').select('*').eq('battle_id', b.id).eq('submitted', true);
    const atkOrders = bOrders?.find((o: any) => o.is_attacker)?.orders ?? ['Frontal Assault'];
    const defOrders = bOrders?.find((o: any) => !o.is_attacker)?.orders ?? ['Ordered Defense'];

    const atkStrength = await armyStrength(admin, b.attacker_army_id);
    const defStrength = await armyStrength(admin, b.defender_army_id);
    const { data: prov } = await admin.from('provinces').select('defensive_value,has_main_castle').eq('id', b.province_id).single();
    const { data: pres } = await admin.from('province_resources').select('devastation_level').eq('province_id', b.province_id).maybeSingle();

    const outcome = resolveBattle(
      { totalStrength: atkStrength.total, avgAttack: atkStrength.atk, avgDefense: atkStrength.def, morale: 55, supplies: 100, orders: atkOrders },
      { totalStrength: defStrength.total, avgAttack: defStrength.atk, avgDefense: defStrength.def, morale: 60, supplies: 100, orders: defOrders },
      { season: season.season, devastation: pres?.devastation_level ?? 0, fortified: false }
    );

    await applyLosses(admin, b.attacker_army_id, outcome.attackerLossPct);
    await applyLosses(admin, b.defender_army_id, outcome.defenderLossPct);

    await admin.from('battles').update({ state: 'resolved', result: outcome.result, log: outcome.log }).eq('id', b.id);
    if (b.attacker_clan_id) await notifyClan(admin, b.attacker_clan_id, 'battle', 'Battle resolved', outcome.result);
    if (b.defender_clan_id) await notifyClan(admin, b.defender_clan_id, 'battle', 'Battle resolved', outcome.result);
    await logEvent(admin, 'battle_resolved', `Battle: ${outcome.result}.`, { season_id: season.id });
  }
  summary.push('Battles were joined and resolved.');

  // ---- 7. EXPIRE ESPIONAGE ----
  await admin.from('province_visibility').delete()
    .eq('visibility_type', 'espionage').lt('expires_at_season_turn', season.turn_number + 1);

  // ---- 8. ADVANCE SEASON ----
  const next = nextSeason(season.season, season.year);
  await admin.from('seasons').update({ is_current: false, resolved: true }).eq('id', season.id);
  const { data: newSeason } = await admin.from('seasons').insert({
    year: next.year, season: next.season, turn_number: season.turn_number + 1, is_current: true,
  }).select().single();

  await logEvent(admin, 'season_advanced',
    `The season turned to ${next.season} ${next.year} (Turn ${season.turn_number + 1}).`, { season_id: newSeason?.id });

  return NextResponse.json({ ok: true, summary, newSeason });
}

async function armyStrength(admin: any, armyId: string | null) {
  if (!armyId) return { total: 0, atk: 10, def: 10 };
  const { data: units } = await admin.from('units').select('current_strength, unit_templates(attack,defense)')
    .eq('army_id', armyId).eq('status', 'active');
  let total = 0, atk = 0, def = 0, n = 0;
  for (const u of units ?? []) {
    total += u.current_strength;
    atk += u.unit_templates?.attack ?? 10;
    def += u.unit_templates?.defense ?? 10;
    n++;
  }
  return { total, atk: n ? atk / n : 10, def: n ? def / n : 10 };
}

async function applyLosses(admin: any, armyId: string | null, pct: number) {
  if (!armyId) return;
  const { data: units } = await admin.from('units').select('*').eq('army_id', armyId).eq('status', 'active');
  for (const u of units ?? []) {
    const newStrength = Math.max(0, Math.round(u.current_strength * (1 - pct)));
    await admin.from('units').update({
      current_strength: newStrength,
      status: newStrength <= 0 ? 'destroyed' : 'active',
    }).eq('id', u.id);
  }
}
