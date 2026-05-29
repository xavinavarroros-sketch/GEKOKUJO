export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notifyClan } from '@/lib/game-engine';


/** GM-only: appoint a clan/player to the shogunate, or vacate the seat. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { clanId, playerId } = await req.json();
  const admin = createAdminClient();

  // Deactivate any current shogunate and clear the flag on all clans.
  await admin.from('shogunate').update({ active: false }).eq('active', true);
  await admin.from('clans').update({ controls_shogunate: false }).eq('controls_shogunate', true);

  if (!clanId) {
    await logEvent(admin, 'shogun_vacated', 'The seat of the Shogun stands empty.', { actor_id: user.id });
    return NextResponse.json({ ok: true, message: 'The shogunate is now vacant.' });
  }

  const { error } = await admin.from('shogunate').insert({
    clan_id: clanId, shogun_player_id: playerId ?? null, active: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('clans').update({ controls_shogunate: true, status: 'shogunate' }).eq('id', clanId);

  const { data: clan } = await admin.from('clans').select('name').eq('id', clanId).maybeSingle();
  await notifyClan(admin, clanId, 'shogun', 'The Shogunate is yours', 'Your clan now holds the title of Shogun.');
  await admin.from('announcements').insert({
    title: 'A New Shogun Rises',
    body: `The ${clan?.name ?? 'ruling'} Clan has been named to the shogunate. All daimyo take heed.`,
    by_shogun: false,
  });
  await logEvent(admin, 'shogun_appointed', `The ${clan?.name ?? 'a'} Clan was raised to the shogunate.`,
    { clan_id: clanId, actor_id: user.id });

  return NextResponse.json({ ok: true, message: 'Shogun appointed.' });
}
