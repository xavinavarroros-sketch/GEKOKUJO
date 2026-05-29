export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notify } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (profile.role !== 'daimyo' && !profile.is_gm) {
    return NextResponse.json({ error: 'Only a Daimyo may levy taxes.' }, { status: 403 });
  }

  const { clanId, taxes } = await req.json();
  if (clanId !== profile.clan_id && !profile.is_gm) {
    return NextResponse.json({ error: 'Not your clan' }, { status: 403 });
  }

  const admin = createAdminClient();
  // Clear existing per-player taxes for this clan, then re-create
  await admin.from('taxes').delete().eq('clan_id', clanId).not('target_player_id', 'is', null);

  const rows = Object.entries(taxes as Record<string, { koku: number; food: number }>)
    .filter(([, v]) => (v.koku ?? 0) > 0 || (v.food ?? 0) > 0)
    .map(([playerId, v]) => ({
      clan_id: clanId, target_player_id: playerId,
      koku_due: v.koku ?? 0, food_due: v.food ?? 0,
    }));

  if (rows.length) {
    await admin.from('taxes').insert(rows);
    for (const r of rows) {
      await notify(admin, r.target_player_id, 'tax', 'A levy has been demanded',
        `Your lord demands ${r.koku_due} koku and ${r.food_due} food this season.`, clanId);
    }
  }

  await logEvent(admin, 'taxes_set', `${profile.character_name} revised the clan levies.`,
    { clan_id: clanId, actor_id: user.id });

  return NextResponse.json({ ok: true });
}
