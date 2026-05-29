export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { buildMapView } from '@/lib/visibility';


export async function GET() {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = createAdminClient();
  const view = await buildMapView(admin, profile.clan_id, profile.is_gm);
  return NextResponse.json({ provinces: view, myClanId: profile.clan_id, isGm: profile.is_gm });
}
