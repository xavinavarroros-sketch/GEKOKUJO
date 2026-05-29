import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Crown, ScrollText } from 'lucide-react';


export const dynamic = 'force-dynamic';

export default async function ShogunatePage() {
  const { profile } = await getSessionProfile();
  const supabase = createClient();

  const [{ data: shogunate }, { data: decrees }] = await Promise.all([
    supabase.from('shogunate').select('*, clans(name,color)').eq('active', true).maybeSingle(),
    supabase.from('decrees').select('*, clans(name)').order('created_at', { ascending: false }).limit(20),
  ]);

  let shogunName: string | null = null;
  if (shogunate?.shogun_player_id) {
    const { data: p } = await supabase.from('profiles').select('character_name').eq('id', shogunate.shogun_player_id).single();
    shogunName = p?.character_name ?? null;
  }

  const iControl = profile?.clan_id && shogunate?.clan_id === profile.clan_id;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Crown className="h-7 w-7 text-kin" />
        <h1 className="font-display text-3xl text-washi">The Shogunate</h1>
      </div>

      <Card className="gold-edge">
        <CardContent className="py-6 text-center">
          {shogunate?.clan_id ? (
            <>
              <div className="hanko-seal w-16 h-16 mx-auto mb-3 text-2xl">将</div>
              <div className="font-display text-2xl text-washi">
                The {shogunate.clans?.name} Clan holds the Shogunate
              </div>
              {shogunName && <p className="text-kin mt-1">Shogun {shogunName}</p>}
              {iControl && <Badge tone="gold" className="mt-3">Your clan wields supreme authority</Badge>}
            </>
          ) : (
            <>
              <div className="text-5xl mb-3 opacity-40">将</div>
              <div className="font-display text-2xl text-washi2">The seat of the Shogun lies vacant</div>
              <p className="text-muted-foreground mt-1">No clan commands the mandate of heaven. The realm is in chaos.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-kin" />Shogunal Decrees</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(decrees ?? []).length === 0 && <p className="text-muted-foreground text-sm">No decrees have been issued.</p>}
          {(decrees ?? []).map((d: any) => (
            <div key={d.id} className="border-l-2 border-kin pl-3">
              <div className="font-display text-washi">{d.title}</div>
              <p className="text-washi2 text-sm">{d.body}</p>
              {d.clans?.name && <p className="text-xs text-muted-foreground mt-0.5">Concerning the {d.clans.name} Clan</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
