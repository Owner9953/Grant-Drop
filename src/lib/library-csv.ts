/**
 * CSV export of a user's saved library.
 *
 * Columns are quoted and internal quotes doubled so a title containing a comma
 * or a quote cannot break the file.
 */

export interface CsvRow {
  name: string;
  store: string;
  worth: string;
  platforms: string;
  endsAt: number | null;
  savedAt: number;
  claimedAt: number | null;
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function isoOrBlank(epoch: number | null): string {
  return epoch === null ? "" : new Date(epoch).toISOString();
}

export function toCsv(rows: CsvRow[]): string {
  const header = [
    "Title",
    "Store",
    "Retail price",
    "Platforms",
    "Ends",
    "Saved",
    "Claimed",
  ];
  const lines = rows.map((row) =>
    [
      quote(row.name),
      quote(row.store),
      quote(row.worth),
      quote(row.platforms),
      quote(isoOrBlank(row.endsAt)),
      quote(isoOrBlank(row.savedAt)),
      quote(isoOrBlank(row.claimedAt)),
    ].join(","),
  );
  return [header.map(quote).join(","), ...lines].join("\r\n");
}

/** Triggers a client-side download of the serialised CSV. */
export function downloadCsv(filename: string, csv: string): void {
  // Byte-order mark so Excel opens UTF-8 titles correctly. Written as an escape
  // rather than a literal character, which is invisible in most editors.
  const BOM = "\uFEFF";
  const blob = new Blob([`${BOM}${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface AgendaDay<T> {
  key: string;
  label: string;
  isToday: boolean;
  entries: T[];
}

/**
 * Groups offers into an agenda by the day they expire, for the calendar view.
 * Offers with no published deadline are collected under a single trailing group
 * rather than being dropped. Entries keep their original shape so callers can
 * still reach fields like the claim URL.
 */
export function groupByDeadline<T extends { endsAt: number | null }>(
  items: T[],
  now = Date.now(),
): AgendaDay<T>[] {
  const buckets = new Map<string, T[]>();
  const undated: T[] = [];

  for (const item of items) {
    if (item.endsAt === null) {
      undated.push(item);
      continue;
    }
    const key = new Date(item.endsAt).toISOString().slice(0, 10);
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }

  const todayKey = new Date(now).toISOString().slice(0, 10);
  const days: AgendaDay<T>[] = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, entries]) => ({
      key,
      label: new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      isToday: key === todayKey,
      entries,
    }));

  if (undated.length > 0) {
    days.push({
      key: "no-deadline",
      label: "No published deadline",
      isToday: false,
      entries: undated,
    });
  }

  return days;
}
