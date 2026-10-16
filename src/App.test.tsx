import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { listDays, replaceAllDays, saveDay } from './db';
import { drawTheme, loadDailyDraw, saveDailyDraw } from './dailyTheme';
import { exportDays } from './exportImport';
import { loadThemes, ThemesError } from './themes';
import type { DayEntry } from './types';

vi.mock('./db', () => ({
  listDays: vi.fn(async (): Promise<DayEntry[]> => []),
  saveDay: vi.fn(async (_entry: DayEntry) => {}),
  replaceAllDays: vi.fn(async (_entries: DayEntry[]) => {}),
  nextDayNumber: (days: { dayNumber: number }[]) =>
    days.reduce((max, day) => Math.max(max, day.dayNumber), 0) + 1,
}));

vi.mock('./dailyTheme', () => ({
  remainingThemes: (themes: string[], used: string[]) => themes.filter((t) => !used.includes(t)),
  drawTheme: vi.fn((candidates: string[], exclude?: string) =>
    (exclude === undefined ? candidates : candidates.filter((t) => t !== exclude))[0] ?? null,
  ),
  loadDailyDraw: vi.fn((): string | null => null),
  saveDailyDraw: vi.fn(),
}));

vi.mock('./themes', () => ({
  loadThemes: vi.fn(async () => ['Rouge', 'Eau', 'Vert']),
  isChallengeComplete: (completed: number, count: number) => completed >= count,
  ThemesError: class ThemesError extends Error {},
}));

vi.mock('./photoUtils', () => ({
  compressPhoto: vi.fn(async (file: Blob) => file),
}));

function jpegBlob(): Blob {
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
}

function makeDay(dayNumber: number): DayEntry {
  return {
    dayNumber,
    theme: `Thème ${dayNumber}`,
    photo: { id: `ph-${dayNumber}`, blob: jpegBlob() },
    takenAt: 1000,
    updatedAt: 1000,
  };
}

let stored: DayEntry[];

beforeEach(() => {
  stored = [];
  vi.mocked(listDays).mockImplementation(async () => stored);
  vi.mocked(saveDay).mockImplementation(async (entry: DayEntry) => {
    stored = [...stored.filter((day) => day.dayNumber !== entry.dayNumber), entry];
  });
  vi.mocked(drawTheme).mockClear();
  vi.mocked(loadDailyDraw).mockReset();
  vi.mocked(loadDailyDraw).mockReturnValue(null);
  vi.mocked(saveDailyDraw).mockClear();
});

async function revealToday() {
  await userEvent.click(await screen.findByRole('button', { name: /Découvrir le thème/ }));
}

