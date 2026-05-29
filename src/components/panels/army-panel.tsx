'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge, Select, Label, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui';
import { fmt } from '@/lib/utils';
import { Swords, Flag, MapPin, Move, Plus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const POSTURES = [
  { v: 'normal_march', l: 'Normal March' }, { v: 'forced_march', l: 'Forced March' },
  { v: 'defensive', l: 'Defensive' }, { v: 'ambush', l: 'Ambush' },
  { v: 'raid', l: 'Raid' }, { v: 'siege', l: 'Siege' }, { v: 'retreat', l: 'Retreat' },
];

export function ArmyPanel({ profile, armies, units, provinces, members }: any) {
  const router = useRouter();
  const canCreate = ['daimyo', 'vassal'].includes(profile.role) || profile.is_gm;
  const [createOpen, setCreateOpen] = useState(false);
  const [moveFor, setMoveFor] = useState<any | null>(null);

  const unassigned = units.filter((u: any) => !u.army_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Swords className="h-7 w-7 text-kin" />
          <h1 className="font-display text-3xl text-washi">Armies</h1>
        </div>
        {canCreate && <Button variant="gold" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Raise Army</Button>}
      </div>

      {armies.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No armies in the field.</CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {armies.map((army: any) => {
          const armyUnits = units.filter((u: any) => u.army_id === army.id);
          const strength = armyUnits.reduce((s: number, u: any) => s + u.current_strength, 0);
          const commander = members.find((m: any) => m.id === army.commander_id);
          const loc = provinces.find((p: any) => p.id === army.current_province_id);
          const dest = provinces.find((p: any) => p.id === army.destination_province_id);
          return (
            <Card key={army.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Flag className="h-4 w-4 text-aka" />{army.name}</span>
                  <Badge tone={army.state === 'idle' ? 'muted' : army.state === 'in_battle' ? 'red' : 'gold'}>{army.state}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Info icon={Swords} label="Strength" value={fmt(strength)} />
                  <Info icon={Shield} label="Morale" value={`${fmt(army.morale)}`} />
                  <Info icon={MapPin} label="Location" value={loc?.name ?? 'Unknown'} />
                  <Info icon={Move} label="Posture" value={POSTURES.find((p) => p.v === army.posture)?.l ?? army.posture} />
                </div>
                {dest && <p className="text-xs text-kin">Marching to {dest.name} — {army.seasons_to_arrival} season(s)</p>}

                <div className="rounded bg-kuro2 border border-border p-2">
                  <div className="text-xs text-muted-foreground mb-1">Units ({armyUnits.length})</div>
                  {armyUnits.length === 0 ? <p className="text-xs text-muted-foreground italic">No units assigned.</p> :
                    armyUnits.map((u: any) => (
                      <div key={u.id} className="flex justify-between text-xs text-washi2">
                        <span>{u.unit_templates?.name}</span><span>{fmt(u.current_strength)}</span>
                      </div>
                    ))}
                </div>

                <Button size="sm" variant="muted" className="w-full" onClick={() => setMoveFor(army)}>
                  <Move className="h-4 w-4" />Issue Orders
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {createOpen && (
        <CreateArmyDialog profile={profile} provinces={provinces.filter((p: any) => p.clan_id === profile.clan_id)}
          members={members} unassigned={unassigned} onClose={() => setCreateOpen(false)}
          onDone={() => { setCreateOpen(false); router.refresh(); }} />
      )}
      {moveFor && (
        <MoveDialog army={moveFor} provinces={provinces} onClose={() => setMoveFor(null)}
          onDone={() => { setMoveFor(null); router.refresh(); }} />
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-kin" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-washi">{value}</span>
    </div>
  );
}

function CreateArmyDialog({ profile, provinces, members, unassigned, onClose, onDone }: any) {
  const [name, setName] = useState('');
  const [provinceId, setProvinceId] = useState(provinces[0]?.id ?? '');
  const [commanderId, setCommanderId] = useState(profile.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name) return toast.error('Name your army');
    setBusy(true);
    const res = await fetch('/api/armies/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, provinceId, commanderId, unitIds: selected }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) return toast.error(json.error || 'Failed');
    toast.success('Army assembled.');
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-xl text-washi">Raise a New Army</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Army Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vanguard of Owari" /></div>
          <div><Label>Stationed at</Label>
            <Select value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
              {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div><Label>Commander</Label>
            <Select value={commanderId} onChange={(e) => setCommanderId(e.target.value)}>
              {members.filter((m: any) => m.role !== 'gm').map((m: any) => (
                <option key={m.id} value={m.id}>{m.character_name} ({m.role})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Assign Units</Label>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded border border-border bg-input p-2">
              {unassigned.length === 0 && <p className="text-xs text-muted-foreground">No free units. Raise troops first.</p>}
              {unassigned.map((u: any) => (
                <label key={u.id} className="flex items-center gap-2 text-sm text-washi cursor-pointer">
                  <input type="checkbox" checked={selected.includes(u.id)}
                    onChange={(e) => setSelected((s) => e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id))} />
                  {u.unit_templates?.name} ({fmt(u.current_strength)})
                </label>
              ))}
            </div>
          </div>
          <Button variant="gold" className="w-full" disabled={busy} onClick={create}>
            {busy ? 'Assembling…' : 'Assemble Army'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ army, provinces, onClose, onDone }: any) {
  const [destination, setDestination] = useState('');
  const [posture, setPosture] = useState(army.posture);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true);
    const res = await fetch('/api/armies/move', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ armyId: army.id, destinationId: destination || null, posture }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) return toast.error(json.error || 'Failed');
    toast.success('Orders dispatched.');
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-xl text-washi">Orders for {army.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Posture</Label>
            <Select value={posture} onChange={(e) => setPosture(e.target.value)}>
              {POSTURES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </Select>
          </div>
          <div><Label>March to (optional)</Label>
            <Select value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option value="">— Hold position —</option>
              {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <p className="text-xs text-washi2">Movement resolves when the Game Master advances the season.</p>
          <Button variant="gold" className="w-full" disabled={busy} onClick={issue}>
            {busy ? 'Dispatching…' : 'Issue Orders'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
