'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui';
import { BATTLE_ORDERS, SIEGE_ATTACKER_ORDERS, SIEGE_DEFENDER_ORDERS } from '@/lib/game-engine';
import { Swords, Flame, ScrollText } from 'lucide-react';
import toast from 'react-hot-toast';

export function BattlesPanel({ profile, battles, sieges, orders }: any) {
  const router = useRouter();
  const [orderFor, setOrderFor] = useState<any | null>(null);

  const pending = battles.filter((b: any) => b.state !== 'resolved');
  const resolved = battles.filter((b: any) => b.state === 'resolved');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Swords className="h-7 w-7 text-kin" />
        <h1 className="font-display text-3xl text-washi">Battles & Sieges</h1>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending"><Swords className="h-4 w-4" />Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="sieges"><Flame className="h-4 w-4" />Sieges ({sieges.filter((s:any)=>s.state==='ongoing').length})</TabsTrigger>
          <TabsTrigger value="history"><ScrollText className="h-4 w-4" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No battles loom on the horizon.</CardContent></Card>
          ) : pending.map((b: any) => {
            const isAttacker = b.attacker_clan_id === profile.clan_id;
            const myOrder = orders.find((o: any) => o.battle_id === b.id);
            return (
              <Card key={b.id} className="mb-3">
                <CardHeader><CardTitle className="flex items-center justify-between">
                  <span>Battle at {b.provinces?.name}</span>
                  <Badge tone={isAttacker ? 'red' : 'gold'}>{isAttacker ? 'Attacking' : 'Defending'}</Badge>
                </CardTitle></CardHeader>
                <CardContent>
                  <p className="text-washi2 text-sm mb-3">
                    {b.state === 'awaiting_orders' ? 'Choose up to 3 battle orders before the season resolves.' : 'Awaiting deployment.'}
                  </p>
                  {myOrder?.submitted ? (
                    <Badge tone="green">Orders submitted</Badge>
                  ) : (
                    <Button variant="gold" size="sm" onClick={() => setOrderFor(b)}>Choose Orders</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="sieges">
          {sieges.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No active sieges.</CardContent></Card>
          ) : sieges.map((s: any) => {
            const isAttacker = s.attacker_clan_id === profile.clan_id;
            return (
              <Card key={s.id} className="mb-3">
                <CardHeader><CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Flame className="h-4 w-4 text-aka" />Siege of {s.provinces?.name}</span>
                  <Badge tone={s.state === 'ongoing' ? 'red' : 'muted'}>{s.state.replace('_', ' ')}</Badge>
                </CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-4 text-sm text-washi2">
                    <span>Castle defense: <b className="text-washi">{s.castle_defense}</b></span>
                    <span>Seasons elapsed: <b className="text-washi">{s.seasons_elapsed}</b></span>
                    <Badge tone={isAttacker ? 'red' : 'gold'}>{isAttacker ? 'Besieging' : 'Defending'}</Badge>
                  </div>
                  {s.state === 'ongoing' && (
                    <SiegeOrder siege={s} isAttacker={isAttacker} onDone={() => router.refresh()} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Chronicle of War</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {resolved.length === 0 && <p className="text-muted-foreground text-sm">No battles fought yet.</p>}
              {resolved.map((b: any) => (
                <div key={b.id} className="rounded bg-kuro2 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-washi">Battle at {b.provinces?.name}</span>
                    <Badge tone="muted">{b.result}</Badge>
                  </div>
                  {Array.isArray(b.log) && b.log.length > 0 && (
                    <p className="text-xs text-washi2 mt-1">{b.log[b.log.length - 1]}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {orderFor && (
        <OrderDialog battle={orderFor} onClose={() => setOrderFor(null)}
          onDone={() => { setOrderFor(null); router.refresh(); }} />
      )}
    </div>
  );
}

function OrderDialog({ battle, onClose, onDone }: any) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(o: string) {
    setSelected((s) => s.includes(o) ? s.filter((x) => x !== o) : s.length < 3 ? [...s, o] : s);
  }

  async function submit() {
    if (selected.length === 0) return toast.error('Choose at least one order');
    setBusy(true);
    const res = await fetch('/api/battles/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleId: battle.id, orders: selected }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) return toast.error(json.error || 'Failed');
    toast.success('Battle orders sealed.');
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-xl text-washi">Battle Orders ({selected.length}/3)</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {BATTLE_ORDERS.map((o) => (
            <button key={o} onClick={() => toggle(o)}
              className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                selected.includes(o) ? 'border-kin bg-kin/15 text-washi' : 'border-border bg-kuro2 text-washi2 hover:bg-muted'
              }`}>
              {o}
            </button>
          ))}
        </div>
        <Button variant="gold" className="w-full mt-4" disabled={busy} onClick={submit}>
          {busy ? 'Sealing…' : 'Submit Orders'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SiegeOrder({ siege, isAttacker, onDone }: any) {
  const list = isAttacker ? SIEGE_ATTACKER_ORDERS : SIEGE_DEFENDER_ORDERS;
  const [order, setOrder] = useState('');
  async function submit() {
    const res = await fetch('/api/sieges/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siegeId: siege.id, order, isAttacker }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error || 'Failed');
    toast.success('Siege order set.');
    onDone();
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {list.map((o) => (
        <button key={o} onClick={() => setOrder(o)}
          className={`rounded border px-2 py-1 text-xs ${order === o ? 'border-kin bg-kin/15 text-washi' : 'border-border bg-kuro2 text-washi2'}`}>
          {o}
        </button>
      ))}
      {order && <Button size="sm" variant="gold" onClick={submit}>Confirm: {order}</Button>}
    </div>
  );
}
