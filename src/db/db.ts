import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PhotoNote, VisitedCell, WalkSession } from "./types";

interface WalkCanvasDbSchema extends DBSchema {
  visitedCells: {
    key: string;
    value: VisitedCell;
  };
  photoNotes: {
    key: string;
    value: PhotoNote;
    indexes: {
      cellId: string;
      createdAt: string;
    };
  };
  walkSessions: {
    key: string;
    value: WalkSession;
    indexes: {
      startedAt: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<WalkCanvasDbSchema>> | undefined;

export function initDb(): Promise<IDBPDatabase<WalkCanvasDbSchema>> {
  dbPromise ??= openDB<WalkCanvasDbSchema>("walk-canvas-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("visitedCells")) {
        db.createObjectStore("visitedCells", { keyPath: "cellId" });
      }

      if (!db.objectStoreNames.contains("photoNotes")) {
        const store = db.createObjectStore("photoNotes", { keyPath: "id" });
        store.createIndex("cellId", "cellId");
        store.createIndex("createdAt", "createdAt");
      }

      if (!db.objectStoreNames.contains("walkSessions")) {
        const store = db.createObjectStore("walkSessions", { keyPath: "id" });
        store.createIndex("startedAt", "startedAt");
      }
    },
  });

  return dbPromise;
}

export async function getAllVisitedCells(): Promise<VisitedCell[]> {
  return (await initDb()).getAll("visitedCells");
}

export async function getVisitedCell(cellId: string): Promise<VisitedCell | undefined> {
  return (await initDb()).get("visitedCells", cellId);
}

export async function upsertVisitedCell(cell: VisitedCell): Promise<void> {
  await (await initDb()).put("visitedCells", cell);
}

export async function getAllPhotoNotes(): Promise<PhotoNote[]> {
  return (await initDb()).getAll("photoNotes");
}

export async function addPhotoNote(note: PhotoNote): Promise<void> {
  await (await initDb()).add("photoNotes", note);
}

export async function deletePhotoNote(id: string): Promise<void> {
  await (await initDb()).delete("photoNotes", id);
}

export async function addWalkSession(session: WalkSession): Promise<void> {
  await (await initDb()).add("walkSessions", session);
}

export async function updateWalkSession(session: WalkSession): Promise<void> {
  await (await initDb()).put("walkSessions", session);
}

export async function getAllWalkSessions(): Promise<WalkSession[]> {
  return (await initDb()).getAll("walkSessions");
}
