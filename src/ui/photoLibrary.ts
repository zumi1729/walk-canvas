import type { PhotoNote } from "../db/types";
import {
  formatMonthLabel,
  getAllTags,
  groupByMonth,
  matchesMetadataFilter,
} from "../library/metadata";

type PhotoLibraryOptions = {
  getNotes: () => PhotoNote[];
  onOpenPhoto: (note: PhotoNote, onChanged: () => void) => void;
};

export function showPhotoLibraryModal(options: PhotoLibraryOptions): void {
  const dialog = requireElement<HTMLDialogElement>(document, "#photoLibraryDialog");
  const content = requireElement<HTMLElement>(dialog, "#photoLibraryContent");
  const tagFilter = requireElement<HTMLSelectElement>(dialog, "#photoTagFilter");
  const favoriteFilter = requireElement<HTMLButtonElement>(dialog, "#photoFavoriteFilter");
  const closeButton = requireElement<HTMLButtonElement>(dialog, "#photoLibraryCloseButton");
  const objectUrls: string[] = [];
  let selectedTag = "";
  let favoritesOnly = false;

  const releaseObjectUrls = () => {
    for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
  };

  const render = () => {
    const allNotes = options.getNotes();
    releaseObjectUrls();
    content.replaceChildren();
    populateTagFilter(tagFilter, getAllTags(allNotes), selectedTag);
    selectedTag = tagFilter.value;

    const filtered = allNotes
      .filter((note) => matchesMetadataFilter(note, selectedTag, favoritesOnly))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    favoriteFilter.classList.toggle("is-active", favoritesOnly);
    favoriteFilter.setAttribute("aria-pressed", String(favoritesOnly));

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = allNotes.length === 0
        ? "<strong>まだ写真がありません</strong><span>カメラから撮影すると、ここに写真が並びます。</span>"
        : "<strong>条件に合う写真がありません</strong><span>タグかお気に入りの絞り込みを変更してください。</span>";
      content.append(empty);
      return;
    }

    for (const [month, notes] of groupByMonth(filtered, (note) => note.createdAt)) {
      const section = document.createElement("section");
      section.className = "archive-month-section";
      const heading = document.createElement("h3");
      heading.className = "archive-month-heading";
      heading.textContent = formatMonthLabel(month);
      const grid = document.createElement("div");
      grid.className = "photo-library-grid";
      for (const note of notes) grid.append(createPhotoCard(note, objectUrls, () => options.onOpenPhoto(note, render)));
      section.append(heading, grid);
      content.append(section);
    }
  };

  tagFilter.onchange = () => {
    selectedTag = tagFilter.value;
    render();
  };
  favoriteFilter.onclick = () => {
    favoritesOnly = !favoritesOnly;
    render();
  };
  closeButton.onclick = () => dialog.close();
  dialog.oncancel = () => dialog.close();
  dialog.onclose = releaseObjectUrls;

  render();
  dialog.showModal();
}

function createPhotoCard(note: PhotoNote, objectUrls: string[], onClick: () => void): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "photo-library-card";
  button.onclick = onClick;

  const imageWrap = document.createElement("span");
  imageWrap.className = "photo-library-image";
  const imageUrl = URL.createObjectURL(note.thumbnailBlob);
  objectUrls.push(imageUrl);
  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = note.comment || "散歩中の写真";
  imageWrap.append(image);

  if (note.isFavorite) {
    const favorite = document.createElement("span");
    favorite.className = "archive-favorite-badge";
    favorite.textContent = "★";
    imageWrap.append(favorite);
  }

  const copy = document.createElement("span");
  copy.className = "photo-library-copy";
  const comment = document.createElement("strong");
  comment.textContent = note.comment || "コメントなし";
  const date = document.createElement("time");
  date.textContent = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(note.createdAt));
  copy.append(comment, date, createTagRow(note.tags ?? []));
  button.append(imageWrap, copy);
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

function populateTagFilter(select: HTMLSelectElement, tags: string[], selectedTag: string): void {
  select.replaceChildren(new Option("すべてのタグ", ""));
  for (const tag of tags) select.add(new Option(`#${tag}`, tag));
  select.value = tags.includes(selectedTag) ? selectedTag : "";
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}
