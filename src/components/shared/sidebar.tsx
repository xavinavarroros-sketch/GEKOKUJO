'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, ROLE_LABEL } from '@/lib/utils';
import type { Profile } from '@/types';
import {
  LayoutDashboard, Map, Users, Landmark, Shield, Swords, Hammer,
  Skull, Crown, Eye, ScrollText, Image as ImageIcon, Settings, Flag,
} from 'lucide-react';

interface NavItem { href: string; label: string; icon: any; roles?: string[]; }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Map of Japan', icon: Map },
  { href: '/clans', label: 'Clans', icon: Flag },
  { href: '/nation', label: 'Nation / Clan', icon: Landmark, roles: ['daimyo', 'gm'] },
  { href: '/vassal', label: 'My Domain', icon: Shield, roles: ['vassal', 'gm'] },
  { href: '/army', label: 'Armies', icon: Swords, roles: ['daimyo', 'vassal', 'commander', 'gm'] },
  { href: '/troops', label: 'Troops', icon: Users, roles: ['daimyo', 'vassal', 'gm'] },
  { href: '/construction', label: 'Construction', icon: Hammer, roles: ['daimyo', 'vassal', 'gm'] },
  { href: '/battles', label: 'Battles & Sieges', icon: Swords },
  { href: '/espionage', label: 'Espionage', icon: Eye, roles: ['daimyo', 'gm'] },
  { href: '/shogunate', label: 'Shogunate', icon: Crown },
  { href: '/cemetery', label: 'Cemetery', icon: Skull },
  { href: '/multimedia', label: 'Lore & Media', icon: ImageIcon },
  { href: '/gm', label: 'Game Master', icon: Settings, roles: ['gm'] },
];

export function Sidebar({ profile, clanName, clanColor }: { profile: Profile; clanName?: string; clanColor?: string }) {
  const pathname = usePathname();
  const role = profile.is_gm ? 'gm' : profile.role;

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-kuro h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="hanko-seal w-9 h-9 text-lg">戦</span>
          <div>
            <div className="font-display text-washi text-sm leading-tight">Sengoku Jidai</div>
            <div className="text-kin text-[10px] tracking-widest">下克上</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-aka/20 text-washi border-l-2 border-aka' : 'text-washi2 hover:bg-kuro2 hover:text-washi'
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: clanColor || '#5b4636' }} />
          <div className="min-w-0">
            <div className="text-washi text-sm truncate">{profile.character_name}</div>
            <div className="text-muted-foreground text-xs truncate">
              {ROLE_LABEL[role]} {clanName ? `· ${clanName}` : ''}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
