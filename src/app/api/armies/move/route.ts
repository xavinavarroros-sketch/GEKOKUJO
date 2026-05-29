export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { armyId, destinationId, posture } = await req.json();
  const admin = createAdminClient();

  const { data: army } = await admin.from('armies').select('*').eq('id', armyId).single();
  if (!army) return NextResponse.json({ ok: false, error: 'Army not found' }, { status: 404 });

  // Authorization: must be the commander, the clan's daimyo, or GM
  const isCommander = army.commander_id === user.id;
  const isDaimyo = profile.role === 'daimyo' && army.clan_id === profile.clan_id;
  if (!isCommander && !isDaimyo && !profile.is_gm) {
    return NextResponse.json({ ok: false, error: 'You do not command this army.' }, { status: 403 });
  }

  // queue the move; resolution happens at season advance
  const updates: any = { posture: posture ?? army.posture };
  if (destinationId && destinationId !== army.current_province_id) {
    updates.destination_province_id = destinationId;
    updates.state = posture === 'forced_march' ? 'marching' : 'marching';
    updates.seasons_to_arrival = posture === 'forced_march' ? 1 : 2;
    // record a movement order
    const { data: season } = await admin.from('seasons').select('id').eq('is_current', true).maybeSingle();
    await admin.from('movements').insert({
      army_id: armyId, from_province_id: army.current_province_id,
      to_province_id: destinationId, posture: posture ?? army.posture, season_id: season?.id,
    });
  } else {
    updates.destination_province_id = null;
    updates.state = 'idle';
    updates.seasons_to_arrival = 0;
  }

  await admin.from('armies').update(updates).eq('id', armyId);
  await logEvent(admin, 'army_orders', `${profile.character_name} issued orders to "${army.name}".`,
    { clan_id: army.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true });
}
