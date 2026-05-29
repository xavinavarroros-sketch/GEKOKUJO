import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Crown, Shield, Castle, Flag } from 'lucide-react';
import { fmt } from '@/lib/utils';


export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'green' | 'red' | 'gold' | 'muted'> = {
  active: 'green', destroyed: 'muted', subjugated: 'muted', rebel: 'red', shogunate: 'gold',
};

export default async function ClansPage() {
  const supabase = createClient();
  const [{ data: clans }, { data: profiles }, { data: provinces }] = await Promise.all([
    supabase.from('clans').select('*').order('prestige', { ascending: false }),
    supabase.from('profiles').select('id,character_name,role,clan_id'),
    supabase.from('provinces').select('id,name,clan_id,has_main_castle'),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl text-washi">The Great Houses</h1>
        <p className="text-washi2">The clans vying for supremacy across the realm.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {(clans ?? []).map((clan: any) => {
          const members = (profiles ?? []).filter((p: any) => p.clan_id === clan.id);
          const daimyo = members.find((m: any) => m.role === 'daimyo');
          const vassals = members.filter((m: any) => m.role === 'vassal');
          const clanProvinces = (provinces ?? []).filter((p: any) => p.clan_id === clan.id);
          const capital = clanProvinces.find((p: any) => p.id === clan.capital_province_id);

          return (
            <Card key={clan.id} className="overflow-hidden">
              <div className="h-2" style={{ background: clan.color }} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: clan.color }} />
                    {clan.name} Clan
                  </CardTitle>
                  <div className="flex gap-1.5">
                    {clan.controls_shogunate && <Badge tone="gold"><Crown className="h-3 w-3 mr-1" />Shogunate</Badge>}
                    <Badge tone={STATUS_TONE[clan.status] ?? 'default'}>{clan.status}</Badge>
                  </div>
                </div>
                <p className="text-washi2 text-sm mt-1">{clan.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini label="Provinces" value={fmt(clanProvinces.length)} />
                  <Mini label="Prestige" value={fmt(clan.prestige)} />
                  <Mini label="Members" value={fmt(members.length)} />
                </div>

                <div className="space-y-1.5">
                  <Line icon={Crown} label="Daimyo" value={daimyo?.character_name ?? 'Vacant'} />
                  <Line icon={Castle} label="Capital" value={capital?.name ?? 'Unknown'} />
                  <Line icon={Shield} label="Vassals"
                    value={vassals.length ? vassals.map((v: any) => v.character_name).join(', ') : 'None sworn'} />
                  <Line icon={Flag} label="Territory"
                    value={clanProvinces.length ? clanProvinces.map((p: any) => p.name).join(', ') : 'Landless'} />
                </div>

                {clan.laws && (
                  <div className="rounded-md bg-kuro2 border border-border p-3">
                    <div className="text-kin text-xs font-display mb-1">Clan Law</div>
                    <p className="text-washi2 text-sm italic">&ldquo;{clan.laws}&rdquo;</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-kuro2 border border-border py-2">
      <div className="font-display text-washi text-lg">{value}</div>
      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</div>
    </div>
  );
}
function Line({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-kin shrink-0 mt-0.5" />
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-washi">{value}</span>
    </div>
  );
}
