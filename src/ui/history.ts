import type { PhotoNote, TravelMode, WalkSession } from "../db/types";
import {
  formatDistance,
  formatDuration,
  formatSessionDate,
  formatSessionTimeRange,
  getRouteDistanceMeters,
  getRoutePoints,
  getSessionDurationMilliseconds,
} from "../history/history";
import {
  formatMonthLabel,
  getAllTags,
  groupByMonth,
  matchesMetadataFilter,
  normalizeTags,
} from "../library/metadata";
import { getSessionMode, getTravelModeConfig, TRAVEL_MODES } from "../travelMode";

type HistoryModalOptions = {
  getSessions: () => WalkSession[];
  getPhotos: (session: WalkSession) => PhotoNote[];
  onRenderRoute: (session: WalkSession, photos: PhotoNote[]) => void;
  onClearRoute: () => void;
  onOpenPhoto: (note: PhotoNote, onChanged: () => void) => void;
  onUpdateSession: (session: WalkSession) => Promise<void>;
};

export function showWalkHistoryModal(options: HistoryModalOptions): void {
  const dialog = requireElement<HTMLDialogElement>(document, "#historyDialog");
  const listView = requireElement<HTMLElement>(dialog, "#historyListView");
  const detailView = requireElement<HTMLElement>(dialog, "#historyDetailView");
  const list = requireElement<HTMLElement>(dialog, "#historyList");
  const tagFilter = requireElement<HTMLSelectElement>(dialog, "#historyTagFilter");
  const modeFilter = requireElement<HTMLSelectElement>(dialog, "#historyModeFilter");
  const favoriteFilter = requireElement<HTMLButtonElement>(dialog, "#historyFavoriteFilter");
  const closeButton = requireElement<HTMLButtonElement>(dialog, "#historyCloseButton");
  const backButton = requireElement<HTMLButtonElement>(dialog, "#historyBackButton");
  const detailDate = requireElement<HTMLElement>(dialog, "#historyDetailDate");
  const detailMode = requireElement<HTMLElement>(dialog, "#historyDetailMode");
  const detailTime = requireElement<HTMLElement>(dialog, "#historyDetailTime");
  const detailDuration = requireElement<HTMLElement>(dialog, "#historyDetailDuration");
  const detailDistance = requireElement<HTMLElement>(dialog, "#historyDetailDistance");
  const detailCells = requireElement<HTMLElement>(dialog, "#historyDetailCells");
  const detailFavorite = requireElement<HTMLButtonElement>(dialog, "#historyDetailFavorite");
  const detailTagsInput = requireElement<HTMLInputElement>(dialog, "#historyDetailTagsInput");
  const detailTagsSave = requireElement<HTMLButtonElement>(dialog, "#historyDetailTagsSave");
  const detailTags = requireElement<HTMLElement>(dialog, "#historyDetailTags");
  const photoSection = requireElement<HTMLElement>(dialog, "#historyPhotoSection");
  const photoGrid = requireElement<HTMLElement>(dialog, "#historyPhotoGrid");
  const emptyRoute = requireElement<HTMLElement>(dialog, "#historyEmptyRoute");
  const objectUrls: string[] = [];
  let selectedTag = "";
  let selectedMode: TravelMode | "" = "";
  let favoritesOnly = false;
  let currentSessionId: string | undefined;

  const releaseObjectUrls = () => {
    for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
  };

  const getCurrentSession = () => options.getSessions().find((session) => session.id === currentSessionId);

  const showList = () => {
    currentSessionId = undefined;
    options.onClearRoute();
    releaseObjectUrls();
    detailView.hidden = true;
    listView.hidden = false;
    list.replaceChildren();

    const allSessions = options.getSessions();
    populateTagFilter(tagFilter, getAllTags(allSessions), selectedTag);
    selectedTag = tagFilter.value;
    favoriteFilter.classList.toggle("is-active", favoritesOnly);
    favoriteFilter.setAttribute("aria-pressed", String(favoritesOnly));
    const sessions = allSessions
      .filter((session) => !selectedMode || getSessionMode(session.mode) === selectedMode)
      .filter((session) => matchesMetadataFilter(session, selectedTag, favoritesOnly))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

    if (sessions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = allSessions.length === 0
        ? "<strong>まだ移動記録がありません</strong><span>記録を開始すると、ここにルートが残ります。</span>"
        : "<strong>条件に合う記録がありません</strong><span>モード、タグ、お気に入りの絞り込みを変更してください。</span>";
      list.append(empty);
      return;
    }

    for (const [month, monthSessions] of groupByMonth(sessions, (session) => session.startedAt)) {
      const section = document.createElement("section");
      section.className = "archive-month-section";
      const heading = document.createElement("h3");
      heading.className = "archive-month-heading";
      heading.textContent = formatMonthLabel(month);
      const group = document.createElement("div");
      group.className = "history-month-list";
      for (const session of monthSessions) {
        group.append(createHistoryItem(session, options.getPhotos(session), objectUrls, () => showDetail(session.id)));
      }
      section.append(heading, group);
      list.append(section);
    }
  };

  const renderDetailMetadata = (session: WalkSession) => {
    detailFavorite.classList.toggle("is-active", Boolean(session.isFavorite));
    detailFavorite.setAttribute("aria-pressed", String(Boolean(session.isFavorite)));
    detailFavorite.textContent = session.isFavorite ? "★ お気に入り" : "☆ お気に入り";
    detailTagsInput.value = (session.tags ?? []).join(", ");
    renderTagChips(detailTags, session.tags ?? []);
  };

  const showDetail = (sessionId: string) => {
    currentSessionId = sessionId;
    const session = getCurrentSession();
    if (!session) return showList();

    releaseObjectUrls();
    const photos = options.getPhotos(session);
    listView.hidden = true;
    detailView.hidden = false;
    detailDate.textContent = formatSessionDate(session);
    const modeConfig = getTravelModeConfig(getSessionMode(session.mode));
    detailMode.textContent = `${modeConfig.icon} ${modeConfig.label}`;
    detailTime.textContent = formatSessionTimeRange(session);
    detailDuration.textContent = formatDuration(getSessionDurationMilliseconds(session));
    detailDistance.textContent = formatDistance(getRouteDistanceMeters(session));
    detailCells.textContent = `${session.visitedCellIds.length}マス`;
    renderDetailMetadata(session);
    emptyRoute.hidden = getRoutePoints(session).length > 0;
    photoSection.hidden = photos.length === 0;
    photoGrid.replaceChildren();

    for (const note of photos) {
      photoGrid.append(createPhotoButton(note, objectUrls, () => options.onOpenPhoto(note, () => showDetail(sessionId))));
    }

    options.onRenderRoute(session, photos);
  };

  tagFilter.onchange = () => {
    selectedTag = tagFilter.value;
    showList();
  };
  modeFilter.onchange = () => {
    selectedMode = modeFilter.value as TravelMode | "";
    showList();
  };
  favoriteFilter.onclick = () => {
    favoritesOnly = !favoritesOnly;
    showList();
  };
  detailFavorite.onclick = async () => {
    const session = getCurrentSession();
    if (!session) return;
    detailFavorite.disabled = true;
    try {
      const updated = { ...session, isFavorite: !session.isFavorite };
      await options.onUpdateSession(updated);
      renderDetailMetadata(updated);
    } catch {
      // The caller displays the persistence error.
    } finally {
      detailFavorite.disabled = false;
    }
  };
  detailTagsSave.onclick = async () => {
    const session = getCurrentSession();
    if (!session) return;
    detailTagsSave.disabled = true;
    try {
      const updated = { ...session, tags: normalizeTags(detailTagsInput.value) };
      await options.onUpdateSession(updated);
      renderDetailMetadata(updated);
    } catch {
      // The caller displays the persistence error.
    } finally {
      detailTagsSave.disabled = false;
    }
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
  if (session.isFavorite) {
    const favorite = document.createElement("span");
    favorite.className = "archive-favorite-badge";
    favorite.textContent = "★";
    thumbnail.append(favorite);
  }

  const copy = document.createElement("span");
  copy.className = "history-item-copy";
  const title = document.createElement("strong");
  const modeConfig = getTravelModeConfig(getSessionMode(session.mode));
  title.textContent = `${modeConfig.icon} ${formatSessionDate(session)}`;
  const meta = document.createElement("span");
  meta.textContent = `${formatDuration(getSessionDurationMilliseconds(session))} ・ ${formatDistance(getRouteDistanceMeters(session))}`;
  const submeta = document.createElement("span");
  submeta.className = "history-item-submeta";
  submeta.textContent = `${formatSessionTimeRange(session)} ・ 写真${photos.length}枚`;
  copy.append(title, meta, submeta, createTagRow(session.tags ?? []));

  const arrow = document.createElement("span");
  arrow.className = "history-item-arrow";
  arrow.textContent = "›";
  button.append(thumbnail, copy, arrow);
  return button;
}

function createPhotoButton(note: PhotoNote, objectUrls: string[], onClick: () => void): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-photo-card";
  button.onclick = onClick;

  const url = URL.createObjectURL(note.thumbnailBlob);
  objectUrls.push(url);
  const image = document.createElement("img");
  image.src = url;
  image.alt = note.comment || "移動中の写真";
  const comment = document.createElement("span");
  comment.textContent = `${note.isFavorite ? "★ " : ""}${note.comment || "コメントなし"}`;
  button.append(image, comment);
  return button;
}

