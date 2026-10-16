import { Images } from 'lucide-react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { DayEntry } from '../types';
import './GalleryView.css';

export interface GalleryViewProps {
  days: DayEntry[];
  onSelect: (dayNumber: number) => void;
}

function GalleryTile({ day, onSelect }: { day: DayEntry; onSelect: (dayNumber: number) => void }) {
  const url = useObjectUrl(day.photo.blob);
  return (
    <button type="button" className="gallery__tile" onClick={() => onSelect(day.dayNumber)}>
      {url && (
        <img className="gallery__photo" src={url} alt={`Jour ${day.dayNumber} — ${day.theme}`} />
      )}
      <span className="gallery__day">Jour {day.dayNumber}</span>
      <span className="gallery__theme">{day.theme}</span>
    </button>
  );
}

export default function GalleryView({ days, onSelect }: GalleryViewProps) {
  if (days.length === 0) {
    return (
      <div className="gallery gallery--empty">
        <Images size={40} aria-hidden="true" />
        <p>Aucune photo pour l'instant.</p>
        <p>Prends la première photo du défi dans l'onglet « Aujourd'hui » !</p>
      </div>
    );
  }
  return (
    <div className="gallery">
      {days.map((day) => (
        <GalleryTile key={day.dayNumber} day={day} onSelect={onSelect} />
      ))}
    </div>
  );
}
