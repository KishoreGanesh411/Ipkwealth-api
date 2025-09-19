export function pad4(n: number) {
  return String(n).padStart(4, '0');
}

export function makeMonthlyLeadKey(d = new Date()) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return {
    key: `lead_seq_${yy}${mm}`,
    prefix: `IPK${yy}${mm}`,
  };
}
