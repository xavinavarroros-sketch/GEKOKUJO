import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Skull } from 'lucide-react';


export const dynamic = 'force-dynamic';

const CAUSE_LABEL: Record<string, string> = {
  battle: 'Fell in battle', execution: 'Executed', siege: 'Died in siege',
  illness: 'Claimed by illness', rebellion: 'Slain in rebellion', seppuku: 'Committed seppuku', other: 'Unknown fate',
};

export default async function CemeteryPage() {
  const supabase = createClient();
  const { data: graves } = await supabase.from('graveyard').select('*, clans(name,color)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skull className="h-7 w-7 text-washi2" />
        <h1 className="font-display text-3xl text-washi">Cemetery of the Fallen</h1>
      </div>
      <p className="text-washi2">Those who gave their lives — or had them taken — in the wars for Japan.</p>

      {(graves ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          The graveyard is empty. The wars have only begun.
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(graves ?? []).map((g: any) => (
            <Card key={g.id} className="overflow-hidden">
              <div className="h-1.5" style={{ background: g.clans?.color ?? '#3a2e25' }} />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Skull className="h-4 w-4 text-washi2" />{g.character_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {g.image_url && <img src={g.image_url} alt={g.character_name} className="w-full h-32 object-cover rounded mb-2" />}
                {g.title && <p className="text-washi2">{g.title}</p>}
                <Badge tone="muted">{CAUSE_LABEL[g.cause] ?? g.cause}</Badge>
                {(g.clan_name || g.clans?.name) && <p className="text-washi2 text-xs">Clan: {g.clan_name ?? g.clans?.name}</p>}
                {g.season_label && <p className="text-muted-foreground text-xs">{g.season_label}</p>}
                {g.location && <p className="text-muted-foreground text-xs">at {g.location}</p>}
                {g.executed_by && <p className="text-aka text-xs">by the hand of {g.executed_by}</p>}
                {g.notes && <p className="text-washi2 text-xs italic mt-1">{g.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
