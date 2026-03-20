import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, StatusBadge, Tabs } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmt, fmtDate } from '../utils/format';
import { expensesApi, jobsApi } from '../api/endpoints';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Receipt, DollarSign, Tag, Trash2, Pencil } from 'lucide-react';

const normalize = d => d?.data || d || [];
const TAG_OPTS = ['crew', 'equipment', 'third_party', 'misc'].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const EMPTY = { jobId: '', purpose: '', tag: 'misc', amount: '', dateMade: '', notes: '' };
const TAG_CLS = { crew: 'bg-orange-400/10 text-orange-400', equipment: 'bg-emerald-400/10 text-emerald-400', third_party: 'bg-violet-400/10 text-violet-400', misc: 'bg-zinc-400/10 text-zinc-400' };

function ExpenseForm({ initial = EMPTY, onSubmit, onClose, loading, jobs }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => { e.preventDefault(); if (!form.amount) return toast.error('Amount required'); onSubmit(form); };
  const jobOpts = [{ value: '', label: 'No specific job (General)' }, ...jobs.map(j => ({ value: j.id, label: `#${j.id} ${j.jobTitle}` }))];
  return (
    <form onSubmit={handle}>
      <Input label="Purpose" value={form.purpose || ''} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Crew transport, Equipment hire…" />
      <FormRow>
        <Select label="Category" options={TAG_OPTS} value={form.tag} onChange={e => set('tag', e.target.value)} />
        <Select label="Related Job (Optional)" options={jobOpts} value={form.jobId || ''} onChange={e => set('jobId', e.target.value ? +e.target.value : null)} />
      </FormRow>
      <FormRow>
        <Input label="Amount (₦)" required type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
        <Input label="Date" type="date" value={form.dateMade || ''} onChange={e => set('dateMade', e.target.value)} />
      </FormRow>
      <Textarea label="Notes" value={form.notes || ''} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E2026] border border-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-muted mb-1">{label}</p>
      <p className="font-mono font-semibold text-rose-400">{fmtCompact(payload[0].value)}</p>
    </div>
  );
};

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list, select: normalize });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs-list'], queryFn: jobsApi.list, select: normalize });

  const createMut = useMutation({ mutationFn: expensesApi.create, onSuccess: () => { qc.invalidateQueries(['expenses', 'jobs']); toast.success('Expense logged'); setModal(null); }, onError: e => toast.error(e.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => expensesApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['expenses', 'jobs']); toast.success('Updated'); setModal(null); }, onError: e => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: expensesApi.delete, onSuccess: () => { qc.invalidateQueries(['expenses', 'jobs']); toast.success('Deleted'); setDeleting(null); }, onError: e => toast.error(e.message) });

  const total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.jobTitle]));
  const filtered = tab === 'all' ? expenses : expenses.filter(e => e.tag === tab);

  const catData = ['crew', 'equipment', 'third_party', 'misc'].map(tag => ({
    category: tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    amount: expenses.filter(e => e.tag === tag).reduce((s, e) => s + parseFloat(e.amount), 0)
  }));

  const COLS = [
    { label: '#', accessor: 'expenseId', sortable: true, render: r => <span className="text-muted font-mono text-[10px]">#{r.expenseId}</span> },
    { label: 'Purpose', accessor: 'purpose', render: r => <span className="text-xs font-medium">{r.purpose || '—'}</span> },
    {
      label: 'Category', accessor: 'tag', sortable: true,
      render: r => <span className={`badge text-[10px] ${TAG_CLS[r.tag] || TAG_CLS.misc}`}>{r.tag?.replace(/_/g, ' ').toUpperCase()}</span>
    },
    {
      label: 'Job', render: r => r.jobId
        ? <span className="text-xs">#{r.jobId} {jobMap[r.jobId]?.slice(0, 20) || ''}</span>
        : <span className="text-muted text-xs">General</span>
    },
    { label: 'Amount', accessor: 'amount', sortable: true, render: r => <span className="font-mono font-semibold text-rose-400">{fmt(r.amount)}</span> },
    { label: 'Date', accessor: 'dateMade', sortable: true, render: r => r.dateMade ? fmtDate(r.dateMade) : '—' },
    { label: 'Notes', accessor: 'notes', render: r => <span className="text-muted text-xs">{r.notes || '—'}</span> },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          <button onClick={() => { setEditing(r); setModal('edit'); }} className="w-6 h-6 rounded bg-white/5 text-muted hover:text-text flex items-center justify-center cursor-pointer"><Pencil size={11} /></button>
          <button onClick={() => setDeleting(r)} className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"><Trash2 size={11} /></button>
        </div>
      )
    },
  ];

  return (
    <>
      <Topbar title="Expenses" subtitle="Operational spending"
        actions={<button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />Log Expense</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Expenses" value={fmtCompact(total)} accent="yellow" icon={Receipt} />
          <KpiCard label="Job Expenses" value={fmtCompact(expenses.filter(e => e.jobId).reduce((s, e) => s + parseFloat(e.amount), 0))} accent="orange" icon={DollarSign} />
          <KpiCard label="General Expenses" value={fmtCompact(expenses.filter(e => !e.jobId).reduce((s, e) => s + parseFloat(e.amount), 0))} accent="coral" icon={Tag} />
          <KpiCard label="Records" value={expenses.length} accent="violet" icon={Receipt} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card className="col-span-2" title="Expenses by Category">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="amount" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Breakdown">
            <div className="space-y-3 mt-2">
              {catData.map(d => {
                const pct = total > 0 ? Math.round((d.amount / total) * 100) : 0;
                return (
                  <div key={d.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">{d.category}</span>
                      <span className="font-mono">{fmtCompact(d.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card title="All Expenses">
          <Tabs tabs={[{ key: 'all', label: `All (${expenses.length})` }, { key: 'crew', label: 'Crew' }, { key: 'equipment', label: 'Equipment' }, { key: 'third_party', label: 'Third Party' }, { key: 'misc', label: 'Misc' }]} active={tab} onChange={setTab} />
          {isLoading ? <div className="py-16 text-center text-muted text-xs">Loading…</div> : <DataTable columns={COLS} data={filtered} pageSize={10} />}
        </Card>
      </div>
      <Modal title="Log Expense" open={modal === 'create'} onClose={() => setModal(null)}>
        <ExpenseForm jobs={jobs} loading={createMut.isPending} onClose={() => setModal(null)} onSubmit={d => createMut.mutate(d)} />
      </Modal>
      <Modal title="Edit Expense" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && <ExpenseForm initial={editing} jobs={jobs} loading={updateMut.isPending} onClose={() => { setModal(null); setEditing(null); }} onSubmit={d => updateMut.mutate({ id: editing.expenseId, data: d })} />}
      </Modal>
      <Modal title="Delete Expense" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">Delete expense of <span className="font-medium text-text">{deleting ? fmt(deleting.amount) : ''}</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleteMut.mutate(deleting.expenseId)} className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 cursor-pointer">Delete</button>
        </div>
      </Modal>
    </>
  );
}
