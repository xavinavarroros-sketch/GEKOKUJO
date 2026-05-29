export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** GM-only: adjust a clan's treasury, prestige and political status. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { clanId, addKoku = 0, addFood = 0, prestige, status } = await req.json();
  if (!clanId) return NextResponse.json({ error: 'Missing clanId' }, { status: 400 });

  const admin = createAdminClient();

  // Treasury adjustments
  if (Number(addKoku) !== 0 || Number(addFood) !== 0) {
    const { data: cr } = await admin
      .from('clan_resources').select('*').eq('clan_id', clanId).maybeSingle();
    if (cr) {
      await admin.from('clan_resources').update({
        koku: Math.max(0, Number(cr.koku) + Number(addKoku)),
        food: Math.max(0, Number(cr.food) + Number(addFood)),
        updated_at: new Date().toISOString(),
      }).eq('clan_id', clanId);
    } else {
      await admin.from('clan_resources').insert({
        clan_id: clanId, koku: Math.max(0, Number(addKoku)), food: Math.max(0, Number(addFood)),
      });
    }
  }

  // Clan fields
  const updates: Record<string, unknown> = {};
  if (typeof prestige === 'number') updates.prestige = prestige;
  if (typeof status === 'string') updates.status = status;
  if (Object.keys(updates).length) {
    const { error } = await admin.from('clans').update(updates).eq('id', clanId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logEvent(admin, 'gm_edit_clan', `GM adjusted clan affairs.`, {
    clan_id: clanId, actor_id: user.id, meta: { addKoku, addFood, prestige, status },
  });

  return NextResponse.json({ ok: true, message: 'Clan updated.' });
}
