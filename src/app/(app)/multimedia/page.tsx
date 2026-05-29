import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Image as ImageIcon } from 'lucide-react';


export const dynamic = 'force-dynamic';

export default async function MultimediaPage() {
  const supabase = createClient();
  const { data: assets } = await supabase.from('media_assets').select('*').order('created_at', { ascending: false });

  const sections = ['cover', 'lore', 'clan', 'province', 'unit', 'building', 'event', 'season'];
  const grouped = sections.map((s) => ({ section: s, items: (assets ?? []).filter((a: any) => a.section === s) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ImageIcon className="h-7 w-7 text-kin" />
        <h1 className="font-display text-3xl text-washi">Lore & Chronicles</h1>
      </div>

      {grouped.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          The Game Master has not yet inscribed the chronicles of this world.
        </CardContent></Card>
      ) : grouped.map((g) => (
        <Card key={g.section}>
          <CardHeader><CardTitle className="capitalize">{g.section}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {g.items.map((a: any) => (
              <div key={a.id} className="rounded-md overflow-hidden border border-border bg-kuro2">
                {a.url && <img src={a.url} alt={a.title ?? ''} className="w-full h-40 object-cover" />}
                <div className="p-3">
                  {a.title && <div className="font-display text-washi">{a.title}</div>}
                  {a.body && <p className="text-washi2 text-sm mt-1">{a.body}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
