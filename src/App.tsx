import { useCallback, useEffect, useState } from 'react';
import { Camera, Heart, Images } from 'lucide-react';
import DayDetail from './components/DayDetail';
import GalleryView from './components/GalleryView';
import Toolbar from './components/Toolbar';
import TodayView from './components/TodayView';
import { listDays, nextDayNumber, replaceAllDays, saveDay } from './db';
import { buildExportFileName, exportDays, ImportError, parseImportFile } from './exportImport';
import { isChallengeComplete, loadThemes, ThemesError } from './themes';
import type { DayEntry } from './types';
import './AppShell.css';

type Tab = 'today' | 'gallery';

export default function App() {
  const [themes, setThemes] = useState<string[] | null>(null);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [days, setDays] = useState<DayEntry[]>([]);
  const [tab, setTab] = useState<Tab>('today');
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    loadThemes()
      .then(setThemes)
      .catch((err) =>
        setThemesError(
          err instanceof ThemesError ? err.message : 'Erreur inconnue au chargement des thèmes.',
        ),
      );
  }, []);

  const refreshDays = useCallback(async () => {
    try {
      setDays(await listDays());
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial depuis IndexedDB (système externe) : les setState ont lieu après await, pas dans le corps synchrone de l'effet
    void refreshDays();
  }, [refreshDays]);

  const completedDays = days.length;
  const challengeComplete = themes !== null && isChallengeComplete(completedDays, themes.length);
  const currentDayNumber = nextDayNumber(days);
  const currentTheme = themes !== null && !challengeComplete ? themes[completedDays] : '';
  const selectedDay = days.find((day) => day.dayNumber === selectedDayNumber) ?? null;

  async function handleComplete(photo: Blob, note: string | undefined) {
    if (themes === null || challengeComplete) {
      throw new Error('le défi est terminé');
    }
    const entry: DayEntry = {
      dayNumber: currentDayNumber,
      theme: currentTheme,
      photo: { id: crypto.randomUUID(), blob: photo },
      note,
      takenAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveDay(entry);
    await refreshDays();
  }

  async function handleSaveDay(dayNumber: number, photo: Blob, note: string | undefined) {
    const target = days.find((day) => day.dayNumber === dayNumber);
    if (!target) return;
    await saveDay({
      ...target,
      photo: photo === target.photo.blob ? target.photo : { id: crypto.randomUUID(), blob: photo },
      note,
      updatedAt: Date.now(),
    });
    await refreshDays();
  }

  async function handleExport() {
    try {
      const json = await exportDays(days);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = buildExportFileName();
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Export échoué : impossible de préparer le fichier.");
    }
  }

  async function handleImport(file: File) {
    try {
      const imported = parseImportFile(await file.text());
      const ok = window.confirm(
        `Remplacer les ${days.length} entrées actuelles par les ${imported.length} entrées du fichier ?`,
      );
      if (!ok) return;
      await replaceAllDays(imported);
      await refreshDays();
      setSelectedDayNumber(null);
    } catch (err) {
      if (err instanceof ImportError) {
        window.alert(`Import échoué : ${err.message}`);
      } else {
        window.alert('Import échoué : stockage indisponible.');
      }
    }
  }

  if (themesError) {
    return (
      <div className="app">
        <div className="error-screen">
          <h1>365 Stamps</h1>
          <h2>Impossible de charger les thèmes</h2>
          <p>{themesError}</p>
          <p>
            Le fichier <code>public/themes.json</code> doit contenir un tableau JSON de thèmes non
            vides : <code>["Rouge", "Eau", …]</code>
          </p>
        </div>
      </div>
    );
  }

  if (themes === null) {
    return (
      <div className="app">
        <p className="loading">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <Heart size={26} aria-hidden="true" fill="currentColor" />
          <h1 className="app-title">365 Stamps</h1>
        </div>
        <Toolbar onExport={handleExport} onImport={handleImport} />
      </header>
      {storageError && (
        <p className="storage-banner" role="alert">
          Stockage indisponible : impossible d'enregistrer tes photos dans ce navigateur (mode
          privé ?).
        </p>
      )}
      <main className="app-main">
        <div hidden={tab !== 'today'}>
          <TodayView
            dayNumber={currentDayNumber}
            theme={currentTheme}
            completedDays={completedDays}
            themeCount={themes.length}
            challengeComplete={challengeComplete}
            onSave={handleComplete}
            onEditLast={() => {
              if (days[0]) setSelectedDayNumber(days[0].dayNumber);
            }}
          />
        </div>
        {tab === 'gallery' ? <GalleryView days={days} onSelect={setSelectedDayNumber} /> : null}
      </main>
      <nav className="tabbar" aria-label="Navigation principale">
        <button
          type="button"
          className={`tabbar__seg${tab === 'today' ? ' active' : ''}`}
          aria-pressed={tab === 'today'}
          onClick={() => setTab('today')}
        >
          <Camera size={18} aria-hidden="true" /> Aujourd'hui
        </button>
        <button
          type="button"
          className={`tabbar__seg${tab === 'gallery' ? ' active' : ''}`}
          aria-pressed={tab === 'gallery'}
          onClick={() => setTab('gallery')}
        >
          <Images size={18} aria-hidden="true" /> Galerie
          <span className="tabbar__count">{days.length}</span>
        </button>
      </nav>
      {selectedDay && (
        <DayDetail
          entry={selectedDay}
          isLast={selectedDay.dayNumber === (days[0]?.dayNumber ?? -1)}
          onClose={() => setSelectedDayNumber(null)}
          onSave={handleSaveDay}
        />
      )}
    </div>
  );
}
