import Link from 'next/link';
import { Button } from '@/components/ui';
import { getSessionProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';


export const dynamic = 'force-dynamic';

export default async function Home() {
  const { user } = await getSessionProfile();
  if (user) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 20%, rgba(160,31,31,0.25), transparent 60%)' }} />

      <div className="relative z-10 text-center max-w-2xl animate-fade-in">
        <div className="hanko-seal w-20 h-20 mx-auto mb-8 text-4xl">戦</div>
        <h1 className="font-display text-5xl md:text-6xl text-washi text-glow-gold mb-3">Sengoku Jidai</h1>
        <p className="font-display text-kin text-xl mb-2 tracking-widest">下克上 · THE AGE OF WARRING STATES</p>
        <p className="text-washi2 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          The shogun&apos;s authority has shattered. Daimyo raise their banners, vassals scheme for power,
          and the realm descends into war. Levy your peasants, command your samurai, dispatch your shinobi,
          and seize the mandate of heaven.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/auth/register"><Button variant="gold" size="lg">Forge Your Banner</Button></Link>
          <Link href="/auth/login"><Button variant="outline" size="lg">Enter the Realm</Button></Link>
        </div>

        <p className="mt-12 text-muted-foreground text-sm">
          A persistent multiplayer strategy game · Koku · Rice · Population · Warhorses
        </p>
      </div>
    </main>
  );
}
