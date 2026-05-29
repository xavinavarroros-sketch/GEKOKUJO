import type { SupabaseClient } from '@supabase/supabase-js';
import { troopHint } from './utils';

export interface PublicProvinceView {
  id: string;
  name: string;
  region: string | null;
  clan_id: string | null;
  clan_name: string | null;
  clan_color: string | null;
  has_main_castle: boolean;
  state: string;
  map_x: number | null;
  map_y: number | null;
  svg_path: string | null;
  // public-only hint
  troop_hint: 'none' | 'small' | 'medium' | 'large' | 'unknown';
  visible: boolean;
  // gated (only when visible)
  details?: {
    daimyo_name: string | null;
    population: number;
    koku_output: number;
    food_output: number;
    horse_output: number;
    devastation_level: number;
    defensive_value: number;
    strategic_value: number;
    special_building: string | null;
    subprovinces: { id: string; name: string; type: string; in_rebellion: boolean }[];
    armies: { id: string; name: string; clan_id: string; total_strength: number }[];
    buildings: { id: string; name: string; state: string }[];
  };
}

/**
 * Build the visibility-aware map for a given clan.
 * Uses the admin client (bypasses RLS) but applies the fog-of-war rules itself.
 */
export async function buildMapView(
  admin: SupabaseClient,
  myClanId: string | null,
  isGm: boolean
): Promise<PublicProvinceView[]> {
  const [{ data: provinces }, { data: clans }, { data: profiles }, { data: armies }, { data: presence }, { data: season }] =
    await Promise.all([
      admin.from('provinces').select('*'),
      admin.from('clans').select('id,name,color,daimyo_id'),
      admin.from('profiles').select('id,character_name'),
      admin.from('armies').select('id,name,clan_id,current_province_id'),
      admin.from('province_visibility').select('province_id,clan_id,expires_at_season_turn'),
      admin.from('seasons').select('turn_number').eq('is_current', true).maybeSingle(),
    ]);

  const turn = season?.turn_number ?? 0;
  const clanMap = new Map((clans ?? []).map((c: any) => [c.id, c]));
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  // unit strengths per army
  const { data: units } = await admin.from('units').select('army_id,current_strength,status');
  const armyStrength = new Map<string, number>();
  for (const u of units ?? []) {
    if (u.army_id && u.status !== 'destroyed') {
      armyStrength.set(u.army_id, (armyStrength.get(u.army_id) ?? 0) + (u.current_strength ?? 0));
    }
  }

  // resources/subprovinces/buildings preloaded
  const provIds = (provinces ?? []).map((p: any) => p.id);
  const [{ data: provRes }, { data: subs }, { data: provBuild }, { data: buildTpl }] = await Promise.all([
    admin.from('province_resources').select('*').in('province_id', provIds.length ? provIds : ['none']),
    admin.from('subprovinces').select('*').in('province_id', provIds.length ? provIds : ['none']),
    admin.from('province_buildings').select('*').in('province_id', provIds.length ? provIds : ['none']),
    admin.from('building_templates').select('id,name'),
  ]);
  const resMap = new Map((provRes ?? []).map((r: any) => [r.province_id, r]));
  const tplMap = new Map((buildTpl ?? []).map((t: any) => [t.id, t.name]));

  // visibility set for my clan
  const visibleProvinces = new Set<string>();
  if (myClanId) {
    for (const p of provinces ?? []) if (p.clan_id === myClanId) visibleProvinces.add(p.id);
    for (const a of armies ?? []) if (a.clan_id === myClanId && a.current_province_id) visibleProvinces.add(a.current_province_id);
    for (const v of presence ?? []) {
      if (v.clan_id === myClanId && (v.expires_at_season_turn == null || v.expires_at_season_turn >= turn)) {
        visibleProvinces.add(v.province_id);
      }
    }
  }

  return (provinces ?? []).map((p: any): PublicProvinceView => {
    const clan = p.clan_id ? clanMap.get(p.clan_id) : null;
    const provArmies = (armies ?? []).filter((a: any) => a.current_province_id === p.id);
    const totalPresent = provArmies.reduce((s: number, a: any) => s + (armyStrength.get(a.id) ?? 0), 0);
    const canSee = isGm || visibleProvinces.has(p.id);

    const base: PublicProvinceView = {
      id: p.id,
      name: p.name,
      region: p.region,
      clan_id: p.clan_id,
      clan_name: clan?.name ?? null,
      clan_color: clan?.color ?? null,
      has_main_castle: p.has_main_castle,
      state: p.state,
      map_x: p.map_x,
      map_y: p.map_y,
      svg_path: p.svg_path,
      troop_hint: canSee ? 'none' : totalPresent > 0 ? troopHint(totalPresent) : 'none',
      visible: canSee,
    };

    if (canSee) {
      const r = resMap.get(p.id);
      base.details = {
        daimyo_name: clan?.daimyo_id ? profMap.get(clan.daimyo_id)?.character_name ?? null : null,
        population: r?.population ?? 0,
        koku_output: r?.koku_output ?? 0,
        food_output: r?.food_output ?? 0,
        horse_output: r?.horse_output ?? 0,
        devastation_level: r?.devastation_level ?? 0,
        defensive_value: p.defensive_value,
        strategic_value: p.strategic_value,
        special_building: p.special_building,
        subprovinces: (subs ?? []).filter((s: any) => s.province_id === p.id)
          .map((s: any) => ({ id: s.id, name: s.name, type: s.type, in_rebellion: s.in_rebellion })),
        armies: provArmies.map((a: any) => ({ id: a.id, name: a.name, clan_id: a.clan_id, total_strength: armyStrength.get(a.id) ?? 0 })),
        buildings: (provBuild ?? []).filter((b: any) => b.province_id === p.id)
          .map((b: any) => ({ id: b.id, name: tplMap.get(b.template_id) ?? 'Building', state: b.state })),
      };
    }
    return base;
  });
}
