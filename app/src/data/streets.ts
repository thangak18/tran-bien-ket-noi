import { haversineMeters } from '../domain/duplicates';

export interface Street {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Danh sách đường trong phường Trấn Biên (spec 5.3)
 * Tọa độ nằm trong khung: lat 10.925–10.975, lng 106.790–106.860
 * Tâm phường: 10.950, 106.822
 */
export const STREETS: readonly Street[] = [
  { name: 'Cách Mạng Tháng Tám', lat: 10.9505, lng: 106.8225 },
  { name: 'Hưng Đạo Vương', lat: 10.9515, lng: 106.824 },
  { name: 'Nguyễn Văn Trị', lat: 10.949, lng: 106.821 },
  { name: 'Phan Đình Phùng', lat: 10.953, lng: 106.8255 },
  { name: 'Huỳnh Văn Nghệ', lat: 10.958, lng: 106.815 },
  { name: '30 Tháng 4', lat: 10.9475, lng: 106.825 },
  { name: 'Hà Huy Giáp', lat: 10.951, lng: 106.8215 },
  { name: 'Võ Thị Sáu', lat: 10.955, lng: 106.832 },
  { name: 'Phạm Văn Thuận', lat: 10.948, lng: 106.835 },
  { name: 'Nguyễn Ái Quốc', lat: 10.962, lng: 106.83 },
  { name: 'Dương Tử Giang', lat: 10.956, lng: 106.834 },
  { name: 'Trịnh Hoài Đức', lat: 10.9525, lng: 106.8235 },
] as const;

export const WARD_CENTER = {
  lat: 10.95,
  lng: 106.822,
};

/**
 * Tìm đường gần nhất theo tọa độ (spec 5.3, AC-C03-5, UT-018)
 */
export function nearestStreet(lat: number, lng: number): Street {
  let bestStreet = STREETS[0]!;
  let minDistance = haversineMeters(lat, lng, bestStreet.lat, bestStreet.lng);

  for (let i = 1; i < STREETS.length; i++) {
    const street = STREETS[i]!;
    const distance = haversineMeters(lat, lng, street.lat, street.lng);
    if (distance < minDistance) {
      minDistance = distance;
      bestStreet = street;
    }
  }

  return bestStreet;
}
