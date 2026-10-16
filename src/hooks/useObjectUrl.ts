/* eslint-disable react-hooks/set-state-in-effect -- création d'URL d'objet : synchronisation avec une API externe, setState inévitable */
import { useEffect, useState } from 'react';

export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
