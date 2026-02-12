// src/api/geocode.ts  (Nominatim MVP)
export type GeoPick = { label: string; lat: number; lng: number };

export async function searchTR(q: string): Promise<GeoPick[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("limit", "6");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  const data = (await res.json()) as any[];
  return data.map((x) => ({
    label: x.display_name,
    lat: Number(x.lat),
    lng: Number(x.lon),
  }));
}
