import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputDdMmYyyyProps {
  id: string;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  className?: string;
  ariaLabel?: string;
}

function isoToDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string | null {
  const match = display.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${y}-${m}-${d}`;
}

export function DateInputDdMmYyyy({
  id,
  value,
  onChange,
  className = '',
  ariaLabel,
}: DateInputDdMmYyyyProps) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const nativePickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
    setText(formatted);
    if (formatted === '') {
      onChange('');
      return;
    }
    const iso = displayToIso(formatted);
    if (iso) {
      onChange(iso);
    }
  };

  const openPicker = () => {
    const el = nativePickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Fallback to click/focus
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="dd/mm/yyyy"
        aria-label={ariaLabel}
        maxLength={10}
        className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] pl-3 pr-9 text-xs font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Chọn ngày trên lịch"
        className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-slate-200/60 hover:text-[var(--color-text)] dark:hover:bg-slate-700"
      >
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <input
        ref={nativePickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute right-0 top-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
