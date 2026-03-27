import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, StatusBadge, Tabs } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmtDate, profitColor } from '../utils/format';
import { jobsApi, customersApi } from '../api/endpoints';
import { Plus, Briefcase, DollarSign, TrendingUp, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import JobDetailPage from './JobDetailPage'; // ← import the detail page

import { useMobileMenu } from '../hooks/useMobileMenu';

const STATUS_OPTS = ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const normalize = (d) => d?.data || d || [];

const EMPTY = { customerCode: '', jobTitle: '', eventDateStart: '', eventDateEnd: '', setupDate: '', jobStatus: 'planned', quotedPrice: '', jobNotes: '' };

function JobForm({ initial = EMPTY, onSubmit, onClose, loading, customers }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerCode) return toast.error('Customer is required');
    if (!form.jobTitle) return toast.error('Title is required');
    if (!form.eventDateStart) return toast.error('Start date is required');
    onSubmit(form);
  };

  const custOpts = customers.map(c => ({ value: c.customerCode, label: c.fullName }));

  return (
    <form onSubmit={handleSubmit}>
      <FormRow>
        <Select label="Customer" required options={custOpts} value={form.customerCode}
          onChange={e => set('customerCode', e.target.value)} />
        <Input label="Job Title" required value={form.jobTitle}
          onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Annual Gala 2026" />
      </FormRow>
      <FormRow>
        <Input label="Start Date" required type="date" value={form.eventDateStart}
          onChange={e => set('eventDateStart', e.target.value)} />
        <Input label="End Date" type="date" value={form.eventDateEnd || ''}
          onChange={e => set('eventDateEnd', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Setup Date" type="date" value={form.setupDate || ''}
          onChange={e => set('setupDate', e.target.value)} />
        <Select label="Status" options={STATUS_OPTS} value={form.jobStatus}
          onChange={e => set('jobStatus', e.target.value)} />
      </FormRow>
      <Input label="Quoted Price (₦)" type="number" value={form.quotedPrice || ''}
        onChange={e => set('quotedPrice', e.target.value)} placeholder="e.g. 500000" />
      <Textarea label="Notes" value={form.jobNotes || ''} rows={2}
        onChange={e => set('jobNotes', e.target.value)} placeholder="Additional notes…" />
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

export default function JobsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null); // ← track selected job for detail view

  const { setOpen } = useMobileMenu();
  const { data: jobsRaw = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list(),
    select: normalize,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersApi.list(),
    select: normalize,
  });

  const createMut = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => { qc.invalidateQueries(['jobs']); toast.success('Job created'); setModal(null); },
    onError: err => toast.error(err.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => jobsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['jobs']); toast.success('Job updated'); setModal(null); setEditing(null); },
    onError: err => toast.error(err.message),
  });
  const deleteMut = useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['jobs']); toast.success('Job deleted'); setDeleting(null); },
    onError: err => toast.error(err.message),
  });

  // ── If a job is selected, show detail page ────────────────────────────────
  if (selectedJob) {
    return (
      <JobDetailPage
        jobId={selectedJob.id}
        job={selectedJob}
        onBack={() => setSelectedJob(null)}
        onNavigateToEditJob={() => {
          setEditing(selectedJob);
          setModal('edit');
          setSelectedJob(null);
        }}
        onNavigateToAssignEquipment={() => toast('Equipment assignment coming soon')}
        onNavigateToAssignCrew={() => toast('Crew assignment coming soon')}
        onNavigateToAddPurchaseItem={() => toast('Purchase items coming soon')}
        onNavigateToAddExpense={() => toast('Expenses coming soon')}
        onNavigateToManageInvoices={() => toast('Invoices coming soon')}
        onNavigateToManagePayments={() => toast('Payments coming soon')}
        onNavigateToPhotos={() => toast('Photos coming soon')}
      />
    );
  }

  const jobs = jobsRaw;
  const filtered = tab === 'all' ? jobs : jobs.filter(j => j.jobStatus === tab);
  const totalRev = jobs.reduce((s, j) => s + (parseFloat(j.totalRevenue) || 0), 0);
  const totalProfit = jobs.reduce((s, j) => s + (parseFloat(j.jobProfit) || 0), 0);
  const completed = jobs.filter(j => j.jobStatus === 'completed').length;

  const COLS = [
    { label: '#', render: r => <span className="text-muted font-mono text-[10px]">#{r.id}</span> },
    {
      label: 'Job', accessor: 'jobTitle', sortable: true,
      render: r => (
        <div>
          <p className="font-medium text-xs">{r.jobTitle}</p>
          <p className="text-[10px] text-muted">{r.customerCode}</p>
        </div>
      )
    },
    { label: 'Start', accessor: 'eventDateStart', sortable: true, render: r => fmtDate(r.eventDateStart) },
    { label: 'End', accessor: 'eventDateEnd', render: r => fmtDate(r.eventDateEnd) },
    { label: 'Status', accessor: 'jobStatus', sortable: true, render: r => <StatusBadge status={r.jobStatus} /> },
    {
      label: 'Quoted', accessor: 'quotedPrice', sortable: true,
      render: r => r.quotedPrice ? fmtCompact(r.quotedPrice) : '—'
    },
    {
      label: 'Revenue', accessor: 'totalRevenue', sortable: true,
      render: r => <span className="font-mono text-green-400">{r.totalRevenue > 0 ? fmtCompact(r.totalRevenue) : '—'}</span>
    },
    {
      label: 'Expenses', accessor: 'totalExpenses', sortable: true,
      render: r => <span className="font-mono text-rose-400">{r.totalExpenses > 0 ? fmtCompact(r.totalExpenses) : '—'}</span>
    },
    {
      label: 'Profit', accessor: 'jobProfit', sortable: true,
      render: r => r.jobProfit > 0
        ? <span className={`font-mono font-semibold ${profitColor(r.profitMargin)}`}>{fmtCompact(r.jobProfit)}</span>
        : <span className="text-muted">—</span>
    },
    {
      label: 'Margin', accessor: 'profitMargin', sortable: true,
      render: r => r.profitMargin > 0
        ? <span className={`font-mono text-xs ${profitColor(r.profitMargin)}`}>{r.profitMargin}%</span>
        : '—'
    },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); setEditing(r); setModal('edit'); }}
            className="w-6 h-6 rounded flex items-center justify-center bg-white/5 text-muted hover:text-text hover:bg-white/10 cursor-pointer transition-colors">
            <Pencil size={11} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setDeleting(r); }}
            className="w-6 h-6 rounded flex items-center justify-center bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      )
    },
  ];

  return (
    <>
      <Topbar title="Jobs" subtitle="All projects & events" onMenuClick={() => setOpen(true)}
        actions={<button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />New Job</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Jobs" value={jobs.length} accent="sky" icon={Briefcase} />
          <KpiCard label="Total Revenue" value={fmtCompact(totalRev)} accent="lime" icon={DollarSign} />
          <KpiCard label="Net Profit" value={fmtCompact(totalProfit)} accent="green" icon={TrendingUp} />
          <KpiCard label="Completed" value={completed} accent="violet" icon={CheckCircle} />
        </div>
        <Card title="All Jobs">
          <Tabs tabs={[
            { key: 'all', label: `All (${jobs.length})` },
            { key: 'planned', label: 'Planned' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ]} active={tab} onChange={setTab} />
          {isLoading
            ? <div className="py-16 text-center text-muted text-xs">Loading jobs…</div>
            : <DataTable
              columns={COLS}
              data={filtered}
              pageSize={10}
              onRowClick={(row) => setSelectedJob(row)} // ← this is the only new prop
            />
          }
        </Card>
      </div>

      {/* Create */}
      <Modal title="Create New Job" open={modal === 'create'} onClose={() => setModal(null)}>
        <JobForm customers={customers} loading={createMut.isPending}
          onClose={() => setModal(null)}
          onSubmit={data => createMut.mutate(data)} />
      </Modal>

      {/* Edit */}
      <Modal title="Edit Job" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && (
          <JobForm customers={customers} initial={editing} loading={updateMut.isPending}
            onClose={() => { setModal(null); setEditing(null); }}
            onSubmit={data => updateMut.mutate({ id: editing.id, data })} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal title="Delete Job" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">
          Are you sure you want to delete <span className="text-text font-medium">"{deleting?.jobTitle}"</span>?
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleteMut.mutate(deleting.id)} disabled={deleteMut.isPending}
            className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 transition-colors cursor-pointer disabled:opacity-50">
            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </>
  );
}