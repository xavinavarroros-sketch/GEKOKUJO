import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isConfiguredGameMasterEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RegisterPayload = {
  email?: string;
  password?: string;
  characterName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const characterName = body.characterName?.trim() || 'Wandering Ronin';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const isGm = isConfiguredGameMasterEmail(email);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { character_name: characterName },
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Could not create user.' }, { status: 500 });
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: user.id,
      email,
      character_name: characterName,
      role: isGm ? 'gm' : 'unassigned',
      clan_id: null,
      is_gm: isGm,
      approved: true,
      blocked: false,
    });

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    if (isGm) {
      await admin.from('player_resources').upsert({ player_id: user.id, koku: 0, food: 0, horses: 0 });
    }

    return NextResponse.json({ ok: true, emailConfirmed: true, isGm });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Registration failed.' }, { status: 500 });
  }
}
