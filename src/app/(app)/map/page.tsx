import { JapanMap } from '@/components/map/japan-map';


export const dynamic = 'force-dynamic';

export default function MapPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl text-washi">Map of Japan</h1>
        <p className="text-washi2">Survey the realm. Click any province to inspect it. Enemy lands lie under the fog of war.</p>
      </div>
      <JapanMap />
    </div>
  );
}
