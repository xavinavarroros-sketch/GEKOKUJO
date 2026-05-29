'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Select, Label,
} from '@/components/ui';
import { fmt } from '@/lib/utils';
import { Eye, Coins, ScrollText, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_TONE: Record<string, 'green' | 'red' | 'gold' | 'muted'> = {
  success: 'green', failure: 'muted', captured: 'red', executed: 'red', sent: 'gold',
};

export function EspionagePanel({ missions, provinces, koku, currentTurn, visibility }: any) {
  const router = useRouter();
  const [target, setTarget] = useState(provinces[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!target) return toast.error('Choose a target province');
    setBusy(true);
    const res = await fetch('/api/ninja/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provinceId: target }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error || 'Mission failed');
    toast.success(json.message || 'Shinobi dispatched.');
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Eye className="h-7 w-7 text-kin" />
          <h1 className="font-display text-3xl text-washi">Shadow War — Shinobi</h1>
        </div>
        <span className="text-washi2 flex items-center gap-1"><Coins className="h-4 w-4 text-kin" />{fmt(koku)} koku</span>
      </div>

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send"><Eye className="h-4 w-4" />Dispatch</TabsTrigger>
          <TabsTrigger value="active"><MapPin className="h-4 w-4" />Active Intel</TabsTrigger>
          <TabsTrigger value="history"><ScrollText className="h-4 w-4" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader><CardTitle>Send a Shinobi</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-washi2 text-sm">
                A successful infiltration reveals a province&apos;s full secrets — population, production, garrison and
                defenses — for the current season. Cost: <b className="text-kin">100 koku</b>. There is always a risk of capture.
              </p>
              <div>
                <Label>Target Province</Label>
                <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {provinces.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} {p.clans?.name ? `(${p.clans.name})` : ''}</option>
                  ))}
                </Select>
              </div>
              <Button variant="gold" disabled={busy} onClick={send}>
                <Eye className="h-4 w-4" />{busy ? 'Infiltrating…' : 'Dispatch Shinobi'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle>Provinces Under Watch</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {visibility.length === 0 && <p className="text-muted-foreground text-sm">No active espionage intel.</p>}
              {visibility.map((v: any) => {
                const remaining = v.expires_at_season_turn ? v.expires_at_season_turn - currentTurn : 0;
                return (
                  <div key={v.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
                    <span className="text-washi">{v.provinces?.name}</span>
                    <Badge tone={remaining > 0 ? 'green' : 'muted'}>
                      {remaining > 0 ? `${remaining} season(s) of intel` : 'Expired'}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Mission Log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {missions.length === 0 && <p className="text-muted-foreground text-sm">No missions recorded.</p>}
              {missions.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded bg-kuro2 px-3 py-2">
                  <div>
                    <span className="text-washi">{m.provinces?.name}</span>
                    {m.result_summary && <p className="text-xs text-washi2">{m.result_summary}</p>}
                  </div>
                  <Badge tone={STATUS_TONE[m.status] ?? 'muted'}>{m.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
