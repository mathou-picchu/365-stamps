import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { listDays, replaceAllDays, saveDay } from './db';
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
    stored = [...stored, entry];
  });
});

describe('App', () => {
  it('affiche le premier thème au premier lancement', async () => {
    render(<App />);
    expect(await screen.findByText('Rouge')).toBeInTheDocument();
    expect(screen.getByText(/Jour 1/)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aujourd'hui/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Galerie/ })).toBeInTheDocument();
  });

  it('affiche le thème suivant quand un jour est complété', async () => {
    stored = [makeDay(1)];
    render(<App />);
    expect(await screen.findByText('Eau')).toBeInTheDocument();
    expect(screen.getByText(/Jour 2/)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });

  it('complète un jour puis remplit la galerie', async () => {
    render(<App />);
    expect(await screen.findByText('Rouge')).toBeInTheDocument();
    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByAltText('Aperçu de la photo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    expect(await screen.findByText('Jour 1 validé !')).toBeInTheDocument();
    expect(saveDay).toHaveBeenCalledWith(
      expect.objectContaining({ dayNumber: 1, theme: 'Rouge' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(await screen.findByText('Eau')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Galerie/ }));
    expect(await screen.findByText('Rouge')).toBeInTheDocument();
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
    await screen.findByText('Eau');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const file = new File([await exportDays([makeDay(2)])], 'export.json', {
      type: 'application/json',
    });
    const input = document.querySelector(
      'input[accept="application/json,.json"]',
    ) as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Remplacer les 1 entrées actuelles/),
    );
    expect(replaceAllDays).toHaveBeenCalledWith([expect.objectContaining({ dayNumber: 2 })]);
    confirmSpy.mockRestore();
  });

  it("n'importe rien si l'utilisateur annule la confirmation", async () => {
    stored = [makeDay(1)];
    render(<App />);
    await screen.findByText('Eau');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const file = new File([await exportDays([makeDay(2)])], 'export.json', {
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
    expect(await screen.findByText('Rouge')).toBeInTheDocument();
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
});
