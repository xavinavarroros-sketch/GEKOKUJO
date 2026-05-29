'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea,
} from '@/components/ui';
import { ResourceCard } from '@/components/shared/resource-cards';
import { fmt } from '@/lib/utils';
import { Shield, Coins, Swords, Flag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function VassalPanel({ profile, clan, resources, subprovinces, units, taxes }: any) {
  const router = useRouter();
  const [rebelOpen, setRebelOpen] = useState(false);
  const [manifesto, setManifesto] = useState('');
  const [rebelling, setRebelling] = useState(false);

  const taxDue = taxes.reduce((s: number, t: any) => s + Number(t.koku_due || 0), 0);
  const foodDue = taxes.reduce((s: number, t: any) => s + Number(t.food_due || 0), 0);

  async function payTaxes() {
    const res = await fetch('/api/taxes/pay', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || 'Could not pay');
    toast.success('Tribute delivered to your lord.');
    router.refresh();
  }

  async function declareRebellion() {
    setRebelling(true);
    const res = await fetch('/api/nation/rebel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifesto }),
    });
    const json = await res.json();
    setRebelling(false);
    setRebelOpen(false);
    if (!res.ok) return toast.error(json.error || 'The rebellion failed to ignite');
    toast.success('You have raised your banner in revolt!');
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-kin" />
        <div>
          <h1 className="font-display text-3xl text-washi">{profile.character_name}&apos;s Domain</h1>
          <p className="text-washi2">Vassal of the {clan?.name} Clan</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <ResourceCard type="koku" value={resources?.koku ?? 0} />
        <ResourceCard type="food" value={resources?.food ?? 0} />
        <ResourceCard type="horses" value={resources?.horses ?? 0} />
      </div>

      <Tabs defaultValue="lands">
        <TabsList>
          <TabsTrigger value="lands"><Shield className="h-4 w-4" />My Lands</TabsTrigger>
          <TabsTrigger value="troops"><Swords className="h-4 w-4" />My Troops</TabsTrigger>
          <TabsTrigger value="taxes"><Coins className="h-4 w-4" />Tribute Owed</TabsTrigger>
          <TabsTrigger value="politics"><Flag className="h-4 w-4" />Politics</TabsTrigger>
        </TabsList>

        <TabsContent value="lands">
          <Card>
            <CardHeader><CardTitle>Subprovinces Under Your Control</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {subprovinces.length === 0 && <p className="text-muted-foreground text-sm">Your lord has granted you no lands yet.</p>}
              {subprovinces.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
                  <span className="text-washi">{s.name} <span className="text-muted-foreground text-xs">({s.provinces?.name})</span></span>
                  <span className="flex gap-2">
                    <Badge tone={s.type === 'central' ? 'gold' : 'default'}>{s.type}</Badge>
                    {s.in_rebellion && <Badge tone="red">Rebelling</Badge>}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troops">
          <Card>
            <CardHeader><CardTitle>Personal Retinue</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {units.length === 0 && <p className="text-muted-foreground text-sm">You command no personal troops.</p>}
              {units.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
                  <span className="text-washi">{u.unit_templates?.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-washi2 text-sm">{fmt(u.current_strength)}/{fmt(u.max_strength)}</span>
                    <Badge tone={u.status === 'active' ? 'green' : u.status === 'creating' ? 'gold' : 'red'}>{u.status}</Badge>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes">
          <Card>
            <CardHeader><CardTitle>Tribute Owed to Your Lord</CardTitle></CardHeader>
            <CardContent>
              {taxDue === 0 && foodDue === 0 ? (
                <p className="text-muted-foreground text-sm">No tribute is currently demanded of you.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <span className="text-washi">Koku due: <b className="text-kin">{fmt(taxDue)}</b></span>
                    <span className="text-washi">Food due: <b className="text-green-300">{fmt(foodDue)}</b></span>
                  </div>
                  <Button variant="gold" onClick={payTaxes}>Pay Tribute</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="politics">
          <Card>
            <CardHeader><CardTitle>Political Action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-washi2 text-sm">
                A vassal&apos;s loyalty is his own to give — or to withdraw. Should you choose to defy your lord,
                your lands will rise in rebellion and your retinue will answer to you alone. This cannot be undone lightly.
              </p>
              <Button variant="danger" onClick={() => setRebelOpen(true)}>
                <AlertTriangle className="h-4 w-4" /> Declare Rebellion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={rebelOpen} onOpenChange={setRebelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-aka">Declare Rebellion</DialogTitle>
          </DialogHeader>
          <p className="text-washi2 text-sm mb-3">
            Proclaim your reasons to the realm. Your subprovinces will enter open revolt and the Game Master and your
            former lord will be notified.
          </p>
          <Textarea value={manifesto} onChange={(e) => setManifesto(e.target.value)} rows={5}
            placeholder="Write your manifesto of rebellion…" />
          <div className="flex gap-2 mt-4">
            <Button variant="danger" disabled={rebelling} onClick={declareRebellion}>
              {rebelling ? 'Raising banners…' : 'Raise the Banner of Revolt'}
            </Button>
            <Button variant="ghost" onClick={() => setRebelOpen(false)}>Reconsider</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
