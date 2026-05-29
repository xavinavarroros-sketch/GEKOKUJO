export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** GM-only: entomb a character in the cemetery. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const b = await req.json();
  if (!b.character_name) return NextResponse.json({ error: 'A name is required.' }, { status: 400 });

  const admin = createAdminClient();
  let clanName: string | null = null;
  if (b.clan_id) {
    const { data: c } = await admin.from('clans').select('name').eq('id', b.clan_id).maybeSingle();
    clanName = c?.name ?? null;
  }

  const { error } = await admin.from('graveyard').insert({
    character_name: b.character_name,
    clan_id: b.clan_id ?? null,
    clan_name: clanName,
    title: b.title ?? null,
    cause: b.cause ?? 'battle',
    season_label: b.season_label ?? null,
    executed_by: b.executed_by ?? null,
    location: b.location ?? null,
    image_url: b.image_url ?? null,
    notes: b.notes ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent(admin, 'graveyard_add', `${b.character_name} was laid to rest (${b.cause ?? 'battle'}).`,
    { clan_id: b.clan_id ?? null, actor_id: user.id });

  return NextResponse.json({ ok: true, message: 'Entombed in the cemetery.' });
}
