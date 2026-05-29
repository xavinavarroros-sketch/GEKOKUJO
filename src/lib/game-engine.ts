import type { SupabaseClient } from '@supabase/supabase-js';

/** ----------------------------------------------------------------
 * Battle resolution
 * Each side has chosen up to 3 orders. We compute an effective power
 * score from troops, quality, morale, terrain, season, devastation,
 * and order synergy, then map the ratio to an outcome.
 * ---------------------------------------------------------------- */

export const BATTLE_ORDERS = [
  'Frontal Assault', 'Ordered Defense', 'Flanking Maneuver', 'Hold Position',
  'Organized Retreat', 'Cavalry Charge', 'Arrow Volley', 'Ambush',
  'Burn Supplies', 'Protect the Daimyo', 'Night Attack', 'Harass and Withdraw',
] as const;

export const SIEGE_ATTACKER_ORDERS = [
  'Direct Assault', 'Surround and Wait', 'Cut Supply Lines', 'Build Siege Engines',
  'Bribe Defenders', 'Burn the Fields', 'Night Assault',
] as const;

export const SIEGE_DEFENDER_ORDERS = [
  'Hold Fast', 'Sortie', 'Ration Food', 'Call for Reinforcements',
  'Negotiate Surrender', 'Surprise Attack', 'Burn Siege Engines',
] as const;

interface ForceProfile {
  totalStrength: number;
  avgAttack: number;
  avgDefense: number;
  morale: number;
  supplies: number;
  orders: string[];
}

const ORDER_MOD: Record<string, { atk: number; def: number; risk: number }> = {
  'Frontal Assault': { atk: 1.2, def: 0.85, risk: 0.15 },
  'Ordered Defense': { atk: 0.9, def: 1.3, risk: -0.05 },
  'Flanking Maneuver': { atk: 1.25, def: 0.95, risk: 0.1 },
  'Hold Position': { atk: 0.95, def: 1.15, risk: 0 },
  'Organized Retreat': { atk: 0.6, def: 1.1, risk: -0.2 },
  'Cavalry Charge': { atk: 1.35, def: 0.8, risk: 0.2 },
  'Arrow Volley': { atk: 1.15, def: 1.0, risk: 0 },
  'Ambush': { atk: 1.4, def: 0.9, risk: 0.25 },
  'Burn Supplies': { atk: 1.0, def: 1.0, risk: 0.05 },
  'Protect the Daimyo': { atk: 0.85, def: 1.25, risk: -0.15 },
  'Night Attack': { atk: 1.3, def: 0.85, risk: 0.3 },
  'Harass and Withdraw': { atk: 0.8, def: 1.05, risk: -0.1 },
};

function applyOrders(base: number, orders: string[], key: 'atk' | 'def') {
  let mult = 1;
  for (const o of orders) {
    const m = ORDER_MOD[o];
    if (m) mult *= m[key];
  }
  return base * mult;
}

function rng(seed?: number) {
  return Math.random() * 0.3 + 0.85; // 0.85..1.15 chaos factor
}

export interface BattleOutcome {
  result: string;
  attackerLossPct: number;
  defenderLossPct: number;
  winner: 'attacker' | 'defender' | 'draw';
  log: string[];
}

