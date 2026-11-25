import { nearestStreet } from '@/data/streets';

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    residential?: string;
    hamlet?: string;
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city_district?: string;
    county?: string;
    city?: string;
    state?: string;
  };
}

export function formatReverseGeocodedAddress(
  data: NominatimReverseResponse | null,
  fallback: string
): string {
  const addr = data?.address;
  if (!addr) return fallback;

  const street = addr.road || addr.pedestrian || addr.residential || addr.hamlet;
  const house = addr.house_number;
  const ward = addr.quarter || addr.suburb || addr.neighbourhood || addr.village || addr.town;
  const area = addr.city_district || addr.city || addr.county || addr.state;

  const parts: string[] = [];
  if (street) {
    parts.push(house ? `${house} ${street}` : street);
  }
  if (ward && !parts.some((p) => p.toLowerCase().includes(ward.toLowerCase()))) {
    parts.push(ward);
  }
  if (area && !parts.some((p) => p.toLowerCase().includes(area.toLowerCase()))) {
    parts.push(area);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (data?.display_name) {
    const shortDisplay = data.display_name
      .split(',')
      .slice(0, 3)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
    if (shortDisplay) return shortDisplay;
  }

  return fallback;
}

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  const fallback = `Đ. ${nearestStreet(lat, lng).name}, P. Trấn Biên`;
  if (
    typeof fetch !== 'function' ||
    (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom'))
  ) {
    return fallback;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as NominatimReverseResponse;
    return formatReverseGeocodedAddress(data, fallback);
  } catch {
    return fallback;
  }
}
