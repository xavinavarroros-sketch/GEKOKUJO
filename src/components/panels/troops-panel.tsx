'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Select, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui';
import { fmt } from '@/lib/utils';
import { Swords, Users, Coins, Wheat, Rss, Plus, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

export function TroopsPanel({ profile, templates, units, provinces, clanResources, playerResources }: any) {
  const router = useRouter();
  const isDaimyo = profile.role === 'daimyo';
  const res = isDaimyo ? clanResources : playerResources;
  const [recruitFor, setRecruitFor] = useState<any | null>(null);
  const [provinceId, setProvinceId] = useState(provinces[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  async function recruit() {
    if (!recruitFor) return;
    setBusy(true);
    const res = await fetch('/api/troops/recruit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: recruitFor.id, provinceId }),
    });
    const json = await res.json();
    setBusy(false);
    setRecruitFor(null);
    if (!json.ok) return toast.error(json.error || 'Recruitment failed');
    toast.success('Levy raised! Population has answered the call.');
    router.refresh();
  }

  async function reinforce(scope: string, id?: string) {
    const res = await fetch('/api/troops/reinforce', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, id }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error || 'Could not reinforce');
    toast.success(json.message || 'Ranks replenished.');
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Swords className="h-7 w-7 text-kin" />
          <h1 className="font-display text-3xl text-washi">Troops & Levies</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-washi2 flex items-center gap-1"><Coins className="h-4 w-4 text-kin" />{fmt(res?.koku)}</span>
          <span className="text-washi2 flex items-center gap-1"><Wheat className="h-4 w-4 text-green-300" />{fmt(res?.food)}</span>
          <span className="text-washi2 flex items-center gap-1"><Rss className="h-4 w-4 text-amber-200" />{fmt(res?.horses)}</span>
        </div>
      </div>

      <Tabs defaultValue="recruit">
        <TabsList>
          <TabsTrigger value="recruit"><Plus className="h-4 w-4" />Recruit</TabsTrigger>
          <TabsTrigger value="active"><Swords className="h-4 w-4" />Active Forces</TabsTrigger>
        </TabsList>

        <TabsContent value="recruit">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t: any) => (
              <Card key={t.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {t.name}
                    <Badge tone="muted">{t.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-washi2 text-xs">{t.description}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <Spec label="Koku" value={fmt(t.koku_cost)} />
                    <Spec label="Food" value={fmt(t.food_cost)} />
                    <Spec label="Population" value={fmt(t.population_cost)} />
                    <Spec label="Horses" value={fmt(t.horse_cost)} />
                    <Spec label="Attack" value={fmt(t.attack)} />
                    <Spec label="Defense" value={fmt(t.defense)} />
                  </div>
                  <Button variant="gold" size="sm" className="w-full" onClick={() => setRecruitFor(t)}>
                    Raise Levy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Active & Forming Units</CardTitle>
              {isDaimyo && (
                <Button size="sm" variant="muted" onClick={() => reinforce('clan')}>
                  <Wrench className="h-4 w-4" />Reinforce All
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {units.length === 0 && <p className="text-muted-foreground text-sm">No troops raised yet.</p>}
              {units.map((u: any) => {
                const pct = Math.round((u.current_strength / Math.max(1, u.max_strength)) * 100);
                return (
                  <div key={u.id} className="rounded-md bg-kuro2 border border-border p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-washi font-display">{u.unit_templates?.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={u.status === 'active' ? 'green' : u.status === 'creating' ? 'gold' : 'red'}>
                          {u.status === 'creating' ? `Forming (${u.seasons_remaining}t)` : u.status}
                        </Badge>
                        {pct < 100 && u.status === 'active' && (
                          <Button size="sm" variant="muted" onClick={() => reinforce('unit', u.id)}>Reinforce</Button>
                        )}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-sumi overflow-hidden">
                      <div className="h-full bg-aka" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-washi2 mt-1">{fmt(u.current_strength)} / {fmt(u.max_strength)} ({pct}%)</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!recruitFor} onOpenChange={(o) => !o && setRecruitFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-xl text-washi">Raise {recruitFor?.name}</DialogTitle></DialogHeader>
          {recruitFor && (
            <div className="space-y-4">
              <p className="text-washi2 text-sm">
                This unit will draw <b className="text-washi">{fmt(recruitFor.population_cost)}</b> souls from the chosen
                province&apos;s population. Those people will not return on their own.
              </p>
              <div>
                <Label>Draw population from</Label>
                <Select value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
                  {provinces.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} — {fmt(p.population)} population</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <Spec label="Koku" value={fmt(recruitFor.koku_cost)} />
                <Spec label="Food" value={fmt(recruitFor.food_cost)} />
                <Spec label="Pop" value={fmt(recruitFor.population_cost)} />
                <Spec label="Horses" value={fmt(recruitFor.horse_cost)} />
              </div>
              <Button variant="gold" className="w-full" disabled={busy} onClick={recruit}>
                {busy ? 'Mustering…' : 'Confirm Levy'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-sumi/60 px-2 py-1">
      <span className="text-muted-foreground">{label}: </span><span className="text-washi">{value}</span>
    </div>
  );
}
