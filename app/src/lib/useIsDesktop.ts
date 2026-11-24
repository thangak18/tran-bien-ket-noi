import { useState, useEffect } from 'react';

export function useIsDesktop(query = '(min-width: 1024px)'): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia(query);
    const update = (e: MediaQueryListEvent | MediaQueryList) => setIsDesktop(e.matches);
    setIsDesktop(media.matches);

    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    } else {
      media.addListener(update);
      return () => media.removeListener(update);
    }
  }, [query]);

  return isDesktop;
}
