export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** GM-only: register a media/lore asset (image URL + optional text). */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { section, title, url, body } = await req.json();
  if (!url) return NextResponse.json({ error: 'An image URL is required.' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('media_assets').insert({
    section: section ?? 'lore', title: title ?? null, url, body: body ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent(admin, 'media_add', `GM added media to the "${section ?? 'lore'}" gallery.`, { actor_id: user.id });
  return NextResponse.json({ ok: true, message: 'Media added.' });
}
