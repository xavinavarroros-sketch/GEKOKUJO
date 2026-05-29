export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent } from '@/lib/game-engine';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!['daimyo', 'vassal'].includes(profile.role) && !profile.is_gm) {
    return NextResponse.json({ ok: false, error: 'Only lords may raise armies.' }, { status: 403 });
  }

  const { name, provinceId, commanderId, unitIds } = await req.json();
  const admin = createAdminClient();

  const { data: army, error } = await admin.from('armies').insert({
    name, clan_id: profile.clan_id, commander_id: commanderId || user.id,
    current_province_id: provinceId, state: 'idle', posture: 'normal_march',
  }).select().single();
  if (error || !army) return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });

  if (Array.isArray(unitIds) && unitIds.length) {
    await admin.from('units').update({ army_id: army.id })
      .in('id', unitIds).eq('clan_id', profile.clan_id);
  }

  // promote commander role if they were a vassal/unassigned and not the daimyo
  if (commanderId && commanderId !== user.id) {
    const { data: cmdr } = await admin.from('profiles').select('role').eq('id', commanderId).single();
    if (cmdr && cmdr.role === 'unassigned') {
      await admin.from('profiles').update({ role: 'commander' }).eq('id', commanderId);
    }
  }

  await logEvent(admin, 'army_created', `${profile.character_name} assembled the army "${name}".`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true, armyId: army.id });
}
