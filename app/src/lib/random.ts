/**
 * Số nguyên ngẫu nhiên trong [min, maxExclusive) từ bộ sinh số mật mã của trình duyệt (crypto.getRandomValues),
 * loại bỏ độ lệch modulo. Dùng cho mã bí mật thay cho Math.random().
 */
export function randomInt(min: number, maxExclusive: number): number {
  const range = maxExclusive - min;
  if (!Number.isInteger(range) || range <= 0 || range > 0x100000000) {
    throw new RangeError('Khoảng sinh số ngẫu nhiên không hợp lệ');
  }
  const limit = Math.floor(0x100000000 / range) * range;
  const buf = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buf);
  } while (buf[0]! >= limit);
  return min + (buf[0]! % range);
}
