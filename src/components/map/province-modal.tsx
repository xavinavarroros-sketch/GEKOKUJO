'use client';
import { useState } from 'react';
import type { PublicProvinceView } from '@/lib/visibility';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Button, Input, Label,
} from '@/components/ui';
import { fmt, TROOP_HINT_LABEL } from '@/lib/utils';
import { Castle, Flame, Users, Coins, Wheat, Rss, ShieldAlert, Eye, EyeOff, Crown, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const STATE_LABEL: Record<string, string> = {
  normal: 'At Peace', at_war: 'At War', under_siege: 'Under Siege',
  rebellion: 'In Rebellion', devastated: 'Devastated',
};
const STATE_TONE: Record<string, 'default' | 'red' | 'gold' | 'green' | 'muted'> = {
  normal: 'green', at_war: 'red', under_siege: 'red', rebellion: 'gold', devastated: 'muted',
};

export function ProvinceModal({
  province, isGm, myClanId, onClose, onChange,
}: {
  province: PublicProvinceView;
  isGm: boolean;
  myClanId: string | null;
  onClose: () => void;
  onChange: () => void;
}) {
  const [spying, setSpying] = useState(false);
  const d = province.details;
  const isMine = province.clan_id && province.clan_id === myClanId;
  const isEnemy = province.clan_id && province.clan_id !== myClanId;

  async function sendNinja() {
    setSpying(true);
    const res = await fetch('/api/ninja/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provinceId: province.id }),
    });
    const json = await res.json();
    setSpying(false);
    if (!res.ok) return toast.error(json.error || 'Mission failed to launch');
    toast.success(json.message || 'Shinobi dispatched into the shadows.');
    onChange();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {province.clan_color && <span className="w-4 h-4 rounded-full" style={{ background: province.clan_color }} />}
            <DialogTitle className="font-display text-2xl text-washi flex items-center gap-2">
              <MapPin className="h-5 w-5 text-kin" /> {province.name}
            </DialogTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge tone={STATE_TONE[province.state]}>{STATE_LABEL[province.state] ?? province.state}</Badge>
            {province.clan_name
              ? <Badge tone="default">{province.clan_name} Clan</Badge>
              : <Badge tone="muted">Unclaimed</Badge>}
            {province.has_main_castle && <Badge tone="gold"><Castle className="h-3 w-3 mr-1" />Castle</Badge>}
            {province.region && <Badge tone="muted">{province.region} Region</Badge>}
            {province.visible ? <Badge tone="green"><Eye className="h-3 w-3 mr-1" />Full Intel</Badge>
              : <Badge tone="muted"><EyeOff className="h-3 w-3 mr-1" />Limited Intel</Badge>}
          </div>
        </DialogHeader>

        {province.visible && d ? (
          <div className="space-y-4">
            {d.daimyo_name && (
              <div className="flex items-center gap-2 text-washi">
                <Crown className="h-4 w-4 text-kin" /> Daimyo: <span className="font-display">{d.daimyo_name}</span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat icon={Users} label="Population" value={fmt(d.population)} />
              <Stat icon={Coins} label="Koku / season" value={fmt(d.koku_output)} />
              <Stat icon={Wheat} label="Food / season" value={fmt(d.food_output)} />
              <Stat icon={Rss} label="Horses / season" value={fmt(d.horse_output)} />
              <Stat icon={ShieldAlert} label="Defense" value={fmt(d.defensive_value)} />
              <Stat icon={Flame} label="Devastation" value={`${d.devastation_level}%`} />
              <Stat icon={Castle} label="Strategic" value={fmt(d.strategic_value)} />
              {d.special_building && <Stat icon={Crown} label="Special" value={d.special_building} />}
            </div>

            <Section title="Subprovinces">
              {d.subprovinces.length === 0 ? <Empty>No subprovinces recorded.</Empty> :
                d.subprovinces.map((s) => (
                  <Row key={s.id}>
                    <span className="text-washi">{s.name}</span>
                    <span className="flex gap-2">
                      <Badge tone={s.type === 'central' ? 'gold' : 'default'}>{s.type}</Badge>
                      {s.in_rebellion && <Badge tone="red">Rebellion</Badge>}
                    </span>
                  </Row>
                ))}
            </Section>

            <Section title="Armies Present">
              {d.armies.length === 0 ? <Empty>No armies stationed here.</Empty> :
                d.armies.map((a) => (
                  <Row key={a.id}>
                    <span className="text-washi">{a.name}</span>
                    <Badge tone={a.clan_id === myClanId ? 'green' : 'red'}>{fmt(a.total_strength)} troops</Badge>
                  </Row>
                ))}
            </Section>

            <Section title="Buildings">
              {d.buildings.length === 0 ? <Empty>No buildings constructed.</Empty> :
                d.buildings.map((b) => (
                  <Row key={b.id}>
                    <span className="text-washi">{b.name}</span>
                    <Badge tone={b.state === 'active' ? 'green' : b.state === 'constructing' ? 'gold' : 'muted'}>{b.state}</Badge>
                  </Row>
                ))}
            </Section>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-kuro2 p-4 text-center">
              <EyeOff className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-washi2 text-sm">
                The fog of war shrouds this province. Only public information is visible.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={Users} label="Military presence" value={TROOP_HINT_LABEL[province.troop_hint]} />
              <Stat icon={Castle} label="Castle" value={province.has_main_castle ? 'Present' : 'None'} />
            </div>
            {isEnemy && (
              <div className="rounded-md border border-kin2 bg-kin/5 p-3">
                <p className="text-washi2 text-sm mb-2">
                  Dispatch a shinobi to uncover this province&apos;s secrets for the current season.
                </p>
                <Button variant="gold" size="sm" onClick={sendNinja} disabled={spying}>
                  <Eye className="h-4 w-4" /> {spying ? 'Infiltrating…' : 'Send Ninja (100 koku)'}
                </Button>
              </div>
            )}
          </div>
        )}

        {isGm && (
          <div className="mt-4 pt-4 border-t border-border">
            <Label>Game Master — manage this province in the GM panel</Label>
            <a href="/gm" className="text-kin text-sm hover:underline">Open GM controls →</a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-md bg-kuro2 border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] uppercase tracking-wide mb-0.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display text-washi text-sm">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-kin text-sm mb-1.5">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between rounded bg-kuro2 px-3 py-1.5 text-sm">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-xs italic px-1">{children}</p>;
}
