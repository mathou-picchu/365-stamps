import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChallengeComplete, loadThemes, ThemesError, validateThemes } from './themes';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('validateThemes', () => {
  it('accepte un tableau de chaînes non vides', () => {
    expect(validateThemes(['Rouge', 'Eau'])).toEqual(['Rouge', 'Eau']);
  });

  it('trimme les thèmes', () => {
    expect(validateThemes(['  Rouge  '])).toEqual(['Rouge']);
  });

  it('rejette un non-tableau', () => {
    expect(() => validateThemes('Rouge')).toThrow(ThemesError);
  });

  it('rejette un tableau vide', () => {
    expect(() => validateThemes([])).toThrow(ThemesError);
  });

  it("rejette un thème qui n'est pas une chaîne", () => {
    expect(() => validateThemes(['Rouge', 42])).toThrow(ThemesError);
  });

  it('rejette un thème vide', () => {
    expect(() => validateThemes(['Rouge', '   '])).toThrow(ThemesError);
  });
});

describe('loadThemes', () => {
  it('charge et valide themes.json', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ['Rouge', 'Eau'] })));
    await expect(loadThemes()).resolves.toEqual(['Rouge', 'Eau']);
  });

  it('échoue si le fichier est introuvable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    await expect(loadThemes()).rejects.toThrow(ThemesError);
  });

  it('échoue si le réseau est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network error');
    }));
    await expect(loadThemes()).rejects.toThrow(ThemesError);
  });

  it('échoue si le JSON est invalide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    })));
    await expect(loadThemes()).rejects.toThrow(ThemesError);
  });

  it('échoue si le contenu est invalide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => 'pas un tableau' })));
    await expect(loadThemes()).rejects.toThrow(ThemesError);
  });
});

describe('isChallengeComplete', () => {
  it('est fausse avant la fin du défi', () => {
    expect(isChallengeComplete(2, 5)).toBe(false);
  });

  it('est vraie quand tous les thèmes sont photographiés', () => {
    expect(isChallengeComplete(5, 5)).toBe(true);
  });

  it('est vraie au-delà de la fin (themes.json raccourci)', () => {
    expect(isChallengeComplete(6, 5)).toBe(true);
  });
});
