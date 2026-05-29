export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { reinforcementCost, logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { scope, id } = await req.json();
  const admin = createAdminClient();

  // gather target units
  let unitsQuery = admin.from('units').select('*, unit_templates(*)').eq('clan_id', profile.clan_id).eq('status', 'active');
  if (scope === 'unit' && id) unitsQuery = admin.from('units').select('*, unit_templates(*)').eq('id', id);
  if (scope === 'army' && id) unitsQuery = admin.from('units').select('*, unit_templates(*)').eq('army_id', id);

  const { data: units } = await unitsQuery;
  if (!units || units.length === 0) return NextResponse.json({ ok: false, error: 'No units to reinforce.' }, { status: 400 });

  // resource pool (daimyo: clan, vassal: personal)
  const isDaimyo = profile.role === 'daimyo';
  let pool: any;
  if (isDaimyo) {
    const { data } = await admin.from('clan_resources').select('*').eq('clan_id', profile.clan_id).single();
    pool = data;
  } else {
    const { data } = await admin.from('player_resources').select('*').eq('player_id', user.id).single();
    pool = data;
  }

  // pick a province to draw population from (largest)
  const { data: provs } = await admin.from('provinces').select('id').eq('clan_id', profile.clan_id);
  const provIds = (provs ?? []).map((p: any) => p.id);
  const { data: provRes } = await admin.from('province_resources').select('*')
    .in('province_id', provIds.length ? provIds : ['none']).order('population', { ascending: false });
  let source = provRes?.[0];

  let totalKoku = 0, totalFood = 0, totalHorses = 0, totalPop = 0, reinforced = 0;

  for (const u of units) {
    if (u.current_strength >= u.max_strength) continue;
    const cost = reinforcementCost(u.unit_templates, u.current_strength, u.max_strength);
    if (Number(pool.koku) - totalKoku < cost.koku) continue;
    if (Number(pool.food) - totalFood < cost.food) continue;
    if (Number(pool.horses ?? 0) - totalHorses < cost.horses) continue;
    if (!source || Number(source.population) - totalPop < cost.population) continue;

    await admin.from('units').update({ current_strength: u.max_strength }).eq('id', u.id);
    totalKoku += cost.koku; totalFood += cost.food; totalHorses += cost.horses; totalPop += cost.population;
    reinforced++;
  }

  if (reinforced === 0) {
    return NextResponse.json({ ok: false, error: 'Insufficient resources or population to reinforce.' }, { status: 400 });
  }

  // apply deductions
  if (isDaimyo) {
    await admin.from('clan_resources').update({
      koku: Number(pool.koku) - totalKoku, food: Number(pool.food) - totalFood, horses: Number(pool.horses) - totalHorses,
    }).eq('clan_id', profile.clan_id);
  } else {
    await admin.from('player_resources').update({
      koku: Number(pool.koku) - totalKoku, food: Number(pool.food) - totalFood, horses: Number(pool.horses) - totalHorses,
    }).eq('player_id', user.id);
  }
  if (source && totalPop > 0) {
    await admin.from('province_resources').update({ population: Number(source.population) - totalPop })
      .eq('province_id', source.province_id);
  }

  await logEvent(admin, 'unit_reinforced',
    `${profile.character_name} reinforced ${reinforced} unit(s), drawing ${totalPop} from the population.`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true, message: `Reinforced ${reinforced} unit(s).` });
}
