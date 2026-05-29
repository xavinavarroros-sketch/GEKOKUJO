'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Select, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui';
import { fmt } from '@/lib/utils';
import { Hammer, Coins, Wheat, Building2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['economy', 'food', 'military', 'culture', 'special'];

export function ConstructionPanel({ templates, provinces, built, clanResources }: any) {
  const router = useRouter();
  const [buildFor, setBuildFor] = useState<any | null>(null);
  const [provinceId, setProvinceId] = useState(provinces[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  async function construct() {
    if (!buildFor) return;
    setBusy(true);
    const res = await fetch('/api/buildings/construct', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: buildFor.id, provinceId }),
    });
    const json = await res.json();
    setBusy(false);
    setBuildFor(null);
    if (!json.ok) return toast.error(json.error || 'Construction failed');
    toast.success('Construction has begun.');
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Hammer className="h-7 w-7 text-kin" />
          <h1 className="font-display text-3xl text-washi">Construction</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-washi2 flex items-center gap-1"><Coins className="h-4 w-4 text-kin" />{fmt(clanResources?.koku)}</span>
          <span className="text-washi2 flex items-center gap-1"><Wheat className="h-4 w-4 text-green-300" />{fmt(clanResources?.food)}</span>
        </div>
      </div>

      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available"><Building2 className="h-4 w-4" />Available</TabsTrigger>
          <TabsTrigger value="progress"><Hammer className="h-4 w-4" />In Progress</TabsTrigger>
          <TabsTrigger value="active"><Sparkles className="h-4 w-4" />Active</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {CATEGORIES.map((cat) => {
            const items = templates.filter((t: any) => t.category === cat && !t.is_special);
            const specials = cat === 'special' ? templates.filter((t: any) => t.is_special) : [];
            const list = cat === 'special' ? specials : items;
            if (list.length === 0) return null;
            return (
              <div key={cat} className="mb-5">
                <h3 className="font-display text-kin text-sm uppercase tracking-wide mb-2">{cat}</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((t: any) => (
                    <Card key={t.id}>
                      <CardContent className="space-y-2 py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-washi">{t.name}</span>
                          {t.is_special && <Badge tone="gold">Special</Badge>}
                        </div>
                        <p className="text-washi2 text-xs">{t.description}</p>
                        <div className="flex gap-2 text-xs text-washi2">
                          <span><Coins className="h-3 w-3 inline text-kin" /> {fmt(t.koku_cost)}</span>
                          <span><Wheat className="h-3 w-3 inline text-green-300" /> {fmt(t.food_cost)}</span>
                          <span>{t.build_seasons}t</span>
                        </div>
                        {!t.is_special && (
                          <Button variant="gold" size="sm" className="w-full" onClick={() => setBuildFor(t)}>Build</Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader><CardTitle>Under Construction</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {built.filter((b: any) => b.state === 'constructing').length === 0 &&
                <p className="text-muted-foreground text-sm">No construction underway.</p>}
              {built.filter((b: any) => b.state === 'constructing').map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
                  <span className="text-washi">{b.building_templates?.name} <span className="text-muted-foreground text-xs">@ {b.provinces?.name}</span></span>
                  <Badge tone="gold">{b.seasons_remaining} season(s) left</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle>Completed Structures</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {built.filter((b: any) => b.state === 'active').length === 0 &&
                <p className="text-muted-foreground text-sm">No active buildings yet.</p>}
              {built.filter((b: any) => b.state === 'active').map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
                  <span className="text-washi">{b.building_templates?.name} <span className="text-muted-foreground text-xs">@ {b.provinces?.name}</span></span>
                  <Badge tone="green">Active</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!buildFor} onOpenChange={(o) => !o && setBuildFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-xl text-washi">Build {buildFor?.name}</DialogTitle></DialogHeader>
          {buildFor && (
            <div className="space-y-4">
              <p className="text-washi2 text-sm">{buildFor.description}</p>
              <div>
                <Label>Province</Label>
                <Select value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
                  {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="text-sm text-washi2">
                Cost: <b className="text-kin">{fmt(buildFor.koku_cost)} koku</b>, <b className="text-green-300">{fmt(buildFor.food_cost)} food</b>,
                completes in <b className="text-washi">{buildFor.build_seasons}</b> season(s).
              </div>
              <Button variant="gold" className="w-full" disabled={busy} onClick={construct}>
                {busy ? 'Breaking ground…' : 'Begin Construction'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
