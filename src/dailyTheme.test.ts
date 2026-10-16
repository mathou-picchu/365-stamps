import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawTheme, loadDailyDraw, remainingThemes, saveDailyDraw } from './dailyTheme';

const DRAW_KEY = 'stamps365-draw';

describe('remainingThemes', () => {
  it('retourne le paquet complet quand aucune entrée', () => {
    expect(remainingThemes(['A', 'B'], [])).toEqual(['A', 'B']);
  });

  it('ne retire qu’une occurrence par entrée (multicollection)', () => {
    expect(remainingThemes(['Ton choix', 'Ton choix', 'A'], ['Ton choix'])).toEqual([
      'Ton choix',
      'A',
    ]);
  });

  it('retire plusieurs occurrences du même thème', () => {
    expect(remainingThemes(['B', 'B', 'A'], ['B', 'B'])).toEqual(['A']);
  });

  it('ignore les thèmes des entrées absents du paquet', () => {
    expect(remainingThemes(['A'], ['Inconnu'])).toEqual(['A']);
  });
});

describe('drawTheme', () => {
  it('tire un thème au hasard parmi les candidats', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(drawTheme(['A', 'B', 'C'])).toBe('B');
  });

  it('exclut le thème courant du tirage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(drawTheme(['A', 'B', 'C'], 'B')).toBe('C');
  });

  it('retourne null sans candidats', () => {
    expect(drawTheme([])).toBeNull();
  });

  it('retourne null quand il ne reste que le thème exclu', () => {
    expect(drawTheme(['A'], 'A')).toBeNull();
  });
});

describe('pioche du jour (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sauvegarde puis recharge la pioche du jour', () => {
    saveDailyDraw(12, 'Un timbre');
    expect(loadDailyDraw(12)).toBe('Un timbre');
  });

  it('ignore la pioche stockée pour un autre jour', () => {
    saveDailyDraw(12, 'Un timbre');
    expect(loadDailyDraw(13)).toBeNull();
  });

  it('retourne null si le stockage contient du JSON invalide', () => {
    localStorage.setItem(DRAW_KEY, '{oops');
    expect(loadDailyDraw(12)).toBeNull();
  });

  it('retourne null si localStorage est indisponible en lecture', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(loadDailyDraw(12)).toBeNull();
  });

  it('avale les erreurs localStorage en écriture', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveDailyDraw(12, 'Un timbre')).not.toThrow();
  });
});
