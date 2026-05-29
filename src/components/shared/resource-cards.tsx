import { Coins, Wheat, Users, Rss } from 'lucide-react';
import { fmt } from '@/lib/utils';

const ICONS = { koku: Coins, food: Wheat, population: Users, horses: Rss };

export function ResourceCard({
  type, value, sub, accent,
}: { type: 'koku' | 'food' | 'population' | 'horses'; value: number; sub?: string; accent?: string }) {
  const Icon = ICONS[type];
  const labels = { koku: 'Koku', food: 'Rice / Food', population: 'Population', horses: 'Warhorses' };
  const colors = {
    koku: 'text-kin border-kin2',
    food: 'text-green-300 border-moss',
    population: 'text-washi border-chairo',
    horses: 'text-amber-200 border-amber-700',
  };
  return (
    <div className={`washi-panel rounded-lg p-4 border-l-4 ${colors[type]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{labels[type]}</span>
        <Icon className={`h-4 w-4 ${colors[type].split(' ')[0]}`} />
      </div>
      <div className={`font-display text-2xl ${colors[type].split(' ')[0]}`}>{fmt(value)}</div>
      {sub && <div className="text-xs text-washi2 mt-0.5">{sub}</div>}
    </div>
  );
}

export function ResourceRow({ koku, food, population, horses }: { koku: number; food: number; population: number; horses: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <ResourceCard type="koku" value={koku} />
      <ResourceCard type="food" value={food} />
      <ResourceCard type="population" value={population} />
      <ResourceCard type="horses" value={horses} />
    </div>
  );
}
