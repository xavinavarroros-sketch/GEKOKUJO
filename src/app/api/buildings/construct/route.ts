export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!['daimyo', 'vassal'].includes(profile.role) && !profile.is_gm) {
    return NextResponse.json({ ok: false, error: 'Only lords may build.' }, { status: 403 });
  }

  const { templateId, provinceId } = await req.json();
  const admin = createAdminClient();

  const { data: tpl } = await admin.from('building_templates').select('*').eq('id', templateId).single();
  if (!tpl) return NextResponse.json({ ok: false, error: 'Unknown building' }, { status: 404 });
  if (tpl.is_special) return NextResponse.json({ ok: false, error: 'Special buildings cannot be constructed.' }, { status: 400 });

  // verify province belongs to clan
  const { data: prov } = await admin.from('provinces').select('id,clan_id,name').eq('id', provinceId).single();
  if (!prov || (prov.clan_id !== profile.clan_id && !profile.is_gm)) {
    return NextResponse.json({ ok: false, error: 'That province is not yours.' }, { status: 403 });
  }

  // pay from clan treasury
  const { data: cr } = await admin.from('clan_resources').select('*').eq('clan_id', profile.clan_id).single();
  if (!cr || Number(cr.koku) < tpl.koku_cost || Number(cr.food) < tpl.food_cost) {
    return NextResponse.json({ ok: false, error: 'Insufficient koku or food.' }, { status: 400 });
  }
  await admin.from('clan_resources').update({
    koku: Number(cr.koku) - tpl.koku_cost, food: Number(cr.food) - tpl.food_cost,
  }).eq('clan_id', profile.clan_id);

  await admin.from('province_buildings').insert({
    province_id: provinceId, template_id: tpl.id,
    state: tpl.build_seasons > 0 ? 'constructing' : 'active',
    seasons_remaining: tpl.build_seasons,
  });

  await logEvent(admin, 'building_started', `${profile.character_name} began constructing a ${tpl.name} at ${prov.name}.`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true });
}
