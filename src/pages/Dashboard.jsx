import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { KpiCard, Card, StatusBadge } from '../components/ui';
import { Topbar } from '../components/layout';
import { fmt, fmtCompact, fmtDateShort } from '../utils/format';
import { dashboardApi, reportsApi, jobsApi, paymentsApi, remindersApi } from '../api/endpoints';
import { useState } from 'react';
import { DollarSign, Briefcase, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const CHART_COLORS = { revenue:'#a3e635', profit:'#34d399', expenses:'#fb7185' };
const PIE_COLORS   = ['#34d399','#38bdf8','#a78bfa','#fb923c','#fb7185'];

const ChartTip = ({ active, payload, label }) => {
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

const normalize = (d) => d?.data || d || [];

export default function DashboardPage() {
  const [chartKey, setChartKey] = useState('revenue');

  const { data: summary = {} } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
    staleTime: 60_000,
  });

  const { data: monthly = [] } = useQuery({
    queryKey: ['monthly-report'],
    queryFn: () => reportsApi.monthly(),
    staleTime: 60_000,
    select: d => normalize(d).slice(-7),
  });

  const { data: upcomingJobs = [] } = useQuery({
    queryKey: ['jobs-upcoming'],
    queryFn: () => jobsApi.list({ status: 'planned,confirmed,in_progress', limit: 6 }),
    select: normalize,
  });

  const { data: recentPayments = [] } = useQuery({
    queryKey: ['payments-recent'],
    queryFn: () => paymentsApi.list({ limit: 6, sort: 'datePaid:desc' }),
    select: normalize,
  });

  const { data: activeReminders = [] } = useQuery({
    queryKey: ['reminders-active'],
    queryFn: () => remindersApi.list({ active: 1, limit: 5 }),
    select: normalize,
  });

  const kpi = summary?.kpi || summary || {};
  const statusCounts = kpi.jobsByStatus || [];

  return (
    <>
      <Topbar title="Dashboard" subtitle="Business overview" />
      <div className="flex-1 overflow-y-auto p-5">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard label="Total Revenue"   value={fmtCompact(kpi.totalRevenue  || 0)} change={kpi.revenueChange}    accent="lime"    icon={DollarSign} />
          <KpiCard label="Net Profit"      value={fmtCompact(kpi.totalProfit   || 0)} change={kpi.profitChange}     accent="green"   icon={TrendingUp} />
          <KpiCard label="Outstanding"     value={fmtCompact(kpi.outstanding   || 0)} change={kpi.outstandingChange} accent="coral"  icon={AlertCircle} />
          <KpiCard label="Jobs This Month" value={kpi.jobsThisMonth || 0}             change={kpi.jobsChange}       accent="sky"     icon={Briefcase} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Avg Margin"      value={`${(kpi.avgMargin || 0).toFixed(1)}%`} accent="violet" />
          <KpiCard label="Total Jobs"      value={kpi.totalJobs || 0}                    accent="orange" />
          <KpiCard label="Reminders"       value={kpi.activeReminders || activeReminders.length} accent="yellow" />
          <KpiCard label="Customers"       value={kpi.totalCustomers || 0}               accent="emerald" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="col-span-2" title="Financial Performance"
            actions={
              <div className="flex gap-1 bg-input rounded-lg p-1">
                {['revenue','profit','expenses'].map(k => (
                  <button key={k} onClick={() => setChartKey(k)}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-md capitalize cursor-pointer transition-all ${chartKey===k ? 'bg-card text-text' : 'text-muted hover:text-text'}`}>{k}</button>
                ))}
              </div>
            }>
            {monthly.length === 0
              ? <div className="h-[220px] flex items-center justify-center text-muted text-xs">No report data yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthly} margin={{ top:5, right:5, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CHART_COLORS[chartKey]} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={CHART_COLORS[chartKey]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill:'#6b7280', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v=>fmtCompact(v)} tick={{ fill:'#6b7280', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey={chartKey} stroke={CHART_COLORS[chartKey]} strokeWidth={2}
                      fill="url(#ag)" dot={false} activeDot={{ r:4 }} />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </Card>

          <Card title="Jobs by Status">
            {statusCounts.length === 0
              ? <div className="h-[200px] flex items-center justify-center text-muted text-xs">No data</div>
              : <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                        dataKey="value" paddingAngle={3}>
                        {statusCounts.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {statusCounts.map((d,i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted">{d.name}</span>
                        </div>
                        <span className="font-mono">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card title="Upcoming Jobs">
            {upcomingJobs.length === 0
              ? <p className="text-xs text-muted py-8 text-center">No upcoming jobs</p>
              : <div className="space-y-2">
                  {upcomingJobs.map(j => (
                    <div key={j.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-sky-400/10 flex items-center justify-center text-sky-400 shrink-0">
                        <Briefcase size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{j.jobTitle}</p>
                        <p className="text-[10px] text-muted">{fmtDateShort(j.eventDateStart)}</p>
                      </div>
                      <StatusBadge status={j.jobStatus} />
                    </div>
                  ))}
                </div>
            }
          </Card>

          <Card title="Recent Payments">
            {recentPayments.length === 0
              ? <p className="text-xs text-muted py-8 text-center">No payments yet</p>
              : <div className="space-y-2">
                  {recentPayments.map(p => (
                    <div key={p.paymentId} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
                          <DollarSign size={12} className="text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Job #{p.jobId}</p>
                          <p className="text-[10px] text-muted capitalize">{p.method} · {fmtDateShort(p.datePaid)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold text-green-400">+{fmtCompact(p.amount)}</span>
                    </div>
                  ))}
                </div>
            }
          </Card>

          <Card title="Active Reminders">
            {activeReminders.length === 0
              ? <p className="text-xs text-muted py-8 text-center">All clear ✓</p>
              : <div className="space-y-2">
                  {activeReminders.map(r => (
                    <div key={r.reminderId} className="p-2.5 rounded-lg bg-white/[0.02] border border-border/50">
                      <p className="text-xs font-medium leading-tight line-clamp-2">{r.reminderMessage}</p>
                      {r.dueAmount && <p className="text-[10px] text-rose-400 font-mono mt-1">{fmt(r.dueAmount)}</p>}
                      <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
                        <Clock size={9} />Due {fmtDateShort(r.nextNotifyAt)}
                      </p>
                    </div>
                  ))}
                </div>
            }
          </Card>
        </div>
      </div>
    </>
  );
}
