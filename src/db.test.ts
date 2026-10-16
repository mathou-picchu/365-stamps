import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { listDays, nextDayNumber, replaceAllDays, saveDay } from './db';
import type { DayEntry } from './types';

function makeDay(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    dayNumber: 1,
    theme: 'Rouge',
    photo: { id: 'ph1', blob: new Blob(['x'], { type: 'image/jpeg' }) },
    note: 'un souvenir',
    takenAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

beforeEach(async () => {
  await replaceAllDays([]);
});

describe('db', () => {
  it('enregistre puis liste un jour', async () => {
    await saveDay(makeDay());
    const days = await listDays();
    expect(days).toHaveLength(1);
    expect(days[0].theme).toBe('Rouge');
  });

  it('liste les jours les plus récents en premier', async () => {
    await saveDay(makeDay({ dayNumber: 1 }));
    await saveDay(makeDay({ dayNumber: 2 }));
    expect((await listDays()).map((d) => d.dayNumber)).toEqual([2, 1]);
  });

  it('met à jour une entrée existante (même dayNumber)', async () => {
    await saveDay(makeDay());
    await saveDay(makeDay({ note: 'nouveau souvenir', updatedAt: 1500 }));
    const days = await listDays();
    expect(days).toHaveLength(1);
    expect(days[0].note).toBe('nouveau souvenir');
  });

  it('remplace toutes les entrées', async () => {
    await saveDay(makeDay());
    await replaceAllDays([makeDay({ dayNumber: 2 }), makeDay({ dayNumber: 3 })]);
    expect((await listDays()).map((d) => d.dayNumber).sort()).toEqual([2, 3]);
  });

  it('abandonne la transaction si une entrée est invalide (données intactes)', async () => {
    await saveDay(makeDay());
    await expect(
      replaceAllDays([makeDay({ dayNumber: undefined as unknown as number })]),
    ).rejects.toThrow();
    expect((await listDays()).map((d) => d.dayNumber)).toEqual([1]);
  });
});

describe('nextDayNumber', () => {
  it('retourne 1 pour une liste vide', () => {
    expect(nextDayNumber([])).toBe(1);
  });

  it('retourne le maximum + 1', () => {
    const days = [makeDay({ dayNumber: 3 }), makeDay({ dayNumber: 7 })];
    expect(nextDayNumber(days)).toBe(8);
  });
});
