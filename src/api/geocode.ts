// src/api/geocode.ts  (Nominatim MVP + language support + keeps your params)
export type GeoPick = { label: string; lat: number; lng: number };

export type GeoSearchOpts = {
  lang?: string;          // "tr" | "en" etc (from i18n)
  countrycodes?: string;  // default: "tr"
  limit?: number;         // default: 6
};

export async function searchPlace(q: string, opts: GeoSearchOpts = {}): Promise<GeoPick[]> {
  const query = q.trim();
  if (!query) return [];

  const lang = (opts.lang || "tr").toLowerCase();
  const countrycodes = (opts.countrycodes || "tr").toLowerCase();
  const limit = String(opts.limit ?? 6);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("countrycodes", countrycodes);
  url.searchParams.set("limit", limit);
  url.searchParams.set("q", query);

  // Language preference:
  // - Nominatim respects the HTTP Accept-Language header
  // - many instances also accept accept-language as a query param
  url.searchParams.set("accept-language", lang);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": lang,
    },
  });

  if (!res.ok) throw new Error(`Geocode failed (${res.status})`);

  const data = (await res.json()) as any[];
  return data.map((x) => ({
    label: String(x.display_name ?? ""),
    lat: Number(x.lat),
    lng: Number(x.lon),
  }));
}
