import type L from "leaflet";
import {
  addPhotoNote,
  addWalkSession,
  deletePhotoNote,
  getAllPhotoNotes,
  getAllVisitedCells,
  getAllWalkSessions,
  initDb,
  updateWalkSession,
  upsertVisitedCell,
} from "./db/db";
import type { AppState, PhotoNote, VisitedCell, WalkPoint, WalkSession } from "./db/types";
import { getCurrentPosition, getLastPosition, startTracking, stopTracking } from "./gps/tracker";
import { getPhotosForSession } from "./history/history";
import { renderVisitedCells, updateVisitedCell } from "./map/cellLayer";
import { latLngToCell } from "./map/grid";
import { clearHistoryMap, renderHistoryMap } from "./map/historyMap";
import { initMap, moveToPoint, updateCurrentPosition } from "./map/map";
import { addPhotoMarker, removePhotoMarker, renderPhotoMarkers } from "./map/photoMarkers";
import {
  captureCameraPhoto,
  type CameraFacingMode,
  getCameraErrorMessage,
  getSelectedPhoto,
  openPhotoLibrary,
  startCamera,
  stopCamera,
} from "./photos/camera";
import { createThumbnail, resizeImage } from "./photos/imageResize";
import {
  getControls,
  setControlsBusy,
  setTrackingUi,
  updateTodayStats,
  type Controls,
} from "./ui/controls";
import { showCameraModal, showPhotoCommentModal, showPhotoDetailModal } from "./ui/modal";
import { showWalkHistoryModal } from "./ui/history";
import { showToast } from "./ui/toast";

const MAX_RECORDING_ACCURACY_METERS = 35;
const MAX_WALKING_SPEED_METERS_PER_SECOND = 5;

const state: AppState = { isTracking: false };
const visitedCells = new Map<string, VisitedCell>();
const photoNotes = new Map<string, PhotoNote>();
const walkSessions = new Map<string, WalkSession>();

let map: L.Map;
let controls: Controls;
let activeCellIds = new Set<string>();
let pointQueue: Promise<void> = Promise.resolve();
let lastAccuracyWarningAt = 0;

export async function bootstrap(): Promise<void> {
  renderAppShell();
  controls = getControls();
  map = initMap("map");
  bindControls();
  setTrackingUi(controls, false);

  try {
    await initDb();
    const [cells, notes, sessions] = await Promise.all([
      getAllVisitedCells(),
      getAllPhotoNotes(),
      getAllWalkSessions(),
    ]);

    const normalizedSessions = await closeInterruptedSessions(sessions);
    for (const cell of cells) visitedCells.set(cell.cellId, cell);
    for (const note of notes) photoNotes.set(note.id, note);
    for (const session of normalizedSessions) walkSessions.set(session.id, session);
    renderVisitedCells(map, cells);
    renderPhotoMarkers(map, notes, openPhotoDetails);
    updateStats();
  } catch (error) {
    console.error(error);
    showToast("保存領域を開けませんでした。ブラウザの設定と空き容量を確認してください。", 6000);
  }

  void locateUser(false);
  window.addEventListener("pagehide", () => {
    stopTracking();
    stopCamera();
  });
}

function bindControls(): void {
  controls.trackingButton.addEventListener("click", () => {
    void (state.isTracking ? stopWalk() : startWalk());
  });
  controls.cameraButton.addEventListener("click", () => void handleCameraButton());
  controls.locateButton.addEventListener("click", () => void locateUser(true));
  controls.historyButton.addEventListener("click", openWalkHistory);
  controls.cameraInput.addEventListener("change", () => void handleSelectedPhoto());
}

