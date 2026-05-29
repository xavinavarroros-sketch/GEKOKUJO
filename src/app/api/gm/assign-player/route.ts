export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** GM-only: move a player to a clan and role. Keeps clan_positions and daimyo_id in sync. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { playerId, clanId, role } = await req.json();
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });

  const admin = createAdminClient();

  // Current state of the player, to release any held position.
  const { data: target } = await admin
    .from('profiles').select('id, character_name, clan_id, role').eq('id', playerId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  // Release any clan_position currently held by this player.
  await admin.from('clan_positions')
    .update({ occupied_by: null, locked: false })
    .eq('occupied_by', playerId);

  // If they were a daimyo, clear that clan's daimyo_id.
  if (target.clan_id) {
    await admin.from('clans').update({ daimyo_id: null }).eq('id', target.clan_id).eq('daimyo_id', playerId);
  }

  // Apply the new assignment to the profile.
  const { error } = await admin.from('profiles')
    .update({ clan_id: clanId ?? null, role: role ?? 'unassigned' })
    .eq('id', playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Wire up new position bindings.
  if (clanId) {
    if (role === 'daimyo') {
      await admin.from('clans').update({ daimyo_id: playerId }).eq('id', clanId);
      // occupy the Daimyo seat if present
      const { data: seat } = await admin.from('clan_positions')
        .select('id').eq('clan_id', clanId).eq('role', 'daimyo').maybeSingle();
      if (seat) await admin.from('clan_positions').update({ occupied_by: playerId, locked: true }).eq('id', seat.id);
    } else if (role === 'vassal' || role === 'commander') {
      // occupy first free vassal seat
      const { data: seat } = await admin.from('clan_positions')
        .select('id').eq('clan_id', clanId).neq('role', 'daimyo').is('occupied_by', null).limit(1).maybeSingle();
      if (seat) await admin.from('clan_positions').update({ occupied_by: playerId, locked: true }).eq('id', seat.id);
      // ensure the vassal has a personal resource row
      const { data: pr } = await admin.from('player_resources').select('player_id').eq('player_id', playerId).maybeSingle();
      if (!pr) await admin.from('player_resources').insert({ player_id: playerId });
    }
  }

  await logEvent(admin, 'gm_assign_player',
    `GM reassigned ${target.character_name ?? 'a retainer'} to a new station.`,
    { clan_id: clanId ?? null, actor_id: user.id, meta: { playerId, role } });

  return NextResponse.json({ ok: true, message: 'Player reassigned.' });
}
