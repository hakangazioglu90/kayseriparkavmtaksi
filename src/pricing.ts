// src/pricing.ts
export type VehiclePricing = { baseFareTry: number; perKmTry: number; minFareTry?: number };

export function estimatePriceTry(distanceKm: number, p: VehiclePricing): number {
  const km = Math.max(0, distanceKm);
  const raw = p.baseFareTry + km * p.perKmTry;
  const floored = p.minFareTry != null ? Math.max(raw, p.minFareTry) : raw;
  return Math.round(floored);
}
