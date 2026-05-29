export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notifyClan } from '@/lib/game-engine';


/** GM-only: resolve a siege. outcome: 'holds' | 'falls'. */
export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile?.is_gm) {
    return NextResponse.json({ error: 'Game Master only.' }, { status: 403 });
  }

  const { siegeId, outcome } = await req.json();
  if (!siegeId) return NextResponse.json({ error: 'Missing siegeId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: s } = await admin.from('sieges').select('*').eq('id', siegeId).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Siege not found' }, { status: 404 });

  const falls = outcome === 'falls';
  const newState = falls ? 'castle_fell' : 'castle_holds';

  await admin.from('sieges').update({ state: newState }).eq('id', siegeId);

  if (falls) {
    // Castle taken: province transfers to attacker, devastation rises, population suffers.
    if (s.attacker_clan_id) {
      await admin.from('provinces').update({ clan_id: s.attacker_clan_id, state: 'devastated' }).eq('id', s.province_id);
    }
    const { data: pr } = await admin.from('province_resources').select('*').eq('province_id', s.province_id).maybeSingle();
    if (pr) {
      await admin.from('province_resources').update({
        population: Math.max(0, Math.round(Number(pr.population) * 0.85)),
        devastation_level: Math.min(100, Number(pr.devastation_level) + 25),
        updated_at: new Date().toISOString(),
      }).eq('province_id', s.province_id);
    }
    if (s.attacker_clan_id) await notifyClan(admin, s.attacker_clan_id, 'siege', 'The castle has fallen!', 'Your siege succeeded. The province is yours.');
    if (s.defender_clan_id) await notifyClan(admin, s.defender_clan_id, 'siege', 'Your castle has fallen!', 'The walls were breached. The province is lost.');
  } else {
    await admin.from('provinces').update({ state: 'normal' }).eq('id', s.province_id);
    if (s.attacker_clan_id) await notifyClan(admin, s.attacker_clan_id, 'siege', 'The siege broke', 'The castle held against your assault.');
    if (s.defender_clan_id) await notifyClan(admin, s.defender_clan_id, 'siege', 'Your castle holds!', 'Your defenders repelled the siege.');
  }

  await logEvent(admin, 'siege_resolved',
    falls ? 'A castle fell to siege.' : 'A castle withstood the siege.',
    { clan_id: falls ? s.attacker_clan_id : s.defender_clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true, message: falls ? 'The castle has fallen.' : 'The castle holds.' });
}
