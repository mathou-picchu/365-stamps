export interface DayPhoto {
  id: string;
  blob: Blob;
}

export interface DayEntry {
  dayNumber: number;
  theme: string;
  photo: DayPhoto;
  note?: string;
  takenAt: number;
  updatedAt: number;
}
