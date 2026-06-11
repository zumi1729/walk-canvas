import type { PhotoNote, WalkSession } from "../db/types";
import {
  formatDistance,
  formatDuration,
  formatSessionDate,
  formatSessionTimeRange,
  getRouteDistanceMeters,
  getRoutePoints,
  getSessionDurationMilliseconds,
} from "../history/history";

type HistoryModalOptions = {
  sessions: WalkSession[];
  getPhotos: (session: WalkSession) => PhotoNote[];
  onRenderRoute: (session: WalkSession, photos: PhotoNote[]) => void;
  onClearRoute: () => void;
  onOpenPhoto: (note: PhotoNote) => void;
};

export function showWalkHistoryModal(options: HistoryModalOptions): void {
  const dialog = requireElement<HTMLDialogElement>(document, "#historyDialog");
  const listView = requireElement<HTMLElement>(dialog, "#historyListView");
  const detailView = requireElement<HTMLElement>(dialog, "#historyDetailView");
  const list = requireElement<HTMLElement>(dialog, "#historyList");
  const closeButton = requireElement<HTMLButtonElement>(dialog, "#historyCloseButton");
  const backButton = requireElement<HTMLButtonElement>(dialog, "#historyBackButton");
  const detailDate = requireElement<HTMLElement>(dialog, "#historyDetailDate");
  const detailTime = requireElement<HTMLElement>(dialog, "#historyDetailTime");
  const detailDuration = requireElement<HTMLElement>(dialog, "#historyDetailDuration");
  const detailDistance = requireElement<HTMLElement>(dialog, "#historyDetailDistance");
  const detailCells = requireElement<HTMLElement>(dialog, "#historyDetailCells");
  const photoSection = requireElement<HTMLElement>(dialog, "#historyPhotoSection");
  const photoGrid = requireElement<HTMLElement>(dialog, "#historyPhotoGrid");
  const emptyRoute = requireElement<HTMLElement>(dialog, "#historyEmptyRoute");
  const objectUrls: string[] = [];

  const releaseObjectUrls = () => {
    for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
  };

  const showList = () => {
    options.onClearRoute();
    releaseObjectUrls();
    detailView.hidden = true;
    listView.hidden = false;
    list.replaceChildren();

    const sessions = [...options.sessions].sort(
      (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
    );
    if (sessions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = "<strong>まだ散歩の記録がありません</strong><span>散歩を開始すると、ここにルートが残ります。</span>";
      list.append(empty);
      return;
    }

    for (const session of sessions) {
      const photos = options.getPhotos(session);
      list.append(createHistoryItem(session, photos, objectUrls, () => showDetail(session)));
    }
  };

  const showDetail = (session: WalkSession) => {
    releaseObjectUrls();
    const photos = options.getPhotos(session);
    listView.hidden = true;
    detailView.hidden = false;
    detailDate.textContent = formatSessionDate(session);
    detailTime.textContent = formatSessionTimeRange(session);
    detailDuration.textContent = formatDuration(getSessionDurationMilliseconds(session));
    detailDistance.textContent = formatDistance(getRouteDistanceMeters(session));
    detailCells.textContent = `${session.visitedCellIds.length}マス`;
    emptyRoute.hidden = getRoutePoints(session).length > 0;
    photoSection.hidden = photos.length === 0;
    photoGrid.replaceChildren();

    for (const note of photos) {
      photoGrid.append(createPhotoButton(note, objectUrls, options.onOpenPhoto));
    }

    options.onRenderRoute(session, photos);
  };

  closeButton.onclick = () => dialog.close();
  backButton.onclick = showList;
  dialog.oncancel = () => dialog.close();
  dialog.onclose = () => {
    options.onClearRoute();
    releaseObjectUrls();
  };

  showList();
  dialog.showModal();
}

function createHistoryItem(
  session: WalkSession,
  photos: PhotoNote[],
  objectUrls: string[],
  onClick: () => void,
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-item";
  button.onclick = onClick;

  const thumbnail = document.createElement("div");
  thumbnail.className = "history-item-thumbnail";
  const firstPhoto = photos[0];
  if (firstPhoto) {
    const url = URL.createObjectURL(firstPhoto.thumbnailBlob);
    objectUrls.push(url);
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    thumbnail.append(image);
  } else {
    thumbnail.innerHTML = routeIcon();
  }

  const copy = document.createElement("span");
  copy.className = "history-item-copy";
  const title = document.createElement("strong");
  title.textContent = formatSessionDate(session);
  const meta = document.createElement("span");
  meta.textContent = `${formatDuration(getSessionDurationMilliseconds(session))} ・ ${formatDistance(getRouteDistanceMeters(session))}`;
  const submeta = document.createElement("span");
  submeta.textContent = `${formatSessionTimeRange(session)} ・ 写真${photos.length}枚`;
  copy.append(title, meta, submeta);

  const arrow = document.createElement("span");
  arrow.className = "history-item-arrow";
  arrow.textContent = "›";
  button.append(thumbnail, copy, arrow);
  return button;
}

function createPhotoButton(
  note: PhotoNote,
  objectUrls: string[],
  onOpenPhoto: (note: PhotoNote) => void,
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-photo-card";
  button.onclick = () => onOpenPhoto(note);

  const url = URL.createObjectURL(note.thumbnailBlob);
  objectUrls.push(url);
  const image = document.createElement("img");
  image.src = url;
  image.alt = note.comment || "散歩中の写真";
  const comment = document.createElement("span");
  comment.textContent = note.comment || "コメントなし";
  button.append(image, comment);
  return button;
}

function routeIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7.5 14.4l3.2-4.8c.5-.8 1.4-1.3 2.4-1.3h2V10h-2c-.4 0-.8.2-1 .6l-3.2 4.8-1.4-1Z"/></svg>`;
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}
