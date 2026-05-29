
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Shield, Crown, Swords } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClanWithPositions {
  id: string;
  name: string;
  description: string;
  color: string;
  positions: { id: string; title: string; role: string; occupied_by: string | null }[];
}

export default function ChooseClanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clans, setClans] = useState<ClanWithPositions[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // If this account is the configured Game Master, promote it and skip clan selection.
      try {
        const gmRes = await fetch('/api/gm/bootstrap', { method: 'POST' });
        const gmJson = await gmRes.json();
        if (gmJson?.isGm) {
          router.push('/gm');
          router.refresh();
          return;
        }
      } catch {
        // Continue normal clan selection if bootstrap is unavailable.
      }

      const { data: clansData } = await supabase
        .from('clans').select('id,name,description,color').order('name');
      const { data: positions } = await supabase
        .from('clan_positions').select('id,clan_id,title,role,occupied_by');
      if (clansData) {
        setClans(clansData.map((c: any) => ({
          ...c,
          positions: (positions ?? []).filter((p: any) => p.clan_id === c.id),
        })));
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function claim(positionId: string) {
    setClaiming(positionId);
    const res = await fetch('/api/clans/claim-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId }),
    });
    const json = await res.json();
    setClaiming(null);
    if (!res.ok) return toast.error(json.error || 'Could not claim position');
    toast.success('Your position is sworn!');
    router.push('/dashboard');
    router.refresh();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center text-washi2">Reading the registers…</main>;

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="font-display text-4xl text-washi text-glow-gold mb-2">Choose Your Allegiance</h1>
        <p className="text-washi2">Pledge yourself as a Daimyo or serve as a Vassal. Once chosen, your seat is locked.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clans.map((clan) => (
          <Card key={clan.id} className="overflow-hidden">
            <div className="h-2" style={{ background: clan.color }} />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: clan.color }} />
                {clan.name} Clan
              </CardTitle>
              <p className="text-sm text-washi2 mt-1">{clan.description}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {clan.positions.sort((a, b) => a.title.localeCompare(b.title)).map((pos) => {
                const taken = !!pos.occupied_by;
                const Icon = pos.role === 'daimyo' ? Crown : pos.role === 'vassal' ? Shield : Swords;
                return (
                  <div key={pos.id}
                    className="flex items-center justify-between rounded-md border border-border bg-kuro2 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-washi">
                      <Icon className="h-4 w-4 text-kin" /> {pos.title}
                    </span>
                    {taken ? (
                      <Badge tone="muted">Occupied</Badge>
                    ) : (
                      <Button size="sm" variant="gold" disabled={claiming === pos.id}
                        onClick={() => claim(pos.id)}>
                        {claiming === pos.id ? '…' : 'Claim'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