async function startWalk(): Promise<void> {
  setControlsBusy(controls, true);
  try {
    const initialPoint = await getCurrentPosition();
    const session: WalkSession = {
      id: createId(),
      startedAt: new Date().toISOString(),
      visitedCellIds: [],
      recordedPoints: [],
    };

    await addWalkSession(session);
    walkSessions.set(session.id, session);
    state.isTracking = true;
    state.currentSession = session;
    state.lastPosition = initialPoint;
    activeCellIds = new Set();
    setTrackingUi(controls, true);
    updateCurrentPosition(map, initialPoint);
    moveToPoint(map, initialPoint);
    enqueuePoint(initialPoint);

    startTracking(
      enqueuePoint,
      (message) => showToast(message, 5000),
    );
  } catch (error) {
    showToast(getErrorMessage(error), 5000);
  } finally {
    setControlsBusy(controls, false);
  }
}

async function stopWalk(): Promise<void> {
  if (!state.currentSession) return;

  setControlsBusy(controls, true);
  stopTracking();
  await pointQueue;

  try {
    state.currentSession.endedAt = new Date().toISOString();
    await updateWalkSession(state.currentSession);
    walkSessions.set(state.currentSession.id, state.currentSession);
    showToast("散歩を保存しました。");
  } catch (error) {
    console.error(error);
    showToast("保存に失敗しました。端末の空き容量を確認してください。", 5000);
  } finally {
    state.isTracking = false;
    state.currentSession = undefined;
    activeCellIds.clear();
    setTrackingUi(controls, false);
    setControlsBusy(controls, false);
  }
}

function enqueuePoint(point: WalkPoint): void {
  pointQueue = pointQueue
    .then(() => processTrackingPoint(point))
    .catch((error: unknown) => {
      console.error(error);
      showToast("保存に失敗しました。端末の空き容量を確認してください。", 5000);
    });
}

async function processTrackingPoint(point: WalkPoint): Promise<void> {
  state.lastPosition = point;
  updateCurrentPosition(map, point);

  const session = state.currentSession;
  if (!state.isTracking || !session) return;

  const previousPoint = session.recordedPoints.at(-1);
  session.recordedPoints.push(point);

  if (point.accuracy > MAX_RECORDING_ACCURACY_METERS) {
    warnAboutAccuracy();
    await updateWalkSession(session);
    return;
  }

  if (previousPoint && calculateSpeed(previousPoint, point) > MAX_WALKING_SPEED_METERS_PER_SECOND) {
    await updateWalkSession(session);
    return;
  }

  const cellCoordinate = latLngToCell(point.lat, point.lng);
  if (!activeCellIds.has(cellCoordinate.cellId)) {
    const existing = visitedCells.get(cellCoordinate.cellId);
    const cell: VisitedCell = existing
      ? {
          ...existing,
          visitCount: existing.visitCount + 1,
          lastVisitedAt: point.timestamp,
        }
      : {
          ...cellCoordinate,
          visitCount: 1,
          firstVisitedAt: point.timestamp,
          lastVisitedAt: point.timestamp,
        };

    await upsertVisitedCell(cell);
    activeCellIds.add(cell.cellId);
    session.visitedCellIds.push(cell.cellId);
    visitedCells.set(cell.cellId, cell);
    updateVisitedCell(map, cell);
    updateStats();
  }

  await updateWalkSession(session);
}

async function locateUser(showErrors: boolean): Promise<void> {
  controls.locateButton.disabled = true;
  try {
    const point = state.isTracking ? getLastPosition() ?? (await getCurrentPosition()) : await getCurrentPosition();
    state.lastPosition = point;
    updateCurrentPosition(map, point);
    moveToPoint(map, point);
  } catch (error) {
    if (showErrors) showToast(getErrorMessage(error), 5000);
  } finally {
    controls.locateButton.disabled = false;
  }
}

async function handleSelectedPhoto(): Promise<void> {
  const file = getSelectedPhoto(controls.cameraInput);
  if (!file) return;

  await processPhoto(file);
  controls.cameraInput.value = "";
}

