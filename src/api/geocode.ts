// src/api/geocode.ts  (Nominatim MVP + language support + keeps your params)
export type GeoPick = { label: string; lat: number; lng: number };

export type GeoSearchOpts = {
  lang?: string; // "tr" | "en" etc (from i18n)
  countrycodes?: string; // default: "tr"
  limit?: number; // default: 6
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

export async function reversePlace(lat: number, lng: number, opts: GeoSearchOpts = {}): Promise<GeoPick | null> {
  const lang = (opts.lang || "tr").toLowerCase();

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", lang);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": lang,
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as any;
  const label = String(data?.display_name ?? "").trim();
  return {
    label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat: Number(lat),
    lng: Number(lng),
  };
}