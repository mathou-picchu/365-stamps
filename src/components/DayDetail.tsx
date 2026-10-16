import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, Pencil, RotateCcw, X } from 'lucide-react';
import { compressPhoto } from '../photoUtils';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { DayEntry } from '../types';
import './DayDetail.css';

export interface DayDetailProps {
  entry: DayEntry;
  isLast: boolean;
  onSave: (dayNumber: number, photo: Blob, note: string | undefined) => Promise<void>;
  onClose: () => void;
}

export default function DayDetail({ entry, isLast, onSave, onClose }: DayDetailProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(entry.note ?? '');
  const [newBlob, setNewBlob] = useState<Blob | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUrl = useObjectUrl(entry.photo.blob);
  const draftUrl = useObjectUrl(newBlob);

  /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation de l'état local quand l'entrée change : ajustement du state sur changement de prop, inévitable sans clé de remontage gérée par le parent */
  useEffect(() => {
    setNote(entry.note ?? '');
    setNewBlob(null);
    setError(null);
    setEditing(false);
  }, [entry]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function startEditing() {
    setNote(entry.note ?? '');
    setNewBlob(null);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setNewBlob(null);
    setError(null);
    setEditing(false);
  }

  async function handleFile(file: File) {
    setError(null);
    setCompressing(true);
    try {
      setNewBlob(await compressPhoto(file));
    } catch {
      setError("Impossible de lire cette photo. Essaie une autre image.");
    } finally {
      setCompressing(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(entry.dayNumber, newBlob ?? entry.photo.blob, note.trim() || undefined);
      setNewBlob(null);
      setEditing(false);
      setError(null);
    } catch {
      setError("Impossible d'enregistrer les modifications. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  const displayedUrl = editing && draftUrl ? draftUrl : currentUrl;

  return (
    <div className="detail" role="dialog" aria-label={`Détail du jour ${entry.dayNumber}`}>
      <div className="detail__bar">
        <button type="button" className="btn btn--icon" onClick={onClose} aria-label="Fermer">
          <X size={22} aria-hidden="true" />
        </button>
        <h2 className="detail__title">
          Jour {entry.dayNumber} {isLast && <span className="detail__last">Dernier jour</span>}
        </h2>
        <span className="detail__bar-spacer" aria-hidden="true" />
      </div>

      <h3 className="detail__theme">{entry.theme}</h3>

      {editing ? (
        <>
          <img
            className="detail__photo"
            src={displayedUrl ?? ''}
            alt={`Photo du thème « ${entry.theme} »`}
          />
          <label className="field">
            Note (optionnel)
            <textarea
              className="field__input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Un souvenir, un contexte…"
            />
          </label>
          {error && (
            <p className="detail__error" role="alert">
              {error}
            </p>
          )}
          <div className="detail__actions">
            <button type="button" className="btn" onClick={cancelEditing} disabled={saving}>
              Annuler
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || compressing}
            >
              <Camera size={18} aria-hidden="true" /> {compressing ? 'Préparation…' : 'Changer la photo'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              <RotateCcw size={18} aria-hidden="true" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="visually-hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleFile(file);
            }}
          />
        </>
      ) : (
        <>
          <img
            className="detail__photo"
            src={currentUrl ?? ''}
            alt={`Photo du thème « ${entry.theme} »`}
          />
          {entry.note && <p className="detail__note">{entry.note}</p>}
          {error && (
            <p className="detail__error" role="alert">
              {error}
            </p>
          )}
          <div className="detail__actions">
            <button type="button" className="btn" onClick={startEditing}>
              <Pencil size={18} aria-hidden="true" /> Modifier
            </button>
          </div>
        </>
      )}

      <p className="detail__date">
        <ChevronLeft size={14} aria-hidden="true" /> Pris le{' '}
        {new Date(entry.takenAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
