import React, { useEffect, useMemo, useRef, useState } from 'react';
import { shareOrCopy } from '@/lib/share';

/* ══ Lucian UX/UI Prompt #478 — Animated Reed-Solomon QR Share Card ══ */

const EC: ([number, number, number] | null)[] = [
  null,
  [10, 1, 16],
  [16, 1, 28],
  [26, 1, 44],
  [18, 2, 32],
  [24, 2, 43],
  [16, 4, 27],
  [18, 4, 31],
  [22, 4, 38],
  [22, 5, 36],
];

const AL: (number[] | null)[] = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
];

function mul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDiv(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < n - 1; i++) r.push(0);
  r.push(1);
  let g = 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mul(r[j]!, g);
      if (j + 1 < r.length) r[j]! ^= r[j + 1]!;
    }
    g = mul(g, 2);
  }
  return r;
}

function rsRem(data: number[], div: number[]): number[] {
  const r = div.map(() => 0);
  data.forEach((b) => {
    const f = b ^ (r.shift() ?? 0);
    r.push(0);
    div.forEach((c, i) => {
      r[i]! ^= mul(c, f);
    });
  });
  return r;
}

function buildQrMatrix(text: string): { n: number; M: boolean[][] } {
  const rawBytes = Array.from(new TextEncoder().encode(text));
  const maxVersion = EC.length - 1;
  // Max bytes in v9 is 5*36 - 2 = 178 bytes
  const bytes = rawBytes.slice(0, 176);
  let v = 1;
  while (v < maxVersion && 12 + bytes.length * 8 > EC[v]![1] * EC[v]![2] * 8) {
    v++;
  }
  const [ecn, nb, dpb] = EC[v]!;
  const cap = nb * dpb * 8;
  const bits: number[] = [];
  const put = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(4, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]!;
    data.push(b);
  }

  const div = rsDiv(ecn);
  const blocks: number[][] = [];
  const ecs: number[][] = [];
  for (let i = 0; i < nb; i++) {
    const blk = data.slice(i * dpb, (i + 1) * dpb);
    blocks.push(blk);
    ecs.push(rsRem(blk, div));
  }
  const all: number[] = [];
  for (let i = 0; i < dpb; i++) blocks.forEach((bk) => all.push(bk[i]!));
  for (let i = 0; i < ecn; i++) ecs.forEach((e) => all.push(e[i]!));

  const n = 17 + 4 * v;
  const M: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const F: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const set = (x: number, y: number, d: boolean) => {
    M[y]![x] = d;
    F[y]![x] = true;
  };

  for (let i = 0; i < n; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  [
    [3, 3],
    [n - 4, 3],
    [3, n - 4],
  ].forEach((c) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = c[0]! + dx;
        const y = c[1]! + dy;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
      }
    }
  });

  const al = AL[v]!;
  const last = al.length - 1;
  al.forEach((ax, ii) => {
    al.forEach((ay, jj) => {
      if ((ii === 0 && jj === 0) || (ii === 0 && jj === last) || (ii === last && jj === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  const format = (mask: number) => {
    const d = (0 << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const fb = ((d << 10) | r) ^ 0x5412;
    const bit = (i: number) => ((fb >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i));
    set(8, n - 8, true);
  };
  format(0);

  let bi = 0;
  const total = all.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const up = ((right + 1) & 2) === 0;
        const y = up ? n - 1 - vert : vert;
        if (!F[y]![x] && bi < total) {
          M[y]![x] = ((all[bi >>> 3]! >>> (7 - (bi & 7))) & 1) === 1;
          bi++;
        }
      }
    }
  }

  const MASKS: ((x: number, y: number) => boolean)[] = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  const apply = (m: number) => {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!F[y]![x] && MASKS[m]!(x, y)) M[y]![x] = !M[y]![x];
      }
    }
  };

  const penalty = () => {
    let p = 0;
    let dark = 0;
    const lines: string[] = [];
    for (let y = 0; y < n; y++) {
      let row = '';
      let col = '';
      for (let x = 0; x < n; x++) {
        row += M[y]![x] ? '1' : '0';
        col += M[x]![y] ? '1' : '0';
        if (M[y]![x]) dark++;
      }
      lines.push(row, col);
    }
    lines.forEach((s) => {
      (s.match(/0{5,}|1{5,}/g) || []).forEach((r) => {
        p += r.length - 2;
      });
      p += 40 * (s.match(/(?=10111010000|00001011101)/g) || []).length;
    });
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = M[y]![x];
        if (c === M[y]![x + 1] && c === M[y + 1]![x] && c === M[y + 1]![x + 1]) p += 3;
      }
    }
    return p + 10 * Math.floor(Math.abs((dark * 20) / (n * n) - 10));
  };

  let best = 0;
  let bestP = Infinity;
  for (let m = 0; m < 8; m++) {
    apply(m);
    format(m);
    const sc = penalty();
    if (sc < bestP) {
      bestP = sc;
      best = m;
    }
    apply(m);
  }
  apply(best);
  format(best);
  return { n, M };
}

