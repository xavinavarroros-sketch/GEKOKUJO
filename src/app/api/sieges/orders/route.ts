export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';


export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { siegeId, order, isAttacker } = await req.json();
  const admin = createAdminClient();

  const { data: siege } = await admin.from('sieges').select('*').eq('id', siegeId).single();
  if (!siege) return NextResponse.json({ ok: false, error: 'Siege not found' }, { status: 404 });

  const canAttack = siege.attacker_clan_id === profile.clan_id;
  const canDefend = siege.defender_clan_id === profile.clan_id;
  if (isAttacker && !canAttack && !profile.is_gm) return NextResponse.json({ ok: false, error: 'Not the attacker.' }, { status: 403 });
  if (!isAttacker && !canDefend && !profile.is_gm) return NextResponse.json({ ok: false, error: 'Not the defender.' }, { status: 403 });

  await admin.from('sieges').update(
    isAttacker ? { attacker_order: order } : { defender_order: order }
  ).eq('id', siegeId);

  return NextResponse.json({ ok: true });
}