export function resolveBattle(
  attacker: ForceProfile,
  defender: ForceProfile,
  ctx: { season: string; devastation: number; fortified?: boolean }
): BattleOutcome {
  const log: string[] = [];

  const seasonPenalty = ctx.season === 'winter' ? 0.85 : ctx.season === 'autumn' ? 0.95 : 1;

  let atkPower =
    attacker.totalStrength *
    (attacker.avgAttack / 20) *
    (attacker.morale / 60) *
    (attacker.supplies / 100) *
    seasonPenalty;
  atkPower = applyOrders(atkPower, attacker.orders, 'atk') * rng();

  let defPower =
    defender.totalStrength *
    (defender.avgDefense / 20) *
    (defender.morale / 60) *
    (defender.supplies / 100);
  defPower = applyOrders(defPower, defender.orders, 'def') * rng();

  if (ctx.fortified) defPower *= 1.4;
  // devastation hurts the side fighting on the ravaged land (defender)
  defPower *= 1 - ctx.devastation / 200;

  log.push(`Attacker effective power: ${Math.round(atkPower)}`);
  log.push(`Defender effective power: ${Math.round(defPower)}`);

  const ratio = atkPower / Math.max(1, defPower);
  let winner: 'attacker' | 'defender' | 'draw';
  let result: string;
  let attackerLossPct: number;
  let defenderLossPct: number;

  if (ratio > 1.8) {
    winner = 'attacker'; result = 'Decisive attacker victory';
    attackerLossPct = 0.1; defenderLossPct = 0.6;
  } else if (ratio > 1.25) {
    winner = 'attacker'; result = 'Minor attacker victory';
    attackerLossPct = 0.2; defenderLossPct = 0.4;
  } else if (ratio > 0.85) {
    winner = 'draw'; result = 'Bloody stalemate';
    attackerLossPct = 0.3; defenderLossPct = 0.3;
  } else if (ratio > 0.55) {
    winner = 'defender'; result = 'Minor defender victory';
    attackerLossPct = 0.4; defenderLossPct = 0.2;
  } else {
    winner = 'defender'; result = 'Decisive defender victory';
    attackerLossPct = 0.6; defenderLossPct = 0.1;
  }

  // order risk increases own losses
  const atkRisk = attacker.orders.reduce((s, o) => s + (ORDER_MOD[o]?.risk ?? 0), 0);
  const defRisk = defender.orders.reduce((s, o) => s + (ORDER_MOD[o]?.risk ?? 0), 0);
  attackerLossPct = Math.min(0.95, Math.max(0.05, attackerLossPct + atkRisk * 0.2));
  defenderLossPct = Math.min(0.95, Math.max(0.05, defenderLossPct + defRisk * 0.2));

  log.push(`Outcome: ${result} (ratio ${ratio.toFixed(2)})`);
  log.push(`Attacker losses ~${Math.round(attackerLossPct * 100)}%, Defender losses ~${Math.round(defenderLossPct * 100)}%`);

  return { result, attackerLossPct, defenderLossPct, winner, log };
}

/** ----------------------------------------------------------------
 * Espionage resolution
 * ---------------------------------------------------------------- */
export function resolveEspionage(
  successChance: number,
  forced?: string | null
): { status: 'success' | 'failure' | 'captured'; discovered: boolean } {
  if (forced === 'success') return { status: 'success', discovered: false };
  if (forced === 'failure') return { status: 'failure', discovered: false };
  if (forced === 'captured') return { status: 'captured', discovered: true };

  const roll = Math.random() * 100;
  if (roll < successChance) return { status: 'success', discovered: Math.random() < 0.1 };
  const captured = Math.random() < 0.25;
  return { status: captured ? 'captured' : 'failure', discovered: captured && Math.random() < 0.5 };
}

/** ----------------------------------------------------------------
 * Reinforcement cost (proportional to missing strength)
 * ---------------------------------------------------------------- */
export function reinforcementCost(
  template: { koku_cost: number; food_cost: number; population_cost: number; horse_cost: number },
  current: number,
  max: number
) {
  const missing = Math.max(0, max - current);
  const ratio = max > 0 ? missing / max : 0;
  return {
    koku: Math.ceil(template.koku_cost * ratio),
    food: Math.ceil(template.food_cost * ratio),
    population: Math.ceil(template.population_cost * ratio),
    horses: Math.ceil(template.horse_cost * ratio),
    ratio,
  };
}

/** ----------------------------------------------------------------
 * Logging & notification helpers (server-side, admin client)
 * ---------------------------------------------------------------- */
export async function logEvent(
  admin: SupabaseClient,
  type: string,
  message: string,
  opts: { clan_id?: string | null; actor_id?: string | null; season_id?: string | null; meta?: object } = {}
) {
  await admin.from('game_logs').insert({
    type, message,
    clan_id: opts.clan_id ?? null,
    actor_id: opts.actor_id ?? null,
    season_id: opts.season_id ?? null,
    meta: opts.meta ?? {},
  });
}

export async function notify(
  admin: SupabaseClient,
  recipientId: string,
  type: string,
  title: string,
  body?: string,
  clanId?: string | null
) {
  await admin.from('notifications').insert({
    recipient_id: recipientId, type, title, body: body ?? null, clan_id: clanId ?? null,
  });
}

/** Notify all members of a clan */
export async function notifyClan(
  admin: SupabaseClient,
  clanId: string,
  type: string,
  title: string,
  body?: string
) {
  const { data: members } = await admin.from('profiles').select('id').eq('clan_id', clanId);
  if (!members) return;
  await admin.from('notifications').insert(
    members.map((m: { id: string }) => ({
      recipient_id: m.id, type, title, body: body ?? null, clan_id: clanId,
    }))
  );
}

/** Next season in the cycle */
export function nextSeason(season: string, year: number): { season: string; year: number } {
  const order = ['spring', 'summer', 'autumn', 'winter'];
  const idx = order.indexOf(season);
  if (idx === 3) return { season: 'spring', year: year + 1 };
  return { season: order[idx + 1], year };
}