export interface QrShareCardProps {
  url: string;
  title?: string;
  text?: string;
  copyLabel?: string;
  copiedLabel?: string;
  onCopied?: () => void;
}

export const QrShareCard: React.FC<QrShareCardProps> = ({
  url,
  title = 'Trấn Biên Kết Nối',
  text,
  copyLabel = 'Sao chép liên kết',
  copiedLabel = 'Đã sao chép',
  onCopied,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number>(0);
  const [isIn, setIsIn] = useState(false);
  const [isOk, setIsOk] = useState(false);
  const [liveMsg, setLiveMsg] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setIsIn(true), 40);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const { viewBoxSize, pathD, eyes } = useMemo(() => {
    const Q = buildQrMatrix(url || 'https://tranbien.vn');
    const n = Q.n;
    const pad = 3;
    const W = n + pad * 2;
    let d = '';
    const inFinder = (x: number, y: number) =>
      (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (Q.M[y]![x] && !inFinder(x, y)) {
          d += `M${x + pad + 0.06} ${y + pad + 0.06}h.88v.88h-.88z`;
        }
      }
    }
    const eyeCoords: [number, number][] = [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ];
    return {
      viewBoxSize: W,
      pathD: d,
      eyes: eyeCoords.map(([cx, cy]) => ({
        X: cx + pad,
        Y: cy + pad,
      })),
    };
  }, [url]);

  const displayUrl = useMemo(() => url.replace(/^https?:\/\//, ''), [url]);

  const handleCopy = async () => {
    await shareOrCopy({
      title,
      text: text || title,
      url,
    });
    setIsOk(false);
    window.requestAnimationFrame(() => {
      setIsOk(true);
    });
    setLiveMsg('Đã sao chép liên kết');
    onCopied?.();
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsOk(false);
      setLiveMsg('');
    }, 2200);
  };

  return (
    <div
      ref={rootRef}
      data-testid="qr-share-card"
      className={`ux u478 ${isIn ? 'is-in' : ''}`}
      data-url={url}
    >
      <section className="u478-c">
        <div className="u478-q">
          <svg
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            role="img"
            aria-label={`Mã QR chia sẻ: ${url}`}
            shapeRendering="geometricPrecision"
          >
            <path className="m" d={pathD} />
            {eyes.map((eye, idx) => (
              <React.Fragment key={idx}>
                <rect
                  className="f"
                  x={eye.X + 0.5}
                  y={eye.Y + 0.5}
                  width="6"
                  height="6"
                  rx="1.7"
                  strokeWidth="1"
                />
                <rect className="e" x={eye.X + 2} y={eye.Y + 2} width="3" height="3" rx="0.9" />
              </React.Fragment>
            ))}
          </svg>
          <span className="u478-br" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="u478-sc" aria-hidden="true">
            <i />
          </span>
        </div>

        <p className="u478-u" title={url}>
          {displayUrl}
        </p>

        <button type="button" onClick={handleCopy} className={`u478-cp ${isOk ? 'is-ok' : ''}`}>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1" />
              <path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1" />
            </svg>
            {copyLabel}
          </span>
          <span aria-hidden="true">
            <svg className="ck" viewBox="0 0 24 24">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            {copiedLabel}
          </span>
        </button>
      </section>
      <p className="u478-live" role="status">
        {liveMsg}
      </p>
    </div>
  );
};
