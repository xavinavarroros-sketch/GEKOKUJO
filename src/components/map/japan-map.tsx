'use client';
import { useEffect, useState } from 'react';
import type { PublicProvinceView } from '@/lib/visibility';
import { ProvinceModal } from './province-modal';
import { TROOP_HINT_LABEL } from '@/lib/utils';
import { Castle, Flame, Swords, Eye } from 'lucide-react';

/**
 * Stylized SVG outline of the four main islands of Japan.
 * Provinces are rendered as clickable markers positioned by map_x/map_y
 * over the island silhouette. Fog of war dims unseen enemy territory.
 */
const ISLANDS = {
  // Honshu (main), Kyushu, Shikoku, Hokkaido — stylized blobs
  honshu: 'M540,360 C600,330 660,360 700,420 C740,470 720,540 660,580 C600,610 560,600 520,560 C470,520 430,560 400,560 C360,560 340,540 360,510 C390,470 450,470 480,440 C500,420 510,380 540,360 Z',
  kyushu: 'M120,690 C160,670 210,700 210,750 C210,800 160,800 130,780 C100,760 90,710 120,690 Z',
  shikoku: 'M300,620 C340,610 380,625 380,650 C380,675 330,680 305,665 C285,653 280,628 300,620 Z',
  hokkaido: 'M640,250 C690,230 740,260 730,310 C720,350 660,350 635,320 C615,295 615,265 640,250 Z',
};

export function JapanMap() {
  const [provinces, setProvinces] = useState<PublicProvinceView[]>([]);
  const [selected, setSelected] = useState<PublicProvinceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGm, setIsGm] = useState(false);
  const [myClanId, setMyClanId] = useState<string | null>(null);
  const [spied, setSpied] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch('/api/provinces/map');
    const json = await res.json();
    if (res.ok) {
      setProvinces(json.provinces);
      setIsGm(json.isGm);
      setMyClanId(json.myClanId);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-washi2 text-center py-20">Unfurling the map…</div>;

  return (
    <div className="washi-panel rounded-lg p-2 md:p-4 relative">
      <svg viewBox="0 0 800 850" className="w-full h-auto select-none" style={{ maxHeight: '70vh' }}>
        <defs>
          <radialGradient id="sea" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#1a2530" />
            <stop offset="100%" stopColor="#0d141b" />
          </radialGradient>
          <pattern id="paper" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#c8b78f" opacity="0.04" />
          </pattern>
        </defs>

        <rect width="800" height="850" fill="url(#sea)" />
        {/* decorative latitude lines */}
        {[200, 350, 500, 650].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#27384a" strokeWidth="0.5" opacity="0.3" />
        ))}

        {/* islands */}
        {Object.values(ISLANDS).map((d, i) => (
          <path key={i} d={d} fill="#4a3a2a" stroke="#9c7c2c" strokeWidth="1.5" opacity="0.85" />
        ))}
        {Object.values(ISLANDS).map((d, i) => (
          <path key={`p${i}`} d={d} fill="url(#paper)" />
        ))}

        {/* province markers */}
        {provinces.map((p) => {
          if (p.map_x == null || p.map_y == null) return null;
          const color = p.clan_color ?? '#5b4636';
          const dim = !p.visible && !isGm;
          const dev = p.details?.devastation_level ?? 0;
          return (
            <g key={p.id} className="map-province" onClick={() => setSelected(p)}
               transform={`translate(${p.map_x},${p.map_y})`} opacity={dim ? 0.55 : 1}>
              {/* fog overlay ring for unseen */}
              <circle r="20" fill={color} fillOpacity={dim ? 0.25 : 0.35}
                stroke={color} strokeWidth="1.5" />
              {dev > 40 && <circle r="20" className="devastated" fillOpacity="0.5" />}
              {p.has_main_castle && (
                <text textAnchor="middle" y="-22" fontSize="12" fill="#c9a449">⛩</text>
              )}
              {/* state icons */}
              {p.state === 'under_siege' && <text textAnchor="middle" y="6" fontSize="16">🔥</text>}
              {p.state === 'at_war' && <text textAnchor="middle" y="6" fontSize="14">⚔️</text>}
              {p.state === 'rebellion' && <text textAnchor="middle" y="6" fontSize="14">🚩</text>}
              {/* spy marker (only this clan sees) */}
              {p.visible && p.details && !p.clan_id && null}
              <text textAnchor="middle" y="36" fontSize="11" fill="#e7dcc4"
                style={{ fontFamily: 'serif', pointerEvents: 'none' }}>
                {p.name}
              </text>
              {/* troop hint for unseen */}
              {dim && p.troop_hint !== 'none' && (
                <text textAnchor="middle" y="50" fontSize="8" fill="#9c8d72">
                  {p.troop_hint === 'large' ? '▮▮▮' : p.troop_hint === 'medium' ? '▮▮' : '▮'}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-washi2 px-2">
        <span className="flex items-center gap-1"><Castle className="h-3 w-3 text-kin" /> Castle</span>
        <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-aka" /> Siege</span>
        <span className="flex items-center gap-1"><Swords className="h-3 w-3" /> War</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full fog inline-block" /> Fog of war (limited intel)</span>
      </div>

      {selected && (
        <ProvinceModal province={selected} isGm={isGm} myClanId={myClanId}
          onClose={() => setSelected(null)} onChange={load} />
      )}
    </div>
  );
}
