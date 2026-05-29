'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';
import {
  LayoutDashboard, Map, Flag, Landmark, Shield, Swords, Hammer, Users,
  Skull, Crown, Eye, Image as ImageIcon, Settings,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/clans', label: 'Clans', icon: Flag },
  { href: '/nation', label: 'Nation', icon: Landmark, roles: ['daimyo', 'gm'] },
  { href: '/vassal', label: 'My Domain', icon: Shield, roles: ['vassal', 'gm'] },
  { href: '/army', label: 'Armies', icon: Swords, roles: ['daimyo', 'vassal', 'commander', 'gm'] },
  { href: '/troops', label: 'Troops', icon: Users, roles: ['daimyo', 'vassal', 'gm'] },
  { href: '/construction', label: 'Build', icon: Hammer, roles: ['daimyo', 'vassal', 'gm'] },
  { href: '/battles', label: 'Battles', icon: Swords },
  { href: '/espionage', label: 'Espionage', icon: Eye, roles: ['daimyo', 'gm'] },
  { href: '/shogunate', label: 'Shogunate', icon: Crown },
  { href: '/cemetery', label: 'Cemetery', icon: Skull },
  { href: '/multimedia', label: 'Lore', icon: ImageIcon },
  { href: '/gm', label: 'GM', icon: Settings, roles: ['gm'] },
];

export function MobileNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const role = profile.is_gm ? 'gm' : profile.role;
  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));
  return (
    <div className="washi-panel border-t border-border max-h-[70vh] overflow-y-auto grid grid-cols-2 gap-1 p-2">
      {visible.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              active ? 'bg-aka/20 text-washi' : 'text-washi2')}>
            <Icon className="h-4 w-4" /> {item.label}
          </Link>
        );
      })}
    </div>
  );
}
