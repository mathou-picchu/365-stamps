import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  Dices,
  Heart,
  PartyPopper,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { compressPhoto } from '../photoUtils';
import './TodayView.css';

export interface TodayViewProps {
  dayNumber: number;
  theme: string;
  completedDays: number;
  themeCount: number;
  challengeComplete: boolean;
  canReroll: boolean;
  onSave: (photo: Blob, note: string | undefined) => Promise<void>;
  onRerollTheme: () => void;
  onEditLast: () => void;
}

interface Draft {
  blob: Blob;
  url: string;
}

interface SavedSummary {
  dayNumber: number;
  theme: string;
  url: string;
  note?: string;
}

const REROLL_FLIP_MS = 400;

export default function TodayView({
  dayNumber,
  theme,
  completedDays,
  themeCount,
  challengeComplete,
  canReroll,
  onSave,
  onRerollTheme,
  onEditLast,
}: TodayViewProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedSummary | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [seenDay, setSeenDay] = useState(dayNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rerollTimerRef = useRef<number | null>(null);

  const urlsRef = useRef<Set<string>>(new Set());

  // Nouveau jour (validation, import) : la carte repart face cachée, sans brouillon.
  if (dayNumber !== seenDay) {
    setSeenDay(dayNumber);
    setRevealed(false);
    setDraft(null);
    setNote('');
    setError(null);
  }

  useEffect(
    () => () => {
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      if (rerollTimerRef.current !== null) window.clearTimeout(rerollTimerRef.current);
    },
    [],
  );

  function trackUrl(url: string): string {
    urlsRef.current.add(url);
    return url;
  }

  function releaseUrl(url: string): void {
    urlsRef.current.delete(url);
    URL.revokeObjectURL(url);
  }

  function handleReveal() {
    if (rerollTimerRef.current !== null) return;
    setRevealed(true);
  }

  function handleReroll() {
    if (!canReroll || rerollTimerRef.current !== null) return;
    setRevealed(false);
    rerollTimerRef.current = window.setTimeout(() => {
      rerollTimerRef.current = null;
      onRerollTheme();
      setRevealed(true);
    }, REROLL_FLIP_MS);
  }

  async function handleFile(file: File) {
    setError(null);
    setCompressing(true);
    try {
      const blob = await compressPhoto(file);
      if (draft) releaseUrl(draft.url);
      setDraft({ blob, url: trackUrl(URL.createObjectURL(blob)) });
    } catch {
      setError("Impossible de lire cette photo. Essaie une autre image.");
    } finally {
      setCompressing(false);
    }
  }

  function handleRetake() {
    if (draft) releaseUrl(draft.url);
    setDraft(null);
    setError(null);
  }

  async function handleValidate() {
    if (!draft || saving) return;
    const savedDayNumber = dayNumber;
    const savedTheme = theme;
    const savedNote = note.trim() || undefined;
    setSaving(true);
    try {
      await onSave(draft.blob, savedNote);
      setSaved({ dayNumber: savedDayNumber, theme: savedTheme, url: draft.url, note: savedNote });
      setDraft(null);
      setNote('');
    } catch {
      setError("Impossible d'enregistrer la photo. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  function handleContinue() {
    if (saved) releaseUrl(saved.url);
    setSaved(null);
    setError(null);
    setRevealed(false);
  }

  if (challengeComplete && !saved) {
    return (
      <div className="today today--complete">
        <PartyPopper size={48} aria-hidden="true" />
        <h2>Défi terminé !</h2>
        <p>
          Les {themeCount} thèmes ont été photographiés. Retrouve toutes tes photos dans la galerie.
        </p>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="today">
        <section className="today__card">
          <p className="today__saved-title">Jour {saved.dayNumber} validé !</p>
          <img className="today__photo" src={saved.url} alt={`Photo du thème « ${saved.theme} »`} />
          {saved.note && <p className="today__note">{saved.note}</p>}
          {challengeComplete ? (
            <p className="today__next">Défi terminé — bravo !</p>
          ) : (
            <p className="today__next">Un nouveau thème t'attend</p>
          )}
          <div className="today__actions">
            <button type="button" className="btn" onClick={onEditLast}>
              <Pencil size={18} aria-hidden="true" /> Modifier
            </button>
            <button type="button" className="btn btn--primary" onClick={handleContinue}>
              <ArrowRight size={18} aria-hidden="true" /> Jour suivant
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="today">
      <p className="today__day">
        Jour {dayNumber}{' '}
        <span className="today__progress">
          <Heart size={14} aria-hidden="true" /> {completedDays} / {themeCount}
        </span>
      </p>
      <div className={`flip-card${revealed ? ' flip-card--revealed' : ''}`}>
        <div className="flip-card__inner">
          <button
            type="button"
            className="today__card flip-card__face flip-card__mystery"
            onClick={handleReveal}
            aria-hidden={revealed}
            inert={revealed}
          >
            <span className="flip-card__hearts" aria-hidden="true">
              <Heart size={20} fill="currentColor" />
              <Heart size={26} fill="currentColor" />
              <Heart size={20} fill="currentColor" />
            </span>
            <span className="flip-card__mark" aria-hidden="true">
              ?
            </span>
            <span className="flip-card__hint">Découvrir le thème</span>
          </button>
          <div
            className="today__card flip-card__face flip-card__content"
            aria-hidden={!revealed}
            inert={!revealed}
          >
            <h2 className="today__theme">{theme}</h2>
            {draft ? (
              <>
                <img className="today__photo" src={draft.url} alt="Aperçu de la photo" />
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
                  <p className="today__error" role="alert">
                    {error}
                  </p>
                )}
                <div className="today__actions">
                  <button type="button" className="btn" onClick={handleRetake} disabled={saving}>
                    <RotateCcw size={18} aria-hidden="true" /> Reprendre
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleValidate}
                    disabled={saving}
                  >
                    <Check size={18} aria-hidden="true" /> {saving ? 'Validation…' : 'Valider'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {error && (
                  <p className="today__error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn--primary today__capture"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                >
                  <Camera size={22} aria-hidden="true" />
                  {compressing ? 'Préparation…' : 'Prendre la photo'}
                </button>
                {canReroll && (
                  <button type="button" className="btn" onClick={handleReroll}>
                    <Dices size={18} aria-hidden="true" /> Changer le thème
                  </button>
                )}
              </>
            )}
          </div>
        </div>
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
    </div>
  );
}
