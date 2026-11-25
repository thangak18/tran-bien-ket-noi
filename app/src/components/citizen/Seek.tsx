import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/* ══ Seek ═════════════════════════════════════════════════
   A search icon that becomes a search field.
   ONE OBJECT, NOT TWO. Everything here follows from that. */

const springOf = (tune: number) => ({
  /* stiffness: how hard it is pulled toward the target */
  k: 0.08 + (tune / 100) * 0.16,
  /* decay, per frame: how much of the velocity survives */
  d: 0.62 + (tune / 100) * 0.2,
});

function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [target, tune, instant]);

  return at;
}

const stillness = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const SHUT = 48;
const LENS = 20;
const INSET = (SHUT - LENS) / 2;
const CORNER = 24;

const WIDE = 280;
const SNUG = 220;

export interface SeekProps {
  /** how far it leans toward the cursor, 0..100 */
  give?: number;
  /** how the width settles, 0..100 */
  spring?: number;
  /** the field's resting width, px */
  width?: number;
  /** the field's own corner, 0..24 */
  corner?: number;
  /** optional controlled search value */
  value?: string;
  /** callback when value changes */
  onValueChange?: (next: string) => void;
  /** optional controlled open state */
  open?: boolean;
  /** callback when open state changes */
  onOpenChange?: (next: boolean) => void;
  /** placeholder text */
  placeholder?: string;
  /** accessible label for the closed trigger button */
  buttonAriaLabel?: string;
  /** accessible label for the search input */
  inputAriaLabel?: string;
  /** suppress software keyboard on touch devices (true for standalone wall demos, false for real search) */
  suppressTouchKeyboard?: boolean;
}

export function Seek({
  give = 50,
  spring = 20,
  width,
  corner = CORNER,
  value: controlledValue,
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  placeholder = 'Tìm mã TB-xxxx, tên đường, sự cố...',
  buttonAriaLabel = 'Tìm kiếm phản ánh',
  inputAriaLabel = 'Nhập từ khóa tìm kiếm phản ánh',
  suppressTouchKeyboard = false,
}: SeekProps = {}) {
  const [snug, setSnug] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 760px)').matches
  );
  const [touch, setTouch] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const room = window.matchMedia('(max-width: 760px)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const read = () => {
      setSnug(room.matches);
      setTouch(coarse.matches);
    };
    room.addEventListener?.('change', read);
    coarse.addEventListener?.('change', read);
    return () => {
      room.removeEventListener?.('change', read);
      coarse.removeEventListener?.('change', read);
    };
  }, []);

  const span = width ?? (snug ? SNUG : WIDE);

  const frame = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  const beat = useRef(0);
  const rest = useRef(0);

  const [internalOpen, setInternalOpen] = useState(false);
  const [press, setPress] = useState(false);
  const [internalValue, setInternalValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [lean, setLean] = useState({ x: 0, y: 0 });
  const still = stillness();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const setValue = (next: string) => {
    if (controlledValue === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  useEffect(
    () => () => {
      window.clearTimeout(beat.current);
      window.clearTimeout(rest.current);
    },
    []
  );

  const target = open ? Math.max(SHUT, span) : SHUT;
  const w = useSpring(target, clamp(spring, 0, 100), still);

  /* how far through the transformation, 0 shut and 1 open */
  const p = clamp((w - SHUT) / Math.max(1, Math.max(SHUT, span) - SHUT), 0, 1);

  /* ── the magnet ────────────────────────────────────────── */
  useEffect(() => {
    const el = frame.current;
    if (!el || open || still) return;
    let raf = 0;
    let at = { x: 0, y: 0 };
    const publish = () => {
      raf = 0;
      setLean(at);
    };
    const read = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const k = b.width / (el.offsetWidth || b.width) || 1;
      const dx = (e.clientX - (b.left + b.width / 2)) / k;
      const dy = (e.clientY - (b.top + b.height / 2)) / k;
      const d = Math.hypot(dx, dy);
      const R = 110;
      if (d > R) {
        if (at.x || at.y) {
          at = { x: 0, y: 0 };
          if (!raf) raf = requestAnimationFrame(publish);
        }
        return;
      }
      const pull = (1 - d / R) ** 1.4 * (2 + (give / 100) * 5);
      at = { x: (dx / (d || 1)) * pull, y: (dy / (d || 1)) * pull };
      if (!raf) raf = requestAnimationFrame(publish);
    };
    const gone = () => {
      at = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(publish);
    };
    document.addEventListener('pointermove', read, { passive: true });
    document.addEventListener('pointerleave', gone);
    return () => {
      document.removeEventListener('pointermove', read);
      document.removeEventListener('pointerleave', gone);
      cancelAnimationFrame(raf);
    };
  }, [open, give, still]);

  /* ── opening: compress, then expand, then focus ────────── */
  const start = () => {
    if (open) return;
    setPress(true);
    setLean({ x: 0, y: 0 });
    window.clearTimeout(beat.current);
    beat.current = window.setTimeout(
      () => {
        setPress(false);
        setOpen(true);
        field.current?.focus();
      },
      still ? 0 : 90
    );
  };

  const away = () => {
    if (value.trim()) return;
    setOpen(false);
  };

  const tapped = () => {
    setBusy(true);
    window.clearTimeout(rest.current);
    rest.current = window.setTimeout(() => setBusy(false), 340);
  };

  const handleClearOrClose = () => {
    if (value) {
      setValue('');
      field.current?.focus();
    } else {
      setOpen(false);
      field.current?.blur();
    }
  };

  return (
    <div
      className="sek"
      ref={frame}
      data-open={open}
      data-press={press}
      data-busy={busy}
      data-flat={still || undefined}
      style={
        {
          '--sek-r': `${clamp(corner, 0, CORNER)}px`,
          '--w': `${w.toFixed(2)}px`,
          '--p': p.toFixed(3),
          '--say': clamp((p - 0.55) / 0.45, 0, 1).toFixed(3),
          '--lx': `${lean.x.toFixed(2)}px`,
          '--ly': `${lean.y.toFixed(2)}px`,
          '--inset': `${INSET}px`,
          '--lens': `${LENS}px`,
          '--shut': `${SHUT}px`,
          '--frame': `${Math.max(SHUT, span) + 26}px`,
          '--frameh': `${SHUT + 40}px`,
        } as React.CSSProperties
      }
    >
      <div className="sek-skin">
        <svg className="sek-lens" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="7.6" cy="7.6" r="5.4" />
          <path d="M11.6 11.6 L15.4 15.4" />
        </svg>

        <input
          ref={field}
          className="sek-field"
          type="text"
          value={value}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          inputMode={suppressTouchKeyboard && touch ? 'none' : undefined}
          tabIndex={open ? 0 : -1}
          onChange={(e) => {
            if (!open) {
              window.clearTimeout(beat.current);
              setPress(false);
              setOpen(true);
            }
            setValue(e.target.value);
            tapped();
          }}
          onBlur={away}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            setValue('');
            setOpen(false);
            field.current?.blur();
          }}
        />

        {open && (
          <button
            type="button"
            className="sek-clear"
            aria-label="Đóng tìm kiếm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearOrClose}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {!open && (
          <button
            type="button"
            className="sek-hit"
            aria-label={buttonAriaLabel}
            aria-expanded={open}
            onClick={start}
          />
        )}
      </div>
    </div>
  );
}
