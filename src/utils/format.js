export const fmt = (n) =>
  new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:0 })
    .format(n ?? 0).replace('NGN','₦');

export const fmtCompact = (n) => {
  n = n ?? 0;
  if (n >= 1_000_000) return `₦${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n/1_000).toFixed(0)}k`;
  return `₦${n}`;
};

export const fmtNum = (n) => new Intl.NumberFormat('en-NG').format(n ?? 0);

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  } catch { return d; }
};

export const fmtDateShort = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
  } catch { return d; }
};

export const statusLabel = (s) =>
  s ? s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

export const profitColor = (pct) => {
  if (pct >= 60) return 'text-green-400';
  if (pct >= 40) return 'text-yellow-400';
  return 'text-rose-400';
};
