import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DayEntry } from './types';

interface CalendarDB extends DBSchema {
  days: { key: number; value: DayEntry };
}

let dbPromise: Promise<IDBPDatabase<CalendarDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CalendarDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CalendarDB>('calendar365', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('days')) {
          db.createObjectStore('days', { keyPath: 'dayNumber' });
        }
      },
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export async function listDays(): Promise<DayEntry[]> {
  const db = await getDB();
  const days = await db.getAll('days');
  return days.sort((a, b) => b.dayNumber - a.dayNumber);
}

export async function saveDay(entry: DayEntry): Promise<void> {
  const db = await getDB();
  await db.put('days', entry);
}

export async function replaceAllDays(entries: DayEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('days', 'readwrite');
  try {
    await tx.store.clear();
    for (const entry of entries) {
      await tx.store.put(entry);
    }
  } catch (err) {
    tx.done.catch(() => {
      // transaction abandonnée : le rejet de done est attendu
    });
    try {
      tx.abort();
    } catch {
      // la transaction était déjà terminée
    }
    throw err;
  }
  await tx.done;
}

export function nextDayNumber(entries: Pick<DayEntry, 'dayNumber'>[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.dayNumber), 0) + 1;
}
