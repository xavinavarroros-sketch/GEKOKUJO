export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** GM-only: post a global announcement to all players. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { title, body } = await req.json();
  if (!title || !body) return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('announcements').insert({ title, body, by_shogun: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent(admin, 'announcement', `GM announcement: ${title}.`, { actor_id: user.id });
  return NextResponse.json({ ok: true, message: 'Announcement posted.' });
}
