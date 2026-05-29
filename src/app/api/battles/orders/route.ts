export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { battleId, orders } = await req.json();
  if (!Array.isArray(orders) || orders.length === 0 || orders.length > 3) {
    return NextResponse.json({ ok: false, error: 'Choose 1 to 3 orders.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: battle } = await admin.from('battles').select('*').eq('id', battleId).single();
  if (!battle) return NextResponse.json({ ok: false, error: 'Battle not found' }, { status: 404 });

  const isAttacker = battle.attacker_clan_id === profile.clan_id;
  const isDefender = battle.defender_clan_id === profile.clan_id;
  if (!isAttacker && !isDefender && !profile.is_gm) {
    return NextResponse.json({ ok: false, error: 'You are not part of this battle.' }, { status: 403 });
  }

  // upsert orders for this clan
  const { data: existing } = await admin.from('battle_orders')
    .select('id').eq('battle_id', battleId).eq('clan_id', profile.clan_id).maybeSingle();

  if (existing) {
    await admin.from('battle_orders').update({ orders, submitted: true }).eq('id', existing.id);
  } else {
    await admin.from('battle_orders').insert({
      battle_id: battleId, player_id: user.id, clan_id: profile.clan_id,
      is_attacker: isAttacker, orders, submitted: true,
    });
  }

  return NextResponse.json({ ok: true });
}
