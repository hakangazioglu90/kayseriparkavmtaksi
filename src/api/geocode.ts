// src/api/geocode.ts
export type GeoPick = { label: string; lat: number; lng: number };

export type GeoSearchOpts = {
  lang?: string; // "tr" | "en" etc
  countrycodes?: string; // default: "tr"
  limit?: number; // default: 6
};

function simplifyLabel(displayName: string): string {
  const raw = String(displayName || "").trim();
  if (!raw) return raw;

  // Split and normalize parts
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Drop noise
  const drop = (p: string) =>
    /^\d+$/.test(p) || // house numbers
    /^\d{5,6}$/.test(p) || // postal codes
    /(region|bölgesi|province|ilçe|district)\b/i.test(p); // broad admin noise (keeps actual names)

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (drop(p)) continue;
    const k = p.toLowerCase();
    if (seen.has(k)) continue; // remove duplicates like Kayseri ... Kayseri
    seen.add(k);
    cleaned.push(p);
  }

  if (cleaned.length <= 3) return cleaned.join(", ");

  const countryIdx = cleaned.findIndex((p) => /^(turkey|türkiye)$/i.test(p));
  const country = countryIdx >= 0 ? cleaned[countryIdx] : cleaned[cleaned.length - 1];

  const core = countryIdx >= 0 ? cleaned.slice(0, countryIdx) : cleaned.slice(0, -1);
  const first = core[0] ?? cleaned[0];

  // Prefer admin-ish parts near the end, avoid street/neighborhood granularity
  const adminNoise = /(sokak|cadde|street|road|avenue|mahallesi|neighborhood|mah\.?|sk\.?|cd\.?)/i;
  const adminCandidates = core.slice(1).filter((p) => !adminNoise.test(p));

  const admins = (adminCandidates.length ? adminCandidates : core.slice(1)).slice(-2);

  return [first, ...admins, country].filter(Boolean).join(", ");
}

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
    label: simplifyLabel(String(x.display_name ?? "")),
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
  const full = String(data?.display_name ?? "").trim();
  return {
    label: simplifyLabel(full) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat: Number(lat),
    lng: Number(lng),
  };
}