function createTagRow(tags: string[]): HTMLElement {
  const row = document.createElement("span");
  row.className = "archive-card-tags";
  for (const tag of tags.slice(0, 3)) {
    const chip = document.createElement("span");
    chip.textContent = `#${tag}`;
    row.append(chip);
  }
  return row;
}

function renderTagChips(container: HTMLElement, tags: string[]): void {
  container.replaceChildren();
  for (const tag of tags) {
    const chip = document.createElement("span");
    chip.textContent = `#${tag}`;
    container.append(chip);
  }
}

function populateTagFilter(select: HTMLSelectElement, tags: string[], selectedTag: string): void {
  select.replaceChildren(new Option("すべてのタグ", ""));
  for (const tag of tags) select.add(new Option(`#${tag}`, tag));
  select.value = tags.includes(selectedTag) ? selectedTag : "";
}

export function renderTravelModeFilterOptions(): string {
  return [
    '<option value="">すべてのモード</option>',
    ...TRAVEL_MODES.map((mode) => {
      const config = getTravelModeConfig(mode);
      return `<option value="${mode}">${config.icon} ${config.label}</option>`;
    }),
  ].join("");
}

function routeIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7.5 14.4l3.2-4.8c.5-.8 1.4-1.3 2.4-1.3h2V10h-2c-.4 0-.8.2-1 .6l-3.2 4.8-1.4-1Z"/></svg>`;
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}
