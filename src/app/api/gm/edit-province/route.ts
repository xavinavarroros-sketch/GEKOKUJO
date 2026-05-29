export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


/** GM-only: edit a province's population, devastation, owner clan and state. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { provinceId, population, devastation, clanId, state } = await req.json();
  if (!provinceId) return NextResponse.json({ error: 'Missing provinceId' }, { status: 400 });

  const admin = createAdminClient();

  // Province ownership + state
  const provUpdates: Record<string, unknown> = {};
  if (clanId !== undefined) provUpdates.clan_id = clanId; // null allowed (neutral)
  if (typeof state === 'string') provUpdates.state = state;
  if (Object.keys(provUpdates).length) {
    const { error } = await admin.from('provinces').update(provUpdates).eq('id', provinceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Province resources (population / devastation)
  const resUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (population !== undefined && population !== null) resUpdates.population = Math.max(0, Number(population));
  if (devastation !== undefined && devastation !== null) {
    resUpdates.devastation_level = Math.min(100, Math.max(0, Number(devastation)));
  }
  if (Object.keys(resUpdates).length > 1) {
    const { data: existing } = await admin
      .from('province_resources').select('province_id').eq('province_id', provinceId).maybeSingle();
    if (existing) {
      await admin.from('province_resources').update(resUpdates).eq('province_id', provinceId);
    } else {
      await admin.from('province_resources').insert({ province_id: provinceId, ...resUpdates });
    }
  }

  await logEvent(admin, 'gm_edit_province', `GM reshaped a province's fate.`, {
    clan_id: clanId ?? null, actor_id: user.id, meta: { provinceId, population, devastation, state },
  });

  return NextResponse.json({ ok: true, message: 'Province updated.' });
}
