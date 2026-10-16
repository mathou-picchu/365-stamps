import type { DayEntry } from './types';

export const EXPORT_VERSION = 1;

export class ImportError extends Error {}

interface SerializedPhoto {
  id: string;
  data: string;
}

interface SerializedDay {
  dayNumber: number;
  theme: string;
  photo: SerializedPhoto;
  note?: string;
  takenAt: number;
  updatedAt: number;
}

interface ExportFile {
  version: number;
  exportedAt: number;
  days: SerializedDay[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(data: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('invalid photo data');
  }
  return new Blob([bytes], { type: 'image/jpeg' });
}

export async function exportDays(days: DayEntry[]): Promise<string> {
  const file: ExportFile = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    days: await Promise.all(
      days.map(async (day): Promise<SerializedDay> => ({
        dayNumber: day.dayNumber,
        theme: day.theme,
        photo: { id: day.photo.id, data: await blobToBase64(day.photo.blob) },
        note: day.note,
        takenAt: day.takenAt,
        updatedAt: day.updatedAt,
      })),
    ),
  };
  return JSON.stringify(file, null, 2);
}

export function parseImportFile(text: string): DayEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError("le fichier n'est pas un JSON valide.");
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new ImportError('structure de fichier inattendue.');
  }
  const file = parsed as Partial<ExportFile>;
  if (file.version !== EXPORT_VERSION) {
    throw new ImportError(`version du fichier non supportée (${String(file.version)}).`);
  }
  if (!Array.isArray(file.days)) {
    throw new ImportError('liste des jours manquante.');
  }
  const seen = new Set<number>();
  return file.days.map((day, index) => parseDay(day, index, seen));
}

function parseDay(day: unknown, index: number, seen: Set<number>): DayEntry {
  const prefix = `jour #${index + 1}`;
  if (typeof day !== 'object' || day === null) {
    throw new ImportError(`${prefix} : données invalides.`);
  }
  const d = day as Partial<SerializedDay>;
  if (typeof d.dayNumber !== 'number' || !Number.isInteger(d.dayNumber) || d.dayNumber < 1) {
    throw new ImportError(`${prefix} : numéro de jour invalide.`);
  }
  if (seen.has(d.dayNumber)) {
    throw new ImportError(`${prefix} : numéro de jour dupliqué (${String(d.dayNumber)}).`);
  }
  seen.add(d.dayNumber);
  if (typeof d.theme !== 'string' || d.theme.trim().length === 0) {
    throw new ImportError(`${prefix} : thème manquant.`);
  }
  if (
    typeof d.photo !== 'object' ||
    d.photo === null ||
    typeof d.photo.id !== 'string' ||
    d.photo.id.length === 0 ||
    typeof d.photo.data !== 'string'
  ) {
    throw new ImportError(`${prefix} : photo invalide.`);
  }
  let blob: Blob;
  try {
    blob = base64ToBlob(d.photo.data);
  } catch {
    throw new ImportError(`${prefix} : photo illisible.`);
  }
  if (d.note !== undefined && typeof d.note !== 'string') {
    throw new ImportError(`${prefix} : note invalide.`);
  }
  if (typeof d.takenAt !== 'number' || typeof d.updatedAt !== 'number') {
    throw new ImportError(`${prefix} : dates invalides.`);
  }
  return {
    dayNumber: d.dayNumber,
    theme: d.theme,
    photo: { id: d.photo.id, blob },
    note: d.note,
    takenAt: d.takenAt,
    updatedAt: d.updatedAt,
  };
}

export function buildExportFileName(date: Date = new Date()): string {
  return `calendar365-export-${date.toISOString().slice(0, 10)}.json`;
}
