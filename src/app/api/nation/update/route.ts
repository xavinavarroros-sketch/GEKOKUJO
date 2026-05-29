export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (profile.role !== 'daimyo' && !profile.is_gm) {
    return NextResponse.json({ error: 'Only a Daimyo may govern the clan.' }, { status: 403 });
  }
  if (!profile.clan_id) return NextResponse.json({ error: 'No clan' }, { status: 400 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.laws === 'string') updates.laws = body.laws;
  if (typeof body.color === 'string') updates.color = body.color;
  if (typeof body.banner_url === 'string') updates.banner_url = body.banner_url;
  if (typeof body.description === 'string') updates.description = body.description;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('clans').update(updates).eq('id', profile.clan_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (updates.laws) {
    await admin.from('clan_laws').insert({ clan_id: profile.clan_id, content: String(updates.laws), edited_by: user.id });
  }
  await logEvent(admin, 'clan_updated', `${profile.character_name} issued a clan decree.`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true });
}
