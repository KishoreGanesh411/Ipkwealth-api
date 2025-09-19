export function makeLeadCode(seq: number, d = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2); // 25
  const mm = String(d.getMonth() + 1).padStart(2, '0'); // 09
  // Example: IPK25-09-000001   (change to `IPK${yy}${mm}...` if you prefer no hyphen)
  return `IPK${yy}-${mm}-${String(seq).padStart(6, '0')}`;
}
