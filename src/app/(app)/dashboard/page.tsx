import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { ResourceRow } from '@/components/shared/resource-cards';
import { ROLE_LABEL, fmt, seasonLabel } from '@/lib/utils';
import { Swords, Map as MapIcon, AlertTriangle, Crown, Megaphone } from 'lucide-react';
import Link from 'next/link';


export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { profile } = await getSessionProfile();
  const supabase = createClient();

  const [{ data: season }, { data: announcements }] = await Promise.all([
    supabase.from('seasons').select('*').eq('is_current', true).maybeSingle(),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
  ]);

  let clan: any = null;
  let clanRes: any = null;
  let provinces: any[] = [];
  let armies: any[] = [];
  let playerRes: any = null;

  if (profile?.clan_id) {
    const [{ data: c }, { data: cr }, { data: prov }, { data: arm }, { data: pr }] = await Promise.all([
      supabase.from('clans').select('*').eq('id', profile.clan_id).single(),
      supabase.from('clan_resources').select('*').eq('clan_id', profile.clan_id).maybeSingle(),
      supabase.from('provinces').select('id,name,state').eq('clan_id', profile.clan_id),
      supabase.from('armies').select('id,name,state').eq('clan_id', profile.clan_id),
      supabase.from('player_resources').select('*').eq('player_id', profile!.id).maybeSingle(),
    ]);
    clan = c; clanRes = cr; provinces = prov ?? []; armies = arm ?? []; playerRes = pr;
  }

  const isDaimyo = profile?.role === 'daimyo';
  const res = isDaimyo ? clanRes : playerRes;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-washi">Hall of {profile?.character_name}</h1>
          <p className="text-washi2 flex items-center gap-2 mt-1">
            <Badge tone="gold">{ROLE_LABEL[profile?.is_gm ? 'gm' : profile?.role ?? 'unassigned']}</Badge>
            {clan && <Badge tone="default"><span className="w-2 h-2 rounded-full mr-1" style={{ background: clan.color }} />{clan.name} Clan</Badge>}
            {clan?.controls_shogunate && <Badge tone="red"><Crown className="h-3 w-3 mr-1" />Shogunate</Badge>}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-kin text-lg">{seasonLabel(season?.season, season?.year)}</div>
          <div className="text-muted-foreground text-xs">Turn {season?.turn_number ?? '—'}</div>
        </div>
      </div>

      {res && (
        <ResourceRow
          koku={res.koku ?? 0}
          food={res.food ?? 0}
          population={isDaimyo ? (clanRes?.total_population ?? 0) : 0}
          horses={res.horses ?? 0}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-kin" />Proclamations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(announcements ?? []).length === 0 && <p className="text-muted-foreground text-sm">The heralds are silent.</p>}
            {(announcements ?? []).map((a: any) => (
              <div key={a.id} className="border-l-2 border-aka pl-3">
                <div className="font-display text-washi">{a.title}</div>
                <p className="text-washi2 text-sm">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Domain at a Glance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <StatLine icon={MapIcon} label="Provinces" value={fmt(provinces.length)} href="/map" />
            <StatLine icon={Swords} label="Armies" value={fmt(armies.length)} href="/army" />
            <StatLine icon={AlertTriangle} label="Provinces at war"
              value={fmt(provinces.filter((p) => p.state === 'at_war' || p.state === 'under_siege').length)} />
            {clan && <StatLine icon={Crown} label="Clan prestige" value={fmt(clan.prestige)} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <QuickLink href="/map" title="Survey the Realm" desc="Open the map of Japan" />
        <QuickLink href="/clans" title="The Great Houses" desc="Study rival clans" />
        {isDaimyo
          ? <QuickLink href="/nation" title="Govern the Clan" desc="Resources, taxes, laws" />
          : <QuickLink href="/vassal" title="Tend Your Domain" desc="Your lands and levies" />}
      </div>
    </div>
  );
}

function StatLine({ icon: Icon, label, value, href }: any) {
  const inner = (
    <div className="flex items-center justify-between rounded-md bg-kuro2 px-3 py-2 hover:bg-muted transition-colors">
      <span className="flex items-center gap-2 text-washi2 text-sm"><Icon className="h-4 w-4 text-kin" />{label}</span>
      <span className="font-display text-washi">{value}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="hover:gold-edge transition-all cursor-pointer">
        <CardContent>
          <div className="font-display text-washi text-lg">{title}</div>
          <p className="text-washi2 text-sm">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
