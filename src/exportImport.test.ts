import { describe, expect, it } from 'vitest';
import { buildExportFileName, exportDays, ImportError, parseImportFile } from './exportImport';
import type { DayEntry } from './types';

function jpegBlob(): Blob {
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: 'image/jpeg' });
}

function makeDay(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    dayNumber: 1,
    theme: 'Rouge',
    photo: { id: 'ph1', blob: jpegBlob() },
    note: 'un souvenir',
    takenAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('export / import', () => {
  it("exporte puis réimporte une entrée à l'identique", async () => {
    const json = await exportDays([makeDay()]);
    const parsed = parseImportFile(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].dayNumber).toBe(1);
    expect(parsed[0].theme).toBe('Rouge');
    expect(parsed[0].note).toBe('un souvenir');
    expect(parsed[0].photo.id).toBe('ph1');
    expect(new Uint8Array(await parsed[0].photo.blob.arrayBuffer())).toEqual(
      new Uint8Array(await jpegBlob().arrayBuffer()),
    );
  });

  it('exporte sans note quand elle est absente', async () => {
    const day = makeDay();
    delete day.note;
    const parsed = parseImportFile(await exportDays([day]));
    expect(parsed[0].note).toBeUndefined();
  });
});

describe('parseImportFile — fichiers invalides', () => {
  it('rejette un JSON invalide', () => {
    expect(() => parseImportFile('{oops')).toThrow(ImportError);
  });

  it('rejette une version inconnue', () => {
    expect(() => parseImportFile('{"version": 99, "exportedAt": 1, "days": []}')).toThrow(ImportError);
  });

  it('rejette une liste de jours manquante', () => {
    expect(() => parseImportFile('{"version": 1, "exportedAt": 1}')).toThrow(ImportError);
  });

  it('rejette un dayNumber invalide', () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: 1,
      days: [{ dayNumber: 0, theme: 'Rouge', photo: { id: 'p', data: '/9j/' }, takenAt: 1, updatedAt: 1 }],
    });
    expect(() => parseImportFile(json)).toThrow(ImportError);
  });

  it('rejette des dayNumber dupliqués', () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: 1,
      days: [
        { dayNumber: 1, theme: 'Rouge', photo: { id: 'p', data: '/9j/' }, takenAt: 1, updatedAt: 1 },
        { dayNumber: 1, theme: 'Eau', photo: { id: 'q', data: '/9j/' }, takenAt: 1, updatedAt: 1 },
      ],
    });
    expect(() => parseImportFile(json)).toThrow(ImportError);
  });

  it('rejette une photo illisible (pas un JPEG)', () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: 1,
      days: [{ dayNumber: 1, theme: 'Rouge', photo: { id: 'p', data: 'AAAA' }, takenAt: 1, updatedAt: 1 }],
    });
    expect(() => parseImportFile(json)).toThrow(ImportError);
  });
});

describe('buildExportFileName', () => {
  it('construit le nom de fichier avec la date du jour', () => {
    expect(buildExportFileName(new Date('2026-10-16T12:00:00Z'))).toBe('calendar365-export-2026-10-16.json');
  });
});
