'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Input, Textarea, Label, Select, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui';
import { fmt, SEASON_LABEL } from '@/lib/utils';
import {
  Crown, FastForward, Map as MapIcon, Users, Swords, Eye, Skull, ScrollText,
  Megaphone, Image as ImageIcon, Settings, Shield, Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function GMPanel({ season, clans, provinces, players, battles, sieges, missions, logs, shogunate }: any) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);

  async function post(url: string, body?: any, okMsg = 'Done') {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok && !json.ok) { toast.error(json.error || 'Failed'); return null; }
    toast.success(json.message || okMsg);
    router.refresh();
    return json;
  }

  async function advance() {
    setAdvancing(true);
    const json = await post('/api/seasons/advance', undefined, 'Season advanced.');
    setAdvancing(false);
    if (json?.summary) toast.success(json.summary.join(' '));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Crown className="h-7 w-7 text-kin" />
          <div>
            <h1 className="font-display text-3xl text-washi">Game Master</h1>
            <p className="text-washi2">
              {season ? `${SEASON_LABEL[season.season]} ${season.year} — Turn ${season.turn_number}` : 'No active season'}
            </p>
          </div>
        </div>
        <Button variant="gold" disabled={advancing} onClick={advance}>
          <FastForward className="h-4 w-4" />{advancing ? 'Resolving the season…' : 'Advance Season'}
        </Button>
      </div>

      <Tabs defaultValue="clans">
        <TabsList className="flex-wrap">
          <TabsTrigger value="clans"><Shield className="h-4 w-4" />Clans</TabsTrigger>
          <TabsTrigger value="provinces"><MapIcon className="h-4 w-4" />Provinces</TabsTrigger>
          <TabsTrigger value="players"><Users className="h-4 w-4" />Players</TabsTrigger>
          <TabsTrigger value="war"><Swords className="h-4 w-4" />War</TabsTrigger>
          <TabsTrigger value="espionage"><Eye className="h-4 w-4" />Espionage</TabsTrigger>
          <TabsTrigger value="shogun"><Crown className="h-4 w-4" />Shogunate</TabsTrigger>
          <TabsTrigger value="cemetery"><Skull className="h-4 w-4" />Cemetery</TabsTrigger>
          <TabsTrigger value="announce"><Megaphone className="h-4 w-4" />Announce</TabsTrigger>
          <TabsTrigger value="media"><ImageIcon className="h-4 w-4" />Media</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="h-4 w-4" />Logs</TabsTrigger>
        </TabsList>

        {/* CLANS */}
        <TabsContent value="clans">
          <div className="grid md:grid-cols-2 gap-3">
            {clans.map((c: any) => <ClanEditor key={c.id} clan={c} onSave={(b: any) => post('/api/gm/edit-clan', b, 'Clan updated.')} />)}
          </div>
        </TabsContent>

        {/* PROVINCES */}
        <TabsContent value="provinces">
          <div className="grid md:grid-cols-2 gap-3">
            {provinces.map((p: any) => (
              <ProvinceEditor key={p.id} province={p} clans={clans}
                onSave={(b: any) => post('/api/gm/edit-province', b, 'Province updated.')} />
            ))}
          </div>
        </TabsContent>

        {/* PLAYERS */}
        <TabsContent value="players">
          <Card>
            <CardHeader><CardTitle>Assign Players</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {players.map((pl: any) => (
                <PlayerRow key={pl.id} player={pl} clans={clans}
                  onSave={(b: any) => post('/api/gm/assign-player', b, 'Player reassigned.')} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WAR */}
        <TabsContent value="war">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Pending Battles</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {battles.length === 0 && <p className="text-muted-foreground text-sm">No pending battles.</p>}
                {battles.map((b: any) => (
                  <div key={b.id} className="rounded bg-kuro2 px-3 py-2 flex items-center justify-between">
                    <span className="text-washi text-sm">{b.provinces?.name} — {b.state}</span>
                    <Button size="sm" variant="danger" onClick={() => post('/api/gm/resolve-battle', { battleId: b.id }, 'Battle resolved.')}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Ongoing Sieges</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {sieges.length === 0 && <p className="text-muted-foreground text-sm">No ongoing sieges.</p>}
                {sieges.map((s: any) => (
                  <div key={s.id} className="rounded bg-kuro2 px-3 py-2 flex items-center justify-between">
                    <span className="text-washi text-sm flex items-center gap-1"><Flame className="h-3 w-3 text-aka" />{s.provinces?.name}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="muted" onClick={() => post('/api/gm/resolve-siege', { siegeId: s.id, outcome: 'holds' }, 'Castle holds.')}>Holds</Button>
                      <Button size="sm" variant="danger" onClick={() => post('/api/gm/resolve-siege', { siegeId: s.id, outcome: 'falls' }, 'Castle falls.')}>Falls</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ESPIONAGE */}
        <TabsContent value="espionage">
          <Card>
            <CardHeader><CardTitle>Ninja Missions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {missions.length === 0 && <p className="text-muted-foreground text-sm">No missions recorded.</p>}
              {missions.map((m: any) => (
                <div key={m.id} className="rounded bg-kuro2 px-3 py-2 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-washi text-sm">
                    {m.clans?.name} → {m.provinces?.name} <Badge tone="muted">{m.status}</Badge>
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="muted" onClick={() => post('/api/gm/force-espionage', { missionId: m.id, outcome: 'success' }, 'Forced success.')}>Success</Button>
                    <Button size="sm" variant="muted" onClick={() => post('/api/gm/force-espionage', { missionId: m.id, outcome: 'failure' }, 'Forced failure.')}>Failure</Button>
                    <Button size="sm" variant="danger" onClick={() => post('/api/gm/force-espionage', { missionId: m.id, outcome: 'captured' }, 'Forced capture.')}>Captured</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SHOGUNATE */}
        <TabsContent value="shogun">
          <ShogunEditor clans={clans} players={players} shogunate={shogunate}
            onAppoint={(b: any) => post('/api/gm/shogun', b, 'Shogunate updated.')}
            onDecree={(b: any) => post('/api/shogunate/decree', b, 'Decree issued.')} />
        </TabsContent>

        {/* CEMETERY */}
        <TabsContent value="cemetery">
          <GraveyardEditor clans={clans} season={season}
            onAdd={(b: any) => post('/api/gm/graveyard', b, 'Entombed in the cemetery.')} />
        </TabsContent>

        {/* ANNOUNCE */}
        <TabsContent value="announce">
          <AnnounceEditor onPost={(b: any) => post('/api/gm/announcement', b, 'Announcement posted.')} />
        </TabsContent>

        {/* MEDIA */}
        <TabsContent value="media">
          <MediaEditor onAdd={(b: any) => post('/api/gm/media', b, 'Media added.')} />
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle>Game Log</CardTitle></CardHeader>
            <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto">
              {logs.map((l: any) => (
                <div key={l.id} className="text-sm border-l-2 border-border pl-2 py-0.5">
                  <span className="text-muted-foreground text-xs">[{l.type}]</span> <span className="text-washi2">{l.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClanEditor({ clan, onSave }: any) {
  const [koku, setKoku] = useState(0);
  const [food, setFood] = useState(0);
  const [prestige, setPrestige] = useState(clan.prestige ?? 0);
  const [status, setStatus] = useState(clan.status);
  return (
    <Card>
      <div className="h-1.5" style={{ background: clan.color }} />
      <CardHeader className="py-3"><CardTitle className="text-base">{clan.name} Clan</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Add Koku</Label><Input type="number" value={koku} onChange={(e) => setKoku(Number(e.target.value))} /></div>
          <div><Label>Add Food</Label><Input type="number" value={food} onChange={(e) => setFood(Number(e.target.value))} /></div>
          <div><Label>Prestige</Label><Input type="number" value={prestige} onChange={(e) => setPrestige(Number(e.target.value))} /></div>
          <div><Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {['active', 'destroyed', 'subjugated', 'rebel', 'shogunate'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
        <Button size="sm" variant="gold" onClick={() => onSave({ clanId: clan.id, addKoku: koku, addFood: food, prestige, status })}>Apply</Button>
      </CardContent>
    </Card>
  );
}

function ProvinceEditor({ province, clans, onSave }: any) {
  const r = province.province_resources?.[0] ?? {};
  const [population, setPopulation] = useState(r.population ?? 0);
  const [devastation, setDevastation] = useState(r.devastation_level ?? 0);
  const [clanId, setClanId] = useState(province.clan_id ?? '');
  const [state, setState] = useState(province.state);
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-base">{province.name}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Population</Label><Input type="number" value={population} onChange={(e) => setPopulation(Number(e.target.value))} /></div>
          <div><Label>Devastation %</Label><Input type="number" value={devastation} onChange={(e) => setDevastation(Number(e.target.value))} /></div>
          <div><Label>Owner Clan</Label>
            <Select value={clanId} onChange={(e) => setClanId(e.target.value)}>
              <option value="">— Neutral —</option>
              {clans.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div><Label>State</Label>
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              {['normal', 'at_war', 'under_siege', 'rebellion', 'devastated'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
        <Button size="sm" variant="gold"
          onClick={() => onSave({ provinceId: province.id, population, devastation, clanId: clanId || null, state })}>
          Apply
        </Button>
      </CardContent>
    </Card>
  );
}

function PlayerRow({ player, clans, onSave }: any) {
  const [clanId, setClanId] = useState(player.clan_id ?? '');
  const [role, setRole] = useState(player.role);
  return (
    <div className="flex items-center gap-2 rounded bg-kuro2 px-3 py-2 flex-wrap">
      <span className="text-washi flex-1 min-w-32">{player.character_name ?? player.email}</span>
      <Select value={clanId} onChange={(e) => setClanId(e.target.value)} className="w-40">
        <option value="">— No clan —</option>
        {clans.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-36">
        {['unassigned', 'daimyo', 'vassal', 'commander', 'gm'].map((r) => <option key={r} value={r}>{r}</option>)}
      </Select>
      <Button size="sm" variant="gold" onClick={() => onSave({ playerId: player.id, clanId: clanId || null, role })}>Set</Button>
    </div>
  );
}

function ShogunEditor({ clans, players, shogunate, onAppoint, onDecree }: any) {
  const [clanId, setClanId] = useState(shogunate?.clan_id ?? '');
  const [playerId, setPlayerId] = useState(shogunate?.shogun_player_id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const clanPlayers = players.filter((p: any) => p.clan_id === clanId);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Appoint Shogun</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Clan</Label>
            <Select value={clanId} onChange={(e) => setClanId(e.target.value)}>
              <option value="">— Vacant —</option>
              {clans.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div><Label>Shogun (player)</Label>
            <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">— None —</option>
              {clanPlayers.map((p: any) => <option key={p.id} value={p.id}>{p.character_name}</option>)}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="gold" onClick={() => onAppoint({ clanId, playerId: playerId || null })}>Appoint</Button>
            <Button size="sm" variant="danger" onClick={() => onAppoint({ clanId: null, playerId: null })}>Vacate Seat</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Issue Decree</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Decree title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="The will of the Shogun…" />
          <Button size="sm" variant="gold" onClick={() => onDecree({ title, body, clanId: clanId || null })}>Proclaim</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GraveyardEditor({ clans, season, onAdd }: any) {
  const [form, setForm] = useState({ character_name: '', title: '', cause: 'battle', clan_id: '', location: '', executed_by: '', image_url: '', notes: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Card>
      <CardHeader><CardTitle>Add to Cemetery</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          <div><Label>Name</Label><Input value={form.character_name} onChange={(e) => set('character_name', e.target.value)} /></div>
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label>Cause</Label>
            <Select value={form.cause} onChange={(e) => set('cause', e.target.value)}>
              {['battle', 'execution', 'siege', 'illness', 'rebellion', 'seppuku', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div><Label>Clan</Label>
            <Select value={form.clan_id} onChange={(e) => set('clan_id', e.target.value)}>
              <option value="">— None —</option>
              {clans.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
          <div><Label>Executed by</Label><Input value={form.executed_by} onChange={(e) => set('executed_by', e.target.value)} /></div>
          <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => set('image_url', e.target.value)} /></div>
        </div>
        <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Notes…" />
        <Button size="sm" variant="gold"
          onClick={() => onAdd({ ...form, clan_id: form.clan_id || null, season_label: season ? `${season.season} ${season.year}` : null })}>
          Entomb
        </Button>
      </CardContent>
    </Card>
  );
}

function AnnounceEditor({ onPost }: any) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <Card>
      <CardHeader><CardTitle>Post Announcement</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Announcement to all players…" />
        <Button size="sm" variant="gold" onClick={() => onPost({ title, body })}>Post to All</Button>
      </CardContent>
    </Card>
  );
}

function MediaEditor({ onAdd }: any) {
  const [form, setForm] = useState({ section: 'lore', title: '', url: '', body: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Card>
      <CardHeader><CardTitle>Add Media / Lore</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          <div><Label>Section</Label>
            <Select value={form.section} onChange={(e) => set('section', e.target.value)}>
              {['cover', 'lore', 'clan', 'province', 'unit', 'building', 'event', 'season'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
        </div>
        <div><Label>Image URL</Label><Input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></div>
        <Textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={3} placeholder="Description / lore text…" />
        <Button size="sm" variant="gold" onClick={() => onAdd(form)}>Add</Button>
      </CardContent>
    </Card>
  );
}
