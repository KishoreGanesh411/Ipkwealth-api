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

// src/app/lead/common/phone.util.ts
export function parseApproachAt(v: unknown): Date | null {
  if (v == null) return null;

  // Accept Date instance
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  // Accept epoch (ms or s)
  if (typeof v === 'number') {
    const ms = v > 1e12 ? v : v * 1000; // if seconds, convert to ms
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // Accept strings (ISO 8601 recommended)
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const d = new Date(s); // handles "YYYY-MM-DDTHH:mm:ss[.sss][Z|±HH:mm]"
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

