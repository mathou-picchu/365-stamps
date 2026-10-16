import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

export interface ToolbarProps {
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function Toolbar({ onExport, onImport }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="toolbar">
      <button
        type="button"
        className="btn btn--icon"
        onClick={onExport}
        aria-label="Exporter"
        title="Exporter"
      >
        <Download size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn--icon"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Importer"
        title="Importer"
      >
        <Upload size={20} aria-hidden="true" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onImport(file);
        }}
      />
    </div>
  );
}
