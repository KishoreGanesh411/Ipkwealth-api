export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, '');
  return digits.slice(-12); // last 10–12 digits
}

export function parseClientQa(input?: string[] | null): any {
  if (!input?.length) return null;
  // Store as array of strings; server stays agnostic of format
  return input
    .flatMap((t) =>
      String(t)
        .split(/\r?\n+/)
        .map((x) => x.trim())
        .filter(Boolean)
    )
    .slice(0, 12); // cap to ~12 lines (your “5–6” items, accounting for sublines)
}

export function parseApproachAt(v?: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(+v)) return v;
  if (typeof v === 'string') {
    // JS Date supports ISO-8601 with timezone offsets (+05:30) and stores the exact instant in UTC. 
    // Example: new Date('2025-09-18T08:40:43+05:30')
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}