async function handleCameraButton(): Promise<void> {
  setControlsBusy(controls, true);
  const modal = showCameraModal(() => openPhotoLibrary(controls.cameraInput));
  let cameraStarted = false;
  let facingMode: CameraFacingMode = "environment";
  let cameraRequestId = 0;

  const activateCamera = async (nextFacingMode: CameraFacingMode): Promise<void> => {
    const requestId = ++cameraRequestId;
    facingMode = nextFacingMode;
    cameraStarted = false;
    modal.setCameraLoading(nextFacingMode === "user" ? "内側カメラへ切り替えています…" : "カメラを準備しています…");

    try {
      await startCamera(modal.video, nextFacingMode);
      if (requestId !== cameraRequestId || !modal.isOpen()) {
        stopCamera(modal.video);
        return;
      }
      cameraStarted = true;
      modal.setCameraReady(nextFacingMode === "user");
    } catch (error) {
      if (requestId !== cameraRequestId || !modal.isOpen()) return;
      console.error(error);
      stopCamera(modal.video);
      modal.setCameraError(getCameraErrorMessage(error));
    }
  };

  modal.setSwitchHandler(() => {
    const nextFacingMode = facingMode === "environment" ? "user" : "environment";
    void activateCamera(nextFacingMode);
  });
  await activateCamera(facingMode);

  const action = await modal.result;
  cameraRequestId += 1;
  try {
    if (action === "capture" && cameraStarted) {
      const file = await captureCameraPhoto(modal.video);
      await processPhoto(file);
    }
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error, "写真を撮影できませんでした。"), 6000);
  } finally {
    stopCamera(modal.video);
    setControlsBusy(controls, false);
  }
}

async function processPhoto(file: File): Promise<void> {

  setControlsBusy(controls, true);
  try {
    const locationPromise = state.isTracking && getLastPosition()
      ? Promise.resolve(getLastPosition() as WalkPoint)
      : getCurrentPosition().catch(() => {
          throw new Error(
            "写真の位置情報を取得できませんでした。位置情報を許可してからもう一度試してください。",
          );
        });
    const [position, imageBlob, thumbnailBlob] = await Promise.all([
      locationPromise,
      resizeImage(file, 1280, 1280, 0.8),
      createThumbnail(file),
    ]);

    const previewUrl = URL.createObjectURL(imageBlob);
    const comment = await showPhotoCommentModal(previewUrl);
    URL.revokeObjectURL(previewUrl);
    if (comment === null) return;

    const note: PhotoNote = {
      id: createId(),
      sessionId: state.isTracking ? state.currentSession?.id : undefined,
      lat: position.lat,
      lng: position.lng,
      cellId: latLngToCell(position.lat, position.lng).cellId,
      imageBlob,
      thumbnailBlob,
      comment,
      createdAt: new Date().toISOString(),
    };
    await addPhotoNote(note);
    photoNotes.set(note.id, note);
    addPhotoMarker(map, note, openPhotoDetails);
    updateStats();
    showToast("写真を地図に保存しました。");
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error, "保存に失敗しました。端末の空き容量を確認してください。"), 6000);
  } finally {
    setControlsBusy(controls, false);
  }
}

function openWalkHistory(): void {
  showWalkHistoryModal({
    sessions: [...walkSessions.values()],
    getPhotos: (session) => getPhotosForSession(session, [...photoNotes.values()]),
    onRenderRoute: (session, notes) => renderHistoryMap("historyMap", session, notes),
    onClearRoute: clearHistoryMap,
    onOpenPhoto: openPhotoDetails,
  });
}

function openPhotoDetails(note: PhotoNote): void {
  showPhotoDetailModal(note, async () => {
    try {
      await deletePhotoNote(note.id);
      photoNotes.delete(note.id);
      removePhotoMarker(note.id);
      updateStats();
      showToast("写真を削除しました。");
    } catch (error) {
      console.error(error);
      showToast("写真を削除できませんでした。", 5000);
      throw error;
    }
  });
}

