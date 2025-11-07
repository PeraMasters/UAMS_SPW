// Small helpers in case you want to compute aggregates client-side later.

export function percent(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
