const DRAW_KEY = 'stamps365-draw';

interface DailyDraw {
  dayNumber: number;
  theme: string;
}

export function remainingThemes(themes: string[], used: string[]): string[] {
  const remaining = [...themes];
  for (const theme of used) {
    const index = remaining.indexOf(theme);
    if (index !== -1) remaining.splice(index, 1);
  }
  return remaining;
}

export function drawTheme(candidates: string[], exclude?: string): string | null {
  const pool = exclude === undefined ? candidates : candidates.filter((t) => t !== exclude);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function loadDailyDraw(dayNumber: number): string | null {
  try {
    const raw = localStorage.getItem(DRAW_KEY);
    if (raw === null) return null;
    const draw: unknown = JSON.parse(raw);
    if (
      typeof draw === 'object' &&
      draw !== null &&
      'dayNumber' in draw &&
      'theme' in draw &&
      (draw as DailyDraw).dayNumber === dayNumber &&
      typeof (draw as DailyDraw).theme === 'string'
    ) {
      return (draw as DailyDraw).theme;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDailyDraw(dayNumber: number, theme: string): void {
  try {
    localStorage.setItem(DRAW_KEY, JSON.stringify({ dayNumber, theme } satisfies DailyDraw));
  } catch {
    // localStorage indisponible (mode privé) : la pioche restera en mémoire
  }
}
