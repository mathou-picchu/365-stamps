export class ThemesError extends Error {}

export function validateThemes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ThemesError("themes.json doit contenir un tableau d'au moins 1 thème.");
  }
  return value.map((theme, index) => {
    if (typeof theme !== 'string' || theme.trim().length === 0) {
      throw new ThemesError(`le thème #${index + 1} doit être une chaîne non vide.`);
    }
    return theme.trim();
  });
}

export async function loadThemes(): Promise<string[]> {
  let response: Response;
  try {
    response = (await fetch('themes.json')) as Response;
  } catch {
    throw new ThemesError('impossible de charger themes.json (réseau).');
  }
  if (!response.ok) {
    throw new ThemesError(`themes.json introuvable (HTTP ${String(response.status)}).`);
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new ThemesError("themes.json n'est pas un JSON valide.");
  }
  return validateThemes(parsed);
}

export function isChallengeComplete(completedDays: number, themeCount: number): boolean {
  return completedDays >= themeCount;
}
