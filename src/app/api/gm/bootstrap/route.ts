import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isConfiguredGameMasterEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Promotes the configured Game Master account automatically.
 * Set GAME_MASTER_EMAIL or NEXT_PUBLIC_GAME_MASTER_EMAIL in Railway.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });
  }

  if (!isConfiguredGameMasterEmail(user.email)) {
    return NextResponse.json({ ok: true, isGm: false });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ is_gm: true, role: 'gm', clan_id: null, approved: true, blocked: false })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, isGm: true });
}
