export const PATTAMBI = { lat: 10.81, lng: 76.19 };

export function getPosition(timeout = 10000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

/** Random offset of 200–500 m in a random direction (privacy for wheelchair listings). */
export function fuzz(lat: number, lng: number) {
  const dist = 200 + Math.random() * 300;
  const angle = Math.random() * 2 * Math.PI;
  const dLat = (dist * Math.cos(angle)) / 111320;
  const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
export const directionsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;

export interface Place { name: string; lat: number; lng: number; }

/** Nominatim place search (OSM usage policy: low volume, debounce on caller side). */
export async function searchPlaces(q: string): Promise<Place[]> {
  if (q.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&accept-language=ml,en&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ name: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&accept-language=ml,en&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const j = (await res.json()) as { address?: Record<string, string>; display_name?: string };
    const a = j.address ?? {};
    return a.village || a.town || a.suburb || a.city || a.county || j.display_name?.split(",")[0] || null;
  } catch { return null; }
}

export const phoneDigits = (p: string) => p.replace(/[^\d+]/g, "");
/** wa.me needs country code digits only; assume India (+91) for 10-digit numbers. */
export function waNumber(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}
export const waLink = (phone: string, text: string) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
