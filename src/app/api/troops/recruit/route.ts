export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!['daimyo', 'vassal'].includes(profile.role) && !profile.is_gm) {
    return NextResponse.json({ ok: false, error: 'Only lords may raise troops.' }, { status: 403 });
  }

  const { templateId, provinceId } = await req.json();
  const admin = createAdminClient();

  const { data: tpl } = await admin.from('unit_templates').select('*').eq('id', templateId).single();
  if (!tpl) return NextResponse.json({ ok: false, error: 'Unknown unit type' }, { status: 404 });

  const isDaimyo = profile.role === 'daimyo';

  // Resource source
  let koku = 0, food = 0, horses = 0;
  if (isDaimyo) {
    const { data: cr } = await admin.from('clan_resources').select('*').eq('clan_id', profile.clan_id).single();
    koku = Number(cr?.koku ?? 0); food = Number(cr?.food ?? 0); horses = Number(cr?.horses ?? 0);
  } else {
    const { data: pr } = await admin.from('player_resources').select('*').eq('player_id', user.id).single();
    koku = Number(pr?.koku ?? 0); food = Number(pr?.food ?? 0); horses = Number(pr?.horses ?? 0);
  }

  if (koku < tpl.koku_cost) return NextResponse.json({ ok: false, error: 'Not enough koku.' }, { status: 400 });
  if (food < tpl.food_cost) return NextResponse.json({ ok: false, error: 'Not enough food.' }, { status: 400 });
  if (horses < tpl.horse_cost) return NextResponse.json({ ok: false, error: 'Not enough horses.' }, { status: 400 });

  // Population must come from a province
  const { data: pres } = await admin.from('province_resources').select('*').eq('province_id', provinceId).single();
  if (!pres || Number(pres.population) < tpl.population_cost) {
    return NextResponse.json({ ok: false, error: 'Not enough population in that province.' }, { status: 400 });
  }

  // Deduct population (permanent)
  await admin.from('province_resources')
    .update({ population: Number(pres.population) - tpl.population_cost })
    .eq('province_id', provinceId);

  // Deduct resources
  if (isDaimyo) {
    await admin.from('clan_resources').update({
      koku: koku - tpl.koku_cost, food: food - tpl.food_cost, horses: horses - tpl.horse_cost,
      total_population: undefined,
    }).eq('clan_id', profile.clan_id);
    // recompute clan total population
    await recomputeClanPopulation(admin, profile.clan_id!);
  } else {
    await admin.from('player_resources').update({
      koku: koku - tpl.koku_cost, food: food - tpl.food_cost, horses: horses - tpl.horse_cost,
    }).eq('player_id', user.id);
  }

  // Create the unit (forming)
  await admin.from('units').insert({
    unit_template_id: tpl.id,
    clan_id: profile.clan_id,
    owner_player_id: isDaimyo ? null : user.id,
    name: tpl.name,
    current_strength: tpl.size_max,
    max_strength: tpl.size_max,
    population_origin_province_id: provinceId,
    status: tpl.creation_time_seasons > 0 ? 'creating' : 'active',
    seasons_remaining: tpl.creation_time_seasons,
    morale: tpl.morale,
  });

  await logEvent(admin, 'unit_created',
    `${profile.character_name} raised a unit of ${tpl.name}, drawing ${tpl.population_cost} from the population.`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true });
}

async function recomputeClanPopulation(admin: any, clanId: string) {
  const { data: provs } = await admin.from('provinces').select('id').eq('clan_id', clanId);
  const ids = (provs ?? []).map((p: any) => p.id);
  if (!ids.length) return;
  const { data: rr } = await admin.from('province_resources').select('population').in('province_id', ids);
  const total = (rr ?? []).reduce((s: number, r: any) => s + Number(r.population || 0), 0);
  await admin.from('clan_resources').update({ total_population: total }).eq('clan_id', clanId);
}
