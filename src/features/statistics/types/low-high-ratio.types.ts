export type LowHighDominant = 'LOW' | 'HIGH' | 'SAME';

export interface LowHighRatio {
  low: number;
  high: number;
  difference: number;
  dominant: LowHighDominant;
}

export function dominantLabel(dominant: LowHighDominant): string {
  if (dominant === 'LOW') return 'Low';
  if (dominant === 'HIGH') return 'High';
  return 'Same';
}
