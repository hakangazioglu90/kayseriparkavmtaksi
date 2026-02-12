// src/api/route.ts  (OSRM public router MVP)
export type RouteResult = { distanceKm: number; geojson: any };

export async function getRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<RouteResult> {
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  const res = await fetch(url.toString());
  const json = await res.json();
  const r = json.routes?.[0];
  if (!r) throw new Error("No route");

  return {
    distanceKm: r.distance / 1000,
    geojson: r.geometry,
  };
}
