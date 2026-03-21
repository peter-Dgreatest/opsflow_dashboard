import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, KpiCard, Tabs, DataTable } from '../components/ui';
import { Topbar } from '../components/layout';
import { fmtCompact, fmt } from '../utils/format';
import { reportsApi } from '../api/endpoints';
import { Download, BarChart2, TrendingUp } from 'lucide-react';

const normalize = d => d?.data || d || [];
const COLORS = ['#a3e635', '#34d399', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#facc15'];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E2026] border border-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-muted mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted capitalize">{p.name}:</span>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' && p.value > 999 ? fmtCompact(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const REPORT_TABS = [
  { key: 'financial', label: 'Financial' },
  { key: 'operational', label: 'Operational' },
  { key: 'crew', label: 'Crew' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'customers', label: 'Customers' },
  { key: 'expenses', label: 'Expenses' },
];

const CUST_COLS = [
  { label: 'Customer', accessor: 'name', sortable: true },
  { label: 'Total Jobs', accessor: 'totalJobs', sortable: true, render: r => <span className="font-mono">{r.totalJobs || r.total_jobs || 0}</span> },
  { label: 'Revenue', accessor: 'totalAmountPaid', sortable: true, render: r => <span className="font-mono text-green-400">{fmtCompact(r.totalAmountPaid || r.revenue || 0)}</span> },
  { label: 'Profit', accessor: 'totalProfit', sortable: true, render: r => <span className="font-mono text-lime-400">{fmtCompact(r.totalProfit || r.profit || 0)}</span> },
  {
    label: 'Margin', render: r => {
      const rev = r.totalAmountPaid || r.revenue || 0;
      const prof = r.totalProfit || r.profit || 0;
      const m = rev > 0 ? ((prof / rev) * 100).toFixed(1) : 0;
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-lime-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, m))}%` }} />
          </div>
          <span className="font-mono text-xs text-lime-400">{m}%</span>
        </div>
      );
    }
  },
];

const CREW_COLS = [
  { label: 'Crew Member', accessor: 'name', sortable: true },
  { label: 'Total Jobs', accessor: 'totalJobs', sortable: true, render: r => <span className="font-mono">{r.totalJobs || r.total_jobs || 0}</span> },
  { label: 'Total Paid', accessor: 'totalAmountPaid', sortable: true, render: r => <span className="font-mono text-orange-400">{fmtCompact(r.totalAmountPaid || r.totalPaid || 0)}</span> },
];

const EQ_COLS = [
  { label: 'Equipment', accessor: 'name', sortable: true },
  { label: 'Days Rented', accessor: 'daysRented', sortable: true, render: r => <span className="font-mono">{r.daysRented || r.days_rented || 0}</span> },
  { label: 'Revenue', accessor: 'revenue', sortable: true, render: r => <span className="font-mono text-emerald-400">{fmtCompact(r.revenue || 0)}</span> },
  {
    label: 'Utilization', accessor: 'utilizationPct', sortable: true,
    render: r => {
      const pct = r.utilizationPct || r.utilization_pct || 0;
      const col = pct >= 70 ? '#34d399' : pct >= 40 ? '#facc15' : '#fb7185';
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
          </div>
          <span className="font-mono text-xs" style={{ color: col }}>{pct}%</span>
        </div>
      );
    }
  },
];

const EXPENSE_COLS = [
  { label: 'Category', accessor: 'category', sortable: true },
  { label: 'Total Amount', accessor: 'amount', sortable: true, render: r => <span className="font-mono text-rose-400">{fmtCompact(r.amount || 0)}</span> },
  { label: 'Count', accessor: 'count', sortable: true, render: r => <span className="font-mono">{r.count || 0}</span> },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('financial');
  const [period, setPeriod] = useState('monthly');

  const { data: financial = {} } = useQuery({ queryKey: ['report-financial', period], queryFn: () => reportsApi.financial({ period }), select: d => d?.data || d || {} });
  const { data: jobsReport = [] } = useQuery({ queryKey: ['report-jobs', period], queryFn: () => reportsApi.jobs({ period }), select: normalize });
  const { data: crewReport = [] } = useQuery({ queryKey: ['report-crew'], queryFn: () => reportsApi.crew(), select: normalize });
  const { data: eqReport = [] } = useQuery({ queryKey: ['report-equipment'], queryFn: () => reportsApi.equipment(), select: normalize });
  const { data: custReport = [] } = useQuery({ queryKey: ['report-customers'], queryFn: () => reportsApi.customers(), select: normalize });
  const { data: expReport = [] } = useQuery({ queryKey: ['report-expenses', period], queryFn: () => reportsApi.expenses({ period }), select: normalize });
  const { data: monthly = [] } = useQuery({ queryKey: ['monthly-report'], queryFn: () => reportsApi.monthly(), select: normalize });

  // Aggregate KPIs from financial report
  const totalRevenue = financial.totalRevenue || monthly?.reduce((s, m) => s + (parseFloat(m.revenue) || parseFloat(m.totalRevenue) || 0), 0);
  const totalProfit = financial.totalProfit || monthly.reduce((s, m) => s + (parseFloat(m.profit) || parseFloat(m.totalProfit) || 0), 0);
  const totalExpenses = financial.totalExpenses || monthly.reduce((s, m) => s + (parseFloat(m.expenses) || parseFloat(m.totalExpenses) || 0), 0);
  const avgMargin = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Build chart data from monthly aggregates
  const trendData = monthly.map(m => ({
    month: m.month || m.monthStart?.slice(0, 7),
    revenue: m.revenue || m.totalRevenue || 0,
    profit: m.profit || m.totalProfit || 0,
    expenses: m.expenses || m.totalExpenses || 0,
    margin: (m.revenue || m.totalRevenue || 0) > 0 ? +(((parseFloat(m.profit) || parseFloat(m.totalProfit) || 0) / (parseFloat(m.revenue) || parseFloat(m.totalRevenue) || 0)) * 100).toFixed(1) : 0,
    jobs: m.jobs || m.totalJobs || 0,
  }));

  // Expense breakdown pie data
  const expPieData = expReport.length
    ? expReport
    : [
      { category: 'Crew', amount: totalExpenses * 0.35 },
      { category: 'Equipment', amount: totalExpenses * 0.40 },
      { category: 'Third Party', amount: totalExpenses * 0.15 },
      { category: 'Misc', amount: totalExpenses * 0.10 },
    ];

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${filename}.csv`;
    a.click();
  };

  return (
    <>
      <Topbar title="Reports" subtitle="Financial & operational analytics"
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 bg-input border border-border rounded-lg p-1">
              {['weekly', 'monthly', 'yearly'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-md capitalize cursor-pointer transition-all ${period === p ? 'bg-card text-text' : 'text-muted hover:text-text'}`}>{p}</button>
              ))}
            </div>
            <button onClick={() => exportCSV(trendData, `opsflow-${tab}-report`)}
              className="btn-ghost flex items-center gap-1.5 text-xs">
              <Download size={12} />Export CSV
            </button>
          </div>
        } />
      <div className="flex-1 overflow-y-auto p-5">

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Revenue" value={fmtCompact(totalRevenue)} accent="lime" icon={BarChart2} />
          <KpiCard label="Total Profit" value={fmtCompact(totalProfit)} accent="green" icon={TrendingUp} />
          <KpiCard label="Total Expenses" value={fmtCompact(totalExpenses)} accent="coral" icon={BarChart2} />
          <KpiCard label="Avg Margin" value={`${avgMargin}%`} accent="violet" icon={TrendingUp} />
        </div>

        <Tabs tabs={REPORT_TABS} active={tab} onChange={setTab} />

        {/* ── FINANCIAL ──────────────────────────────────────────────────────── */}
        {tab === 'financial' && (
          <div className="space-y-5">
            <Card title="Revenue, Profit & Expenses" subtitle={`${period.charAt(0).toUpperCase() + period.slice(1)} view`}>
              {trendData.length === 0
                ? <div className="h-[260px] flex items-center justify-center text-muted text-xs">No data available</div>
                : <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#a3e635" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.85} />
                    <Bar yAxisId="left" dataKey="expenses" fill="#fb7185" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.85} />
                    <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#e879f9" strokeWidth={2} dot={{ fill: '#e879f9', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              }
              <div className="flex gap-5 mt-3">
                {[['Revenue', '#a3e635'], ['Expenses', '#fb7185'], ['Margin %', '#e879f9']].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="w-3 h-1.5 rounded-sm" style={{ background: c }} />{l}
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-5">
              <Card title="Profit Trend">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} fill="url(#pg)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Expenses Breakdown">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={expPieData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} dataKey="amount" paddingAngle={3}>
                      {expPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {expPieData.map((d, i) => (
                    <div key={d.category || d.tag} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.category || d.tag}: <span className="font-mono">{fmtCompact(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── OPERATIONAL ────────────────────────────────────────────────────── */}
        {tab === 'operational' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Card title="Jobs per Period">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="jobs" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Avg Revenue per Job">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData.map(m => ({ ...m, avgRev: m.jobs > 0 ? Math.round(m.revenue / m.jobs) : 0 }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Line type="monotone" dataKey="avgRev" stroke="#a3e635" strokeWidth={2} dot={{ fill: '#a3e635', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {jobsReport.length > 0 && (
              <Card title="Job Details" subtitle="All recorded jobs">
                <DataTable columns={[
                  { label: 'Job', accessor: 'jobTitle', render: r => <span className="text-xs font-medium">{r.jobTitle || r.title}</span> },
                  { label: 'Revenue', accessor: 'totalRevenue', sortable: true, render: r => <span className="font-mono text-green-400">{fmtCompact(r.totalRevenue || 0)}</span> },
                  { label: 'Profit', accessor: 'jobProfit', sortable: true, render: r => <span className="font-mono text-lime-400">{fmtCompact(r.jobProfit || 0)}</span> },
                  { label: 'Margin', accessor: 'profitMargin', sortable: true, render: r => <span className="font-mono text-xs">{parseFloat(r.profitMargin || 0).toFixed(1)}%</span> },
                ]} data={jobsReport} pageSize={8} searchable={false} />
              </Card>
            )}
          </div>
        )}

        {/* ── CREW ──────────────────────────────────────────────────────────── */}
        {tab === 'crew' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Card title="Crew Earnings">
                {crewReport.length === 0
                  ? <div className="h-[220px] flex items-center justify-center text-muted text-xs">No crew data yet</div>
                  : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={crewReport.slice(0, 8)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="totalAmountPaid" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={36} name="paid" />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </Card>

              <Card title="Top Crew by Jobs">
                {crewReport.length === 0
                  ? <div className="py-8 text-center text-muted text-xs">No data</div>
                  : <div className="space-y-3 mt-2">
                    {[...crewReport].sort((a, b) => (b.totalJobs || 0) - (a.totalJobs || 0)).slice(0, 6).map((c, i) => {
                      const maxJobs = crewReport.reduce((m, x) => Math.max(m, x.totalJobs || 0), 1);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] text-muted font-mono w-4">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium">{c.name}</span>
                              <span className="text-muted">{c.totalJobs || 0} jobs</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${((c.totalJobs || 0) / maxJobs) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-mono text-orange-400">{fmtCompact(c.totalAmountPaid || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                }
              </Card>
            </div>
            <Card title="Crew Performance Details">
              <DataTable columns={CREW_COLS} data={crewReport} searchable={false} />
            </Card>
          </div>
        )}

        {/* ── EQUIPMENT ──────────────────────────────────────────────────────── */}
        {tab === 'equipment' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Card title="Equipment Revenue">
                {eqReport.length === 0
                  ? <div className="h-[220px] flex items-center justify-center text-muted text-xs">No equipment data yet</div>
                  : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={eqReport.slice(0, 8)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </Card>
              <Card title="Utilization Rates">
                {eqReport.length === 0
                  ? <div className="py-8 text-center text-muted text-xs">No data</div>
                  : <div className="space-y-3 mt-2">
                    {[...eqReport].sort((a, b) => (parseFloat(b.utilizationPct) || 0) - (parseFloat(a.utilizationPct) || 0)).slice(0, 7).map((e, i) => {
                      const pct = Math.min(100, parseFloat(e.utilizationPct || e.utilization_pct || 0));
                      const col = pct >= 70 ? '#34d399' : pct >= 40 ? '#facc15' : '#fb7185';
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted truncate max-w-[160px]">{e.name}</span>
                            <span className="font-mono" style={{ color: col }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </Card>
            </div>
            <Card title="Equipment Performance">
              <DataTable columns={EQ_COLS} data={eqReport} searchable={false} />
            </Card>
          </div>
        )}

        {/* ── CUSTOMERS ──────────────────────────────────────────────────────── */}
        {tab === 'customers' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Card title="Revenue by Customer">
                {custReport.length === 0
                  ? <div className="h-[220px] flex items-center justify-center text-muted text-xs">No data yet</div>
                  : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={custReport.slice(0, 8)} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="totalAmountPaid" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={28} name="revenue" />
                      <Bar dataKey="totalProfit" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={28} name="profit" />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </Card>
              <Card title="Top Customers Ranking">
                {custReport.length === 0
                  ? <div className="py-8 text-center text-muted text-xs">No data</div>
                  : <div className="space-y-3 mt-2">
                    {[...custReport].sort((a, b) => (parseFloat(b.totalAmountPaid) || 0) - (parseFloat(a.totalAmountPaid) || 0)).slice(0, 6).map((c, i) => {
                      const maxRev = custReport.reduce((m, x) => Math.max(m, parseFloat(x.totalAmountPaid) || 0), 1);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] text-muted font-mono w-4">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium truncate max-w-[120px]">{c.name || c.fullName}</span>
                              <span className="text-muted">{c.totalJobs || 0} jobs</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${((c.totalAmountPaid || 0) / maxRev) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-mono text-violet-400">{fmtCompact(c.totalAmountPaid || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                }
              </Card>
            </div>
            <Card title="Customer Revenue Details">
              <DataTable columns={CUST_COLS} data={custReport} searchable={false} />
            </Card>
          </div>
        )}

        {/* ── EXPENSES ──────────────────────────────────────────────────────── */}
        {tab === 'expenses' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Card title="Expenses Over Time">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} fill="url(#eg)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Expenses by Category">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expReport} cx="50%" cy="50%" outerRadius={72} innerRadius={35} dataKey="amount" paddingAngle={3}>
                      {expReport.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {expReport.map((d, i) => (
                    <div key={d.category || d.tag || i} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.category || d.tag}: <span className="font-mono">{fmtCompact(d.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            {expReport.length > 0 && (
              <Card title="Expense Category Breakdown">
                <DataTable columns={EXPENSE_COLS} data={expReport} searchable={false} />
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
