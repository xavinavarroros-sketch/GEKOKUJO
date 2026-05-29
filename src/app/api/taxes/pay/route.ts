export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { logEvent, notify } from '@/lib/game-engine';


export async function POST() {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: taxes } = await admin.from('taxes').select('*').eq('target_player_id', user.id);
  if (!taxes || taxes.length === 0) return NextResponse.json({ error: 'No tribute owed.' }, { status: 400 });

  const kokuDue = taxes.reduce((s: number, t: any) => s + Number(t.koku_due || 0), 0);
  const foodDue = taxes.reduce((s: number, t: any) => s + Number(t.food_due || 0), 0);

  const { data: pr } = await admin.from('player_resources').select('*').eq('player_id', user.id).single();
  if (!pr || pr.koku < kokuDue || pr.food < foodDue) {
    return NextResponse.json({ error: 'You lack the resources to pay this tribute.' }, { status: 400 });
  }

  // deduct from vassal
  await admin.from('player_resources').update({
    koku: pr.koku - kokuDue, food: pr.food - foodDue,
  }).eq('player_id', user.id);

  // credit to clan treasury
  if (profile.clan_id) {
    const { data: cr } = await admin.from('clan_resources').select('*').eq('clan_id', profile.clan_id).single();
    if (cr) {
      await admin.from('clan_resources').update({
        koku: Number(cr.koku) + kokuDue, food: Number(cr.food) + foodDue,
      }).eq('clan_id', profile.clan_id);
    }
    // notify daimyo
    const { data: clan } = await admin.from('clans').select('daimyo_id').eq('id', profile.clan_id).single();
    if (clan?.daimyo_id) {
      await notify(admin, clan.daimyo_id, 'tax', 'Tribute received',
        `${profile.character_name} paid ${kokuDue} koku and ${foodDue} food.`, profile.clan_id);
    }
  }

  await admin.from('tax_payments').insert(taxes.map((t: any) => ({
    tax_id: t.id, clan_id: t.clan_id, payer_id: user.id,
    koku_paid: t.koku_due, food_paid: t.food_due, paid: true,
  })));

  await logEvent(admin, 'tax_paid', `${profile.character_name} paid tribute of ${kokuDue} koku.`,
    { clan_id: profile.clan_id, actor_id: user.id });

  return NextResponse.json({ ok: true });
}
