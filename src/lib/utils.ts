import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(n: number | null | undefined): string {
  if (n == null) return '0';
  return Math.round(n).toLocaleString('en-US');
}

export const SEASON_LABEL: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

export const SEASON_ICON: Record<string, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍁',
  winter: '❄️',
};

export function seasonLabel(season?: string, year?: number) {
  if (!season) return 'No active season';
  return `${SEASON_LABEL[season] ?? season} ${year ?? ''}`.trim();
}

/** Map troop counts to fog-of-war hints */
export function troopHint(totalStrength: number): 'none' | 'small' | 'medium' | 'large' {
  if (totalStrength <= 0) return 'none';
  if (totalStrength < 800) return 'small';
  if (totalStrength < 3000) return 'medium';
  return 'large';
}

export const TROOP_HINT_LABEL: Record<string, string> = {
  none: 'No visible presence',
  small: 'Small military presence',
  medium: 'Medium army',
  large: 'Large army',
  unknown: 'Unknown strength',
};

/** Devastation multiplier: 0 dev = 1.0 output, 100 dev = 0.2 output */
export function devastationMultiplier(level: number): number {
  return Math.max(0.2, 1 - level / 125);
}

export const ROLE_LABEL: Record<string, string> = {
  gm: 'Game Master',
  daimyo: 'Daimyo',
  vassal: 'Vassal',
  commander: 'Commander',
  unassigned: 'Unaligned Ronin',
};
