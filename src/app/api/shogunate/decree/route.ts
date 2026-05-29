export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** Issue a shogunal decree. Allowed for the GM or the player who holds the shogunate. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { title, body, clanId } = await req.json();
  if (!title || !body) return NextResponse.json({ error: 'A decree needs a title and a body.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: shogunate } = await admin.from('shogunate').select('*').eq('active', true).maybeSingle();

  const isShogun = !!shogunate &&
    (shogunate.shogun_player_id === user.id || shogunate.clan_id === profile.clan_id);
  if (!profile.is_gm && !isShogun) {
    return NextResponse.json({ error: 'Only the Shogun may issue decrees.' }, { status: 403 });
  }
  if (!shogunate) {
    return NextResponse.json({ error: 'There is no sitting shogunate.' }, { status: 400 });
  }

  await admin.from('decrees').insert({
    shogunate_id: shogunate.id, title, body, target_clan_id: clanId ?? null,
  });
  await admin.from('announcements').insert({ title: `Shogunal Decree: ${title}`, body, by_shogun: true });

  await logEvent(admin, 'decree_issued', `A shogunal decree was proclaimed: ${title}.`,
    { clan_id: shogunate.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true, message: 'Decree proclaimed.' });
}