describe('App', () => {
  it('masque le premier thème puis le révèle au retournement de la carte', async () => {
    render(<App />);
    await screen.findByRole('button', { name: /Découvrir le thème/ });
    expect(screen.queryByRole('heading', { name: 'Rouge' })).not.toBeInTheDocument();
    await revealToday();
    expect(screen.getByRole('heading', { name: 'Rouge' })).toBeInTheDocument();
    expect(screen.getByText(/Jour 1/)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aujourd'hui/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Galerie/ })).toBeInTheDocument();
  });

  it('pioche un thème au hasard pour le jour suivant', async () => {
    stored = [makeDay(1)];
    render(<App />);
    await revealToday();
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText(/Jour 2/)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('réutilise la pioche mémorisée pour le même jour', async () => {
    vi.mocked(loadDailyDraw).mockReturnValue('Vert');
    render(<App />);
    await revealToday();
    expect(screen.getByText('Vert')).toBeInTheDocument();
    expect(drawTheme).not.toHaveBeenCalled();
    expect(saveDailyDraw).not.toHaveBeenCalled();
  });

  it('complète un jour puis remplit la galerie', async () => {
    render(<App />);
    await revealToday();
    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByAltText('Aperçu de la photo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    expect(await screen.findByText('Jour 1 validé !')).toBeInTheDocument();
    expect(saveDay).toHaveBeenCalledWith(
      expect.objectContaining({ dayNumber: 1, theme: 'Rouge' }),
    );
    expect(screen.queryByText(/Prochain thème/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Jour suivant/ }));
    expect(screen.getByRole('button', { name: /Découvrir le thème/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Eau' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Galerie/ }));
    expect(await screen.findByText('Rouge')).toBeInTheDocument();
  });

  it('repioche un autre thème au clic sur « Changer le thème »', async () => {
    render(<App />);
    await revealToday();
    await userEvent.click(screen.getByRole('button', { name: /Changer le thème/ }));
    await waitFor(() => expect(drawTheme).toHaveBeenCalledWith(['Rouge', 'Eau', 'Vert'], 'Rouge'));
    expect(await screen.findByText('Eau')).toBeInTheDocument();
    expect(saveDailyDraw).toHaveBeenCalledWith(1, 'Eau');
    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    expect(saveDay).toHaveBeenCalledWith(expect.objectContaining({ theme: 'Eau' }));
  });

  it('termine le défi après le dernier jour validé', async () => {
    stored = [makeDay(1), makeDay(2)];
    render(<App />);
    await revealToday();
    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    expect(await screen.findByText(/Défi terminé — bravo/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Jour suivant/ }));
    expect(await screen.findByText('Défi terminé !')).toBeInTheDocument();
  });

  it('ouvre le détail depuis la galerie', async () => {
    stored = [makeDay(1)];
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Galerie/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Jour 1/ }));
    expect(screen.getByRole('dialog', { name: 'Détail du jour 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fermer/ })).toBeInTheDocument();
  });

  it("affiche un écran d'erreur explicite si les thèmes ne chargent pas", async () => {
    vi.mocked(loadThemes).mockRejectedValueOnce(new ThemesError('boom'));
    render(<App />);
    expect(await screen.findByText(/Impossible de charger les thèmes/)).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('affiche la bannière de stockage indisponible', async () => {
    vi.mocked(listDays).mockRejectedValueOnce(new Error('IndexedDB indisponible'));
    render(<App />);
    expect(await screen.findByText(/Stockage indisponible/)).toBeInTheDocument();
  });

  it("importe un fichier d'export après confirmation", async () => {
    stored = [makeDay(1)];
    render(<App />);
    await screen.findByRole('button', { name: /Découvrir le thème/ });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const file = new File([await exportDays([makeDay(1), makeDay(2)])], 'export.json', {
      type: 'application/json',
    });
    const input = document.querySelector(
      'input[accept="application/json,.json"]',
    ) as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Remplacer les 1 entrées actuelles/),
    );
    expect(replaceAllDays).toHaveBeenCalledWith([
      expect.objectContaining({ dayNumber: 1 }),
      expect.objectContaining({ dayNumber: 2 }),
    ]);
    confirmSpy.mockRestore();
  });

  it("n'importe rien si l'utilisateur annule la confirmation", async () => {
    stored = [makeDay(1)];
    render(<App />);
    await screen.findByRole('button', { name: /Découvrir le thème/ });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const file = new File([await exportDays([makeDay(1), makeDay(2)])], 'export.json', {
      type: 'application/json',
    });
    const input = document.querySelector(
      'input[accept="application/json,.json"]',
    ) as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(replaceAllDays).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("préserve l'identifiant de la photo quand la note seule est modifiée", async () => {
    stored = [makeDay(1)];
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Galerie/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Jour 1/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Modifier/ }));
    const noteField = screen.getByLabelText(/Note/);
    await userEvent.type(noteField, 'Nouvelle note');
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(saveDay).toHaveBeenCalledWith(
      expect.objectContaining({
        dayNumber: 1,
        note: 'Nouvelle note',
        photo: { id: 'ph-1', blob: expect.any(Blob) },
      }),
    );
  });

  it('ouvre le détail du dernier jour depuis le panneau de succès', async () => {
    render(<App />);
    await revealToday();
    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Modifier/ }));
    expect(await screen.findByRole('dialog', { name: 'Détail du jour 1' })).toBeInTheDocument();
  });

  it('exporte les jours dans un fichier téléchargeable', async () => {
    stored = [makeDay(1)];
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Exporter/ }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    clickSpy.mockRestore();
  });

  it('conserve le brouillon et la carte révélée lors du changement d’onglet', async () => {
    render(<App />);
    await revealToday();
    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByAltText('Aperçu de la photo')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Note/), 'Ma note');
    await userEvent.click(screen.getByRole('button', { name: /Galerie/ }));
    await userEvent.click(screen.getByRole('button', { name: /Aujourd'hui/ }));
    expect(screen.getByAltText('Aperçu de la photo')).toBeInTheDocument();
    expect(screen.getByLabelText(/Note/)).toHaveValue('Ma note');
    expect(screen.getByRole('heading', { name: 'Rouge' })).toBeInTheDocument();
  });
});
