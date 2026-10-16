import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TodayView, { type TodayViewProps } from './TodayView';

vi.mock('../photoUtils', () => ({
  compressPhoto: vi.fn(async (file: Blob) => file),
}));

const onSave = vi.fn();
const onEditLast = vi.fn();
const onRerollTheme = vi.fn();

beforeEach(() => {
  onSave.mockReset();
  onSave.mockResolvedValue(undefined);
  onEditLast.mockClear();
  onRerollTheme.mockClear();
});

function renderToday(overrides: Partial<TodayViewProps> = {}) {
  const props: TodayViewProps = {
    dayNumber: 1,
    theme: 'Rouge',
    completedDays: 0,
    themeCount: 365,
    challengeComplete: false,
    canReroll: false,
    onSave,
    onRerollTheme,
    onEditLast,
    ...overrides,
  };
  return render(<TodayView {...props} />);
}

async function revealCard() {
  await userEvent.click(screen.getByRole('button', { name: /Découvrir le thème/ }));
}

async function uploadPhoto(container: HTMLElement) {
  const input = container.querySelector('input[accept="image/*"]') as HTMLInputElement;
  await userEvent.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
}

describe('TodayView', () => {
  it('affiche le jour et la progression, thème masqué avant retournement', () => {
    renderToday();
    expect(screen.getByText(/Jour 1/)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 365/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Découvrir le thème/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rouge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prendre la photo/ })).not.toBeInTheDocument();
  });

  it('révèle le thème et la capture au clic sur la carte', async () => {
    renderToday();
    await revealCard();
    expect(screen.getByText('Rouge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Prendre la photo/ })).toBeInTheDocument();
  });

  it('affiche un aperçu après la sélection de la photo', async () => {
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    expect(await screen.findByAltText('Aperçu de la photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reprendre/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Valider/ })).toBeInTheDocument();
  });

  it('permet de reprendre la photo avant validation', async () => {
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    await userEvent.click(screen.getByRole('button', { name: /Reprendre/ }));
    expect(screen.getByRole('button', { name: /Prendre la photo/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Valider/ })).not.toBeInTheDocument();
  });

  it("valide la photo avec la note, sans révéler le thème suivant", async () => {
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    await userEvent.type(screen.getByLabelText(/Note/), 'Un beau matin');
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [blob, note] = onSave.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(note).toBe('Un beau matin');
    expect(await screen.findByText('Jour 1 validé !')).toBeInTheDocument();
    expect(screen.queryByText(/Prochain thème/)).not.toBeInTheDocument();
    expect(screen.getByText(/Un nouveau thème t'attend/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jour suivant/ })).toBeInTheDocument();
  });

  it('valide sans note quand le champ est vide', async () => {
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    const [, note] = onSave.mock.calls[0];
    expect(note).toBeUndefined();
  });

  it('retourne une carte face cachée après « Jour suivant »', async () => {
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Jour suivant/ }));
    expect(screen.getByRole('button', { name: /Découvrir le thème/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rouge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prendre la photo/ })).not.toBeInTheDocument();
  });

  it('permet de changer le thème avant la photo, avec re-retournement', async () => {
    renderToday({ canReroll: true });
    await revealCard();
    await userEvent.click(screen.getByRole('button', { name: /Changer le thème/ }));
    expect(screen.getByRole('button', { name: /Découvrir le thème/ })).toBeInTheDocument();
    await waitFor(() => expect(onRerollTheme).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Rouge' })).toBeInTheDocument();
  });

  it('masque le changement de thème une fois la photo prise', async () => {
    const { container } = renderToday({ canReroll: true });
    await revealCard();
    await uploadPhoto(container);
    expect(screen.queryByRole('button', { name: /Changer le thème/ })).not.toBeInTheDocument();
  });

  it('masque le changement de thème quand le paquet est épuisé', async () => {
    renderToday({ canReroll: false });
    await revealCard();
    expect(screen.queryByRole('button', { name: /Changer le thème/ })).not.toBeInTheDocument();
  });

  it('appelle onEditLast depuis le panneau de succès', async () => {
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Modifier/ }));
    expect(onEditLast).toHaveBeenCalledTimes(1);
  });

  it('affiche une erreur si la compression échoue', async () => {
    const { compressPhoto } = await import('../photoUtils');
    vi.mocked(compressPhoto).mockRejectedValueOnce(new Error('illisible'));
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    expect(await screen.findByText(/Impossible de lire cette photo/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("affiche une erreur si l'enregistrement échoue", async () => {
    onSave.mockRejectedValueOnce(new Error('stockage indisponible'));
    const { container } = renderToday();
    await revealCard();
    await uploadPhoto(container);
    await userEvent.click(screen.getByRole('button', { name: /Valider/ }));
    expect(await screen.findByText(/Impossible d'enregistrer la photo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Valider/ })).toBeInTheDocument();
  });

  it('affiche la fin du défi', () => {
    renderToday({ challengeComplete: true, completedDays: 3, dayNumber: 4, theme: '' });
    expect(screen.getByText('Défi terminé !')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Prendre la photo/ })).not.toBeInTheDocument();
  });
});
