import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DayDetail, { type DayDetailProps } from './DayDetail';
import type { DayEntry } from '../types';

vi.mock('../photoUtils', () => ({
  compressPhoto: vi.fn(async (file: Blob) => file),
}));

const onSave = vi.fn();

function makeDay(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    dayNumber: 2,
    theme: 'Eau',
    photo: { id: 'ph-2', blob: new Blob(['x'], { type: 'image/jpeg' }) },
    note: 'un souvenir',
    takenAt: new Date('2026-10-15T10:00:00Z').getTime(),
    updatedAt: new Date('2026-10-15T10:00:00Z').getTime(),
    ...overrides,
  };
}

beforeEach(() => {
  onSave.mockReset();
  onSave.mockResolvedValue(undefined);
});

function renderDetail(overrides: Partial<DayDetailProps> = {}) {
  const props: DayDetailProps = {
    entry: makeDay(),
    isLast: false,
    onSave,
    onClose: vi.fn(),
    ...overrides,
  };
  return render(<DayDetail {...props} />);
}

describe('DayDetail — consultation', () => {
  it('affiche le jour, le thème, la date et la photo', () => {
    renderDetail();
    expect(screen.getByText('Jour 2')).toBeInTheDocument();
    expect(screen.getByText('Eau')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringMatching(/^blob:/));
    expect(screen.getByRole('button', { name: /Modifier/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fermer/ })).toBeInTheDocument();
  });

  it('affiche la note quand elle existe', () => {
    renderDetail();
    expect(screen.getByText('un souvenir')).toBeInTheDocument();
  });

  it("n'affiche pas la note quand elle est absente", () => {
    renderDetail({ entry: makeDay({ note: undefined }) });
    expect(screen.queryByText('un souvenir')).not.toBeInTheDocument();
  });
});

describe('DayDetail — édition', () => {
  it('entre en mode édition puis annule sans sauvegarder', async () => {
    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Annuler/ }));
    expect(screen.getByRole('button', { name: /Modifier/ })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('pré-remplit la note en mode édition', async () => {
    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    expect(screen.getByLabelText(/Note/)).toHaveValue('un souvenir');
  });

  it('sauvegarde la note modifiée', async () => {
    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    const noteField = screen.getByLabelText(/Note/);
    await userEvent.clear(noteField);
    await userEvent.type(noteField, 'Nouveau souvenir');
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(onSave).toHaveBeenCalledWith(2, expect.any(Blob), 'Nouveau souvenir');
  });

  it('sauvegarde sans note quand le champ est vidé', async () => {
    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    await userEvent.clear(screen.getByLabelText(/Note/));
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(onSave).toHaveBeenCalledWith(2, expect.any(Blob), undefined);
  });

  it('remplace la photo en mode édition', async () => {
    const { container } = renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    const input = container.querySelector('input[accept="image/*"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['new'], 'new.jpg', { type: 'image/jpeg' }));
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    const [, blob] = onSave.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
  });

  it('affiche une erreur si la sauvegarde échoue', async () => {
    onSave.mockRejectedValueOnce(new Error('échec'));
    renderDetail();
    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(await screen.findByText(/Impossible d'enregistrer/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeInTheDocument();
  });
});

describe('DayDetail — dernier jour', () => {
  it('affiche le badge dernier jour', () => {
    renderDetail({ isLast: true });
    expect(screen.getByText('Dernier jour')).toBeInTheDocument();
  });
});
