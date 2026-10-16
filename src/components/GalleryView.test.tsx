import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GalleryView from './GalleryView';
import type { DayEntry } from '../types';

function makeDay(dayNumber: number): DayEntry {
  return {
    dayNumber,
    theme: `Thème ${dayNumber}`,
    photo: { id: `ph-${dayNumber}`, blob: new Blob(['x'], { type: 'image/jpeg' }) },
    takenAt: 1000,
    updatedAt: 1000,
  };
}

const onSelect = vi.fn();

describe('GalleryView', () => {
  it('affiche un message quand la galerie est vide', () => {
    render(<GalleryView days={[]} onSelect={onSelect} />);
    expect(screen.getByText(/Aucune photo pour l'instant/)).toBeInTheDocument();
  });

  it('affiche les jours du plus récent au plus ancien', () => {
    render(<GalleryView days={[makeDay(3), makeDay(2), makeDay(1)]} onSelect={onSelect} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Jour 3Thème 3',
      'Jour 2Thème 2',
      'Jour 1Thème 1',
    ]);
  });

  it('affiche les photos via des URL de blob', () => {
    render(<GalleryView days={[makeDay(1)]} onSelect={onSelect} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringMatching(/^blob:/));
  });

  it('sélectionne un jour au clic sur une tuile', async () => {
    onSelect.mockClear();
    render(<GalleryView days={[makeDay(3), makeDay(2)]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Jour 2/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
