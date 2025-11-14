export interface RemarkHistoryEntry {
  text: string;
  at: string;
  by: string | null;
  byName: string | null;
}

export function buildRemarkHistoryEntry(
  remark: string,
  authorId?: string | null,
  authorName?: string | null,
): RemarkHistoryEntry {
  return {
    text: remark,
    at: new Date().toISOString(),
    by: authorId ?? null,
    byName: authorName ?? null,
  };
}

export function appendRemarkHistory(
  prev: unknown,
  entry: RemarkHistoryEntry,
): RemarkHistoryEntry[] {
  if (!prev) return [entry];

  if (typeof prev === 'string') {
    return [
      {
        text: String(prev),
        at: new Date().toISOString(),
        by: null,
        byName: null,
      },
      entry,
    ];
  }

  if (Array.isArray(prev)) {
    return [entry, ...prev];
  }

  return [entry];
}
