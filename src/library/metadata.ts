export type TaggedItem = {
  tags?: string[];
  isFavorite?: boolean;
};

export function normalizeTags(input: string): string[] {
  const tags = input
    .split(/[,、\n]/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .map((tag) => tag.slice(0, 20));

  return [...new Set(tags)].slice(0, 12);
}

export function getAllTags(items: TaggedItem[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags ?? []) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "ja"));
}

export function matchesMetadataFilter(
  item: TaggedItem,
  selectedTag: string,
  favoritesOnly: boolean,
): boolean {
  if (favoritesOnly && !item.isFavorite) return false;
  if (selectedTag && !(item.tags ?? []).includes(selectedTag)) return false;
  return true;
}

export function getMonthKey(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}年${month}月`;
}

export function groupByMonth<T>(items: T[], getTimestamp: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getMonthKey(getTimestamp(item));
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}
