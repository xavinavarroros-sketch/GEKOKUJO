export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { positionId } = await req.json();
  if (!positionId) return NextResponse.json({ error: 'Missing positionId' }, { status: 400 });

  const admin = createAdminClient();

  // Player must not already hold a clan position
  if (profile.clan_id) {
    return NextResponse.json({ error: 'You already hold a position. Ask the Game Master to reassign you.' }, { status: 400 });
  }

  // Fetch position and verify it is free (locking check)
  const { data: pos } = await admin
    .from('clan_positions').select('*').eq('id', positionId).single();
  if (!pos) return NextResponse.json({ error: 'Position not found' }, { status: 404 });
  if (pos.occupied_by || pos.locked) {
    return NextResponse.json({ error: 'That position is already taken.' }, { status: 409 });
  }

  // Atomically claim: only succeed if still unoccupied
  const { data: claimed, error: claimErr } = await admin
    .from('clan_positions')
    .update({ occupied_by: user.id, locked: true })
    .eq('id', positionId)
    .is('occupied_by', null)
    .select()
    .single();

  if (claimErr || !claimed) {
    return NextResponse.json({ error: 'Position was just taken by another.' }, { status: 409 });
  }

  // Update profile role/clan
  await admin.from('profiles')
    .update({ clan_id: pos.clan_id, role: pos.role })
    .eq('id', user.id);

  // If daimyo, set clan.daimyo_id
  if (pos.role === 'daimyo') {
    await admin.from('clans').update({ daimyo_id: user.id }).eq('id', pos.clan_id);
  }

  // Seed personal resources for vassals
  if (pos.role === 'vassal') {
    await admin.from('player_resources')
      .upsert({ player_id: user.id, koku: 300, food: 200, horses: 20 });
  }

  await logEvent(admin, 'position_claimed',
    `${profile.character_name} took the seat of ${pos.title}.`, { clan_id: pos.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true });
}
