export function fmt(value: number | null | undefined, decimals = 2, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  const s = value.toFixed(decimals);
  return unit ? `${s} ${unit}` : s;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortHash(hash: string | null | undefined, length = 12): string {
  return hash ? hash.slice(0, length) : "–";
}
