'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Badge } from '@/components/ui';
import { Bell, LogOut, Menu } from 'lucide-react';
import { SEASON_ICON, SEASON_LABEL } from '@/lib/utils';
import type { Notification } from '@/types';

export function Topbar({ season, year, mobileNav }: { season?: string; year?: number; mobileNav?: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notifications').select('*').order('created_at', { ascending: false }).limit(15);
      setNotifs((data as Notification[]) ?? []);
    })();
  }, [supabase]);

  const unread = notifs.filter((n) => !n.read).length;

  async function logout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-kuro/95 backdrop-blur px-4 md:px-6 py-3">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-washi2" onClick={() => setMenuOpen((o) => !o)}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{season ? SEASON_ICON[season] : '🗾'}</span>
          <div>
            <div className="font-display text-washi text-sm leading-none">
              {season ? `${SEASON_LABEL[season]} ${year ?? ''}` : 'No active season'}
            </div>
            <div className="text-muted-foreground text-[11px]">Current Turn</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        <button onClick={() => setOpen((o) => !o)}
          className="relative rounded-md p-2 text-washi2 hover:bg-kuro2 hover:text-washi">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-aka text-washi text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-80 washi-panel rounded-lg z-50 max-h-96 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-display text-washi text-sm">Dispatches</span>
              {unread > 0 && <button onClick={markAllRead} className="text-xs text-kin hover:underline">Mark all read</button>}
            </div>
            {notifs.length === 0 ? (
              <p className="px-4 py-6 text-center text-muted-foreground text-sm">No dispatches.</p>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-border/50 ${!n.read ? 'bg-aka/5' : ''}`}>
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-aka" />}
                    <span className="text-washi text-sm font-medium">{n.title}</span>
                  </div>
                  {n.body && <p className="text-washi2 text-xs mt-0.5">{n.body}</p>}
                </div>
              ))
            )}
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={logout} title="Leave">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {menuOpen && <div className="absolute top-full left-0 right-0 md:hidden">{mobileNav}</div>}
    </header>
  );
}