async function closeInterruptedSessions(sessions: WalkSession[]): Promise<WalkSession[]> {
  return Promise.all(
    sessions.map(async (session) => {
      if (session.endedAt) return session;
      const endedAt = session.recordedPoints.at(-1)?.timestamp ?? session.startedAt;
      const closedSession = { ...session, endedAt };
      await updateWalkSession(closedSession);
      return closedSession;
    }),
  );
}

function updateStats(): void {
  const today = getLocalDateKey(new Date());
  const todayCellCount = [...visitedCells.values()].filter(
    (cell) => getLocalDateKey(new Date(cell.firstVisitedAt)) === today,
  ).length;
  const todayPhotoCount = [...photoNotes.values()].filter(
    (note) => getLocalDateKey(new Date(note.createdAt)) === today,
  ).length;
  updateTodayStats(controls, todayCellCount, todayPhotoCount);
}

function warnAboutAccuracy(): void {
  const now = Date.now();
  if (now - lastAccuracyWarningAt < 30_000) return;
  lastAccuracyWarningAt = now;
  showToast("GPS精度が低いため、記録を一時停止しています。少し開けた場所で試してください。", 5000);
}

function calculateSpeed(from: WalkPoint, to: WalkPoint): number {
  const elapsedSeconds = (Date.parse(to.timestamp) - Date.parse(from.timestamp)) / 1000;
  if (elapsedSeconds <= 0) return 0;
  return haversineDistance(from, to) / elapsedSeconds;
}

