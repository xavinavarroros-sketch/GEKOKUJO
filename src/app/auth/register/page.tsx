
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, characterName }),
    });
    const result = await res.json();

    if (!res.ok || !result.ok) {
      setLoading(false);
      return toast.error(result.error || 'Registration failed.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);

    toast.success(result.isGm ? 'Game Master account created.' : 'Your name is written. Now choose your allegiance.');
    router.push(result.isGm ? '/gm' : '/auth/choose-clan');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-md gold-edge">
        <CardHeader className="text-center">
          <div className="hanko-seal w-14 h-14 mx-auto mb-3 text-2xl">名</div>
          <CardTitle className="text-2xl">Forge Your Banner</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label>Character Name</Label>
              <Input value={characterName} onChange={(e) => setCharacterName(e.target.value)}
                placeholder="e.g. Takeda Shingen" required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                minLength={6} required />
            </div>
            <Button variant="gold" className="w-full" disabled={loading}>
              {loading ? 'Inscribing…' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-washi2 mt-4">
            Already sworn?{' '}
            <Link href="/auth/login" className="text-kin hover:underline">Enter the realm</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
