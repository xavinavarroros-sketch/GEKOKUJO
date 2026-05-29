import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';
import { MobileNav } from '@/components/shared/mobile-nav';


export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect('/auth/login');
  if (!profile) redirect('/auth/login');
  if (!profile.clan_id && !profile.is_gm) redirect('/auth/choose-clan');

  const supabase = createClient();
  const { data: season } = await supabase
    .from('seasons').select('*').eq('is_current', true).maybeSingle();

  let clanName: string | undefined;
  let clanColor: string | undefined;
  if (profile.clan_id) {
    const { data: clan } = await supabase
      .from('clans').select('name,color').eq('id', profile.clan_id).single();
    clanName = clan?.name;
    clanColor = clan?.color;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} clanName={clanName} clanColor={clanColor} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar season={season?.season} year={season?.year} mobileNav={<MobileNav profile={profile} />} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