function haversineDistance(from: WalkPoint, to: WalkPoint): number {
  const earthRadius = 6_371_000;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown, fallback = "処理に失敗しました。もう一度試してください。"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function renderAppShell(): void {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("App root not found");

  root.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div class="today-stats" aria-label="今日の記録">
          <div><strong id="todayCells">0</strong><span>新しいマス</span></div>
          <div class="stat-divider" aria-hidden="true"></div>
          <div><strong id="todayPhotos">0</strong><span>写真</span></div>
        </div>
        <div class="header-actions">
          <span id="trackingStatus" class="status-pill">停止中</span>
          <button id="historyButton" class="history-button" type="button" aria-label="散歩履歴を開く">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 8.5 6H18a6.7 6.7 0 1 1-1.5-2.5L14 9h7V2l-2.8 2.8A8.9 8.9 0 0 0 12 3Zm-1 4v6l4.6 2.7 1-1.7-3.6-2.1V7h-2Z"/></svg>
            <span>履歴</span>
          </button>
        </div>
      </header>

      <div id="map" aria-label="散歩地図"></div>

      <div class="map-legend" aria-label="訪問回数の色">
        <span style="--level-color:#7dd3fc">1</span>
        <span style="--level-color:#2563eb">2</span>
        <span style="--level-color:#22c55e">5</span>
        <span style="--level-color:#facc15">10</span>
        <span style="--level-color:#f97316">20+</span>
      </div>

      <nav class="bottom-controls" aria-label="散歩操作">
        <button id="trackingButton" class="control-button primary" type="button"></button>
        <button id="cameraButton" class="control-button" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 4 7.8 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-2.8l-1.4-2H9.2ZM12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.8a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"/></svg>
          <span>カメラ</span>
        </button>
        <button id="locateButton" class="control-button" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v2.1a8 8 0 0 1 6.9 6.9H22v2h-2.1a8 8 0 0 1-6.9 6.9V22h-2v-2.1A8 8 0 0 1 4.1 13H2v-2h2.1A8 8 0 0 1 11 4.1V2Zm1 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>
          <span>現在地へ</span>
        </button>
      </nav>

      <input id="cameraInput" type="file" accept="image/*" hidden />
      <div id="toast" class="toast" role="status" aria-live="polite"></div>

      <dialog id="photoCommentDialog" class="modal">
        <div class="modal-card">
          <div class="modal-heading">
            <div><p class="eyebrow">PHOTO NOTE</p><h2>散歩のひとこと</h2></div>
          </div>
          <img id="photoPreview" class="photo-preview" alt="選択した写真のプレビュー" />
          <label class="comment-label" for="photoComment">コメント</label>
          <input id="photoComment" class="comment-input" maxlength="120" placeholder="何を見つけましたか？" />
          <div class="modal-actions">
            <button id="commentCancelButton" class="secondary-button" type="button">キャンセル</button>
            <button id="commentSaveButton" class="save-button" type="button">地図に残す</button>
          </div>
        </div>
      </dialog>

      <dialog id="historyDialog" class="modal history-modal">
        <div class="history-shell">
          <section id="historyListView" class="history-view">
            <header class="history-header">
              <div><p class="eyebrow">WALK ARCHIVE</p><h2>散歩の記録</h2></div>
              <button id="historyCloseButton" class="icon-close-button" type="button" aria-label="閉じる">×</button>
            </header>
            <div id="historyList" class="history-list"></div>
          </section>

          <section id="historyDetailView" class="history-view" hidden>
            <header class="history-header">
              <button id="historyBackButton" class="history-back-button" type="button">
                <span aria-hidden="true">‹</span> 一覧
              </button>
              <div class="history-detail-heading">
                <p id="historyDetailDate"></p>
                <span id="historyDetailTime"></span>
              </div>
            </header>

            <div class="history-metrics">
              <div><strong id="historyDetailDuration">0分</strong><span>時間</span></div>
              <div><strong id="historyDetailDistance">0m</strong><span>距離</span></div>
              <div><strong id="historyDetailCells">0マス</strong><span>歩いたマス</span></div>
            </div>

            <div class="history-map-wrap">
              <div id="historyMap" aria-label="この散歩のルート"></div>
              <p id="historyEmptyRoute" class="history-empty-route" hidden>表示できるGPSルートがありません</p>
            </div>

            <section id="historyPhotoSection" class="history-photo-section" hidden>
              <h3>この散歩の写真</h3>
              <div id="historyPhotoGrid" class="history-photo-grid"></div>
            </section>
          </section>
        </div>
      </dialog>

      <dialog id="cameraDialog" class="modal camera-modal">
        <div class="camera-card">
          <div class="camera-viewport">
            <video id="cameraPreview" autoplay muted playsinline></video>
            <p id="cameraStatus" class="camera-status">カメラを準備しています…</p>
            <button id="cameraSwitchButton" class="camera-switch-button" type="button" aria-label="内側と外側のカメラを切り替える">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.2 7.1A7 7 0 0 1 18 9h-2.5l3.7 3.7L23 9h-2.9A9 9 0 0 0 5.7 5.7L7.2 7.1ZM4.8 11.3 1 15h2.9a9 9 0 0 0 14.4 3.3l-1.5-1.4A7 7 0 0 1 6 15h2.5l-3.7-3.7Z" />
              </svg>
            </button>
          </div>
          <div class="camera-actions">
            <button id="cameraLibraryButton" class="camera-text-button" type="button">写真を選ぶ</button>
            <button id="cameraCaptureButton" class="shutter-button" type="button" aria-label="撮影">
              <span></span>
            </button>
            <button id="cameraCancelButton" class="camera-text-button" type="button">閉じる</button>
          </div>
        </div>
      </dialog>

      <dialog id="photoDetailDialog" class="modal">
        <div class="modal-card detail-card">
          <img id="detailPhoto" class="detail-photo" alt="散歩中に撮影した写真" />
          <div class="detail-copy">
            <p id="detailComment" class="detail-comment"></p>
            <time id="detailDate" class="detail-date"></time>
          </div>
          <div class="modal-actions">
            <button id="deletePhotoButton" class="delete-button" type="button">削除</button>
            <button id="detailCloseButton" class="save-button" type="button">閉じる</button>
          </div>
        </div>
      </dialog>
    </main>
  `;
}
