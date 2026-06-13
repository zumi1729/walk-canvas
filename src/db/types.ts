export type TravelMode = "walk" | "bicycle" | "car";

export type VisitedCell = {
  cellId: string;
  mode?: TravelMode;
  x: number;
  y: number;
  visitCount: number;
  firstVisitedAt: string;
  lastVisitedAt: string;
};

export type PhotoNote = {
  id: string;
  sessionId?: string;
  isFavorite?: boolean;
  tags?: string[];
  lat: number;
  lng: number;
  cellId: string;
  imageBlob: Blob;
  thumbnailBlob: Blob;
  comment: string;
  createdAt: string;
};

export type WalkPoint = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
};

export type WalkSession = {
  id: string;
  mode?: TravelMode;
  isFavorite?: boolean;
  tags?: string[];
  startedAt: string;
  endedAt?: string;
  visitedCellIds: string[];
  recordedPoints: WalkPoint[];
};

export type AppState = {
  isTracking: boolean;
  currentSession?: WalkSession;
  lastPosition?: WalkPoint;
};
