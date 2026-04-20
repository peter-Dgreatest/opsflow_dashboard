// ─── Shared UI primitives ─────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, change, changeLabel, accent = 'lime', icon: Icon }) {
  const borders = {
    lime: 'border-t-lime-400', sky: 'border-t-sky-400', green: 'border-t-green-400',
    coral: 'border-t-rose-400', violet: 'border-t-violet-400', orange: 'border-t-orange-400',
    emerald: 'border-t-emerald-400', yellow: 'border-t-yellow-400', fuchsia: 'border-t-fuchsia-400'
  };
  const isUp = change > 0;
  return (
    <div className={`card p-4 border-t-2 ${borders[accent] || 'border-t-lime-400'}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold">{label}</p>
        {Icon && <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center"><Icon size={14} className="text-muted" /></div>}
      </div>
      <p className="text-lg sm:text-xl font-bold font-mono truncate leading-tight">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${isUp ? 'bg-green-400/10 text-green-400' : 'bg-rose-400/10 text-rose-400'}`}>
            {isUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{Math.abs(change)}%
          </span>
          <span className="text-xs text-muted">{changeLabel || 'vs last month'}</span>
        </div>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`card p-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Data Table ─────────────────────────────────────────────────────────────────
export function DataTable({ columns, data, searchable = true, pageSize = 10, emptyMessage = 'No records found', onRowClick }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: null, dir: 1 });

  const filtered = data.filter(row =>
    !q || columns.some(c => {
      const val = c.accessor ? row[c.accessor] : (c.render ? '' : '');
      return String(val ?? '').toLowerCase().includes(q.toLowerCase());
    })
  );

  const sorted = sort.key
    ? [...filtered].sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (av == null) return 1; if (bv == null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    })
    : filtered;

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const slice = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key) => {
    if (!key) return;
    setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 });
    setPage(0);
  };

  return (
    <div>
      {searchable && (
        <div className="flex items-center gap-2 bg-input border border-border rounded-lg px-3 py-2 mb-3 max-w-xs">
          <Search size={13} className="text-muted shrink-0" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }}
            placeholder="Search…" className="bg-transparent outline-none text-xs text-text w-full placeholder:text-muted" />
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key || col.accessor || col.label}
                  className={`text-left text-[10px] font-semibold text-muted uppercase tracking-widest px-3 py-2.5 border-b border-border ${col.mobileHide ? 'hidden sm:table-cell' : ''} whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-text' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.accessor)}>
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sort.key === col.accessor && (
                      sort.dir === 1 ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center text-muted text-xs py-10">{emptyMessage}</td></tr>
            ) : slice.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)} className="border-b border-border/40 hover:bg-white/[0.02] transition-colors">
                {columns.map(col => (
                  <td key={col.key || col.accessor || col.label} className={`px-3 py-3 text-xs text-text whitespace-nowrap ${col.mobileHide ? 'hidden sm:table-cell' : ''}`}>
                    {col.render ? col.render(row) : row[col.accessor] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2.5 py-1 rounded border border-border disabled:opacity-30 hover:bg-white/5 transition-colors">Prev</button>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="px-2.5 py-1 rounded border border-border disabled:opacity-30 hover:bg-white/5 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    planned: 'bg-blue-500/10 text-blue-400',
    confirmed: 'bg-violet-500/10 text-violet-400',
    in_progress: 'bg-sky-500/10 text-sky-400',
    completed: 'bg-green-500/10 text-green-400',
    cancelled: 'bg-red-500/10 text-red-400',
    active: 'bg-emerald-500/10 text-emerald-400',
    inactive: 'bg-zinc-500/10 text-zinc-400',
    deprecated: 'bg-red-500/10 text-red-400',
    available: 'bg-green-500/10 text-green-400',
    in_use: 'bg-sky-500/10 text-sky-400',
    maintenance: 'bg-yellow-500/10 text-yellow-400',
    retired: 'bg-zinc-500/10 text-zinc-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
    dismissed: 'bg-zinc-500/10 text-zinc-400',
    open: 'bg-sky-500/10 text-sky-400',
    follow_up: 'bg-amber-500/10 text-amber-400',
    converted: 'bg-green-500/10 text-green-400',
    closed: 'bg-zinc-500/10 text-zinc-400',
    client_ghosted: 'bg-red-500/10 text-red-400',
    budget_too_high: 'bg-orange-500/10 text-orange-400',
    draft: 'bg-zinc-500/10 text-zinc-400',
    sent: 'bg-sky-500/10 text-sky-400',
    paid: 'bg-green-500/10 text-green-400',
    overdue: 'bg-red-500/10 text-red-400',
  };
  const label = status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
  return <span className={`badge text-[10px] ${map[status] || 'bg-zinc-500/10 text-zinc-400'}`}>{label}</span>;
}

// ── Page Header ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-input border border-border rounded-lg p-1 w-fit mb-5">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${active === t.key ? 'bg-card text-text shadow-sm' : 'text-muted hover:text-text'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4"><Icon size={22} className="text-muted" /></div>}
      <p className="text-sm font-medium mb-1">{title}</p>
      {description && <p className="text-xs text-muted max-w-xs">{description}</p>}
    </div>
  );
}

// ── Mini Sparkline (pure CSS bar) ────────────────────────────────────────────
export function Sparkbar({ data, color = '#a3e635', height = 28 }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.7, width: 5, borderRadius: 2, minHeight: 2 }} />
      ))}
    </div>
  );
}
