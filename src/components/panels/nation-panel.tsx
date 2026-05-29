'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Input, Textarea, Label, Badge,
} from '@/components/ui';
import { ResourceRow } from '@/components/shared/resource-cards';
import { fmt } from '@/lib/utils';
import { Coins, Wheat, Users, Landmark, Scroll, Palette, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export function NationPanel({ clan, resources, provinces, provinceResources, members, taxes, armies }: any) {
  const router = useRouter();
  const [laws, setLaws] = useState(clan?.laws ?? '');
  const [color, setColor] = useState(clan?.color ?? '#a01f1f');
  const [banner, setBanner] = useState(clan?.banner_url ?? '');
  const [saving, setSaving] = useState(false);

  const resMap = new Map(provinceResources.map((r: any) => [r.province_id, r]));
  const totalKokuOut = provinceResources.reduce((s: number, r: any) => s + Number(r.koku_output || 0), 0);
  const totalFoodOut = provinceResources.reduce((s: number, r: any) => s + Number(r.food_output || 0), 0);

  // estimate maintenance
  const vassals = members.filter((m: any) => m.role === 'vassal');

  async function saveClan(payload: any) {
    setSaving(true);
    const res = await fetch('/api/nation/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(json.error || 'Failed to save');
    toast.success('Decree recorded.');
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded-full" style={{ background: clan?.color }} />
        <h1 className="font-display text-3xl text-washi">{clan?.name} Clan — Governance</h1>
      </div>

      <ResourceRow
        koku={resources?.koku ?? 0}
        food={resources?.food ?? 0}
        population={resources?.total_population ?? 0}
        horses={resources?.horses ?? 0}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Landmark className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="provinces"><Shield className="h-4 w-4" />Provinces</TabsTrigger>
          <TabsTrigger value="taxes"><Coins className="h-4 w-4" />Taxes</TabsTrigger>
          <TabsTrigger value="laws"><Scroll className="h-4 w-4" />Laws</TabsTrigger>
          <TabsTrigger value="banner"><Palette className="h-4 w-4" />Banner</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Seasonal Production</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Stat icon={Coins} label="Koku income" value={`+${fmt(totalKokuOut)}`} />
                <Stat icon={Wheat} label="Food income" value={`+${fmt(totalFoodOut)}`} />
                <Stat icon={Shield} label="Armies fielded" value={fmt(armies.length)} />
                <Stat icon={Users} label="Vassals" value={fmt(vassals.length)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Retainers</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-1.5 text-sm">
                    <span className="text-washi">{m.character_name}</span>
                    <Badge tone={m.role === 'daimyo' ? 'gold' : 'default'}>{m.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="provinces">
          <Card>
            <CardHeader><CardTitle>Clan Territory</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {provinces.length === 0 && <p className="text-muted-foreground text-sm">Your clan holds no provinces.</p>}
              {provinces.map((p: any) => {
                const r: any = resMap.get(p.id);
                return (
                  <div key={p.id} className="rounded-md bg-kuro2 border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-washi">{p.name}</span>
                      <Badge tone={p.state === 'normal' ? 'green' : 'red'}>{p.state}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <span className="text-washi2">Pop: <b className="text-washi">{fmt(r?.population)}</b></span>
                      <span className="text-washi2">Koku: <b className="text-kin">{fmt(r?.koku_output)}</b></span>
                      <span className="text-washi2">Food: <b className="text-green-300">{fmt(r?.food_output)}</b></span>
                      <span className="text-washi2">Devastation: <b className="text-aka">{r?.devastation_level ?? 0}%</b></span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes">
          <Card>
            <CardHeader><CardTitle>Tributes & Levies</CardTitle></CardHeader>
            <CardContent>
              <p className="text-washi2 text-sm mb-3">Demand koku and rice from your vassals each season.</p>
              <TaxEditor clanId={clan.id} vassals={vassals} taxes={taxes} onSaved={() => router.refresh()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="laws">
          <Card>
            <CardHeader><CardTitle>The Laws of {clan?.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={laws} onChange={(e) => setLaws(e.target.value)} rows={8}
                placeholder="Inscribe the laws and edicts that bind your clan…" />
              <Button variant="gold" disabled={saving} onClick={() => saveClan({ laws })}>Promulgate Laws</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banner">
          <Card>
            <CardHeader><CardTitle>Clan Banner & Colors</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <Label>Clan Color</Label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-20 rounded border border-border bg-input" />
                </div>
                <div className="flex-1">
                  <Label>Banner Image URL</Label>
                  <Input value={banner} onChange={(e) => setBanner(e.target.value)}
                    placeholder="https://…/banner.png" />
                </div>
              </div>
              {banner && <img src={banner} alt="banner" className="h-24 rounded border border-border object-cover" />}
              <Button variant="gold" disabled={saving} onClick={() => saveClan({ color, banner_url: banner })}>
                Raise the Banner
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
      <span className="flex items-center gap-2 text-washi2 text-sm"><Icon className="h-4 w-4 text-kin" />{label}</span>
      <span className="font-display text-washi">{value}</span>
    </div>
  );
}

function TaxEditor({ clanId, vassals, taxes, onSaved }: any) {
  const [rows, setRows] = useState<Record<string, { koku: number; food: number }>>(() => {
    const init: Record<string, { koku: number; food: number }> = {};
    for (const v of vassals) {
      const t = taxes.find((x: any) => x.target_player_id === v.id);
      init[v.id] = { koku: t?.koku_due ?? 0, food: t?.food_due ?? 0 };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/taxes/set', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clanId, taxes: rows }),
    });
    setSaving(false);
    if (!res.ok) return toast.error('Failed to set taxes');
    toast.success('Levies decreed.');
    onSaved();
  }

  if (vassals.length === 0) return <p className="text-muted-foreground text-sm">No vassals to tax.</p>;

  return (
    <div className="space-y-2">
      {vassals.map((v: any) => (
        <div key={v.id} className="flex items-center gap-3 rounded bg-kuro2 px-3 py-2">
          <span className="text-washi flex-1">{v.character_name}</span>
          <div>
            <Label>Koku</Label>
            <Input type="number" className="w-24" value={rows[v.id]?.koku ?? 0}
              onChange={(e) => setRows((r) => ({ ...r, [v.id]: { ...r[v.id], koku: Number(e.target.value) } }))} />
          </div>
          <div>
            <Label>Food</Label>
            <Input type="number" className="w-24" value={rows[v.id]?.food ?? 0}
              onChange={(e) => setRows((r) => ({ ...r, [v.id]: { ...r[v.id], food: Number(e.target.value) } }))} />
          </div>
        </div>
      ))}
      <Button variant="gold" disabled={saving} onClick={save}>Set Levies</Button>
    </div>
  );
}
