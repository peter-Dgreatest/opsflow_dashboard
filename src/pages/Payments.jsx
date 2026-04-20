import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, StatusBadge } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmt, fmtDate } from '../utils/format';
import { paymentsApi, jobsApi, customersApi } from '../api/endpoints';
import { Plus, CreditCard, DollarSign, TrendingUp, Trash2, Pencil } from 'lucide-react';

import { useMobileMenu } from '../hooks/useMobileMenu';
const normalize = d => d?.data || d || [];
const METHOD_OPTS = ['cash', 'bank', 'transfer', 'pos', 'other'].map(v => ({ value: v, label: v.toUpperCase() }));
const EMPTY = { jobId: '', customerCode: '', amount: '', method: 'cash', datePaid: '', notes: '' };

const METHOD_CLS = { cash: 'bg-green-400/10 text-green-400', bank: 'bg-sky-400/10 text-sky-400', transfer: 'bg-violet-400/10 text-violet-400', pos: 'bg-orange-400/10 text-orange-400', other: 'bg-zinc-400/10 text-zinc-400' };

function PaymentForm({ initial = EMPTY, onSubmit, onClose, loading, jobs, customers }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // auto-fill customerCode when job selected
  const onJobChange = (jobId) => {
    const job = jobs.find(j => j.id === +jobId);
    setForm(f => ({ ...f, jobId: +jobId, customerCode: job?.customerCode || f.customerCode }));
  };
  const handle = (e) => { e.preventDefault(); if (!form.jobId || !form.amount) return toast.error('Job and amount required'); onSubmit(form); };
  const jobOpts = jobs.map(j => ({ value: j.id, label: `#${j.id} ${j.jobTitle}` }));
  const custOpts = customers.map(c => ({ value: c.customerCode, label: c.fullName }));
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Select label="Job" required options={jobOpts} value={form.jobId} onChange={e => onJobChange(e.target.value)} />
        <Select label="Customer" required options={custOpts} value={form.customerCode} onChange={e => set('customerCode', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Amount (₦)" required type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
        <Select label="Method" options={METHOD_OPTS} value={form.method} onChange={e => set('method', e.target.value)} />
      </FormRow>
      <Input label="Date Paid" type="date" value={form.datePaid || ''} onChange={e => set('datePaid', e.target.value)} />
      <Textarea label="Notes" value={form.notes || ''} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} submitLabel="Record Payment" />
    </form>
  );
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: paymentsApi.list, select: normalize });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs-list'], queryFn: jobsApi.list, select: normalize });
  const { data: customers = [] } = useQuery({ queryKey: ['customers-list'], queryFn: customersApi.list, select: normalize });

  const createMut = useMutation({ mutationFn: paymentsApi.create, onSuccess: () => { qc.invalidateQueries(['payments', 'jobs']); toast.success('Payment recorded'); setModal(null); }, onError: e => toast.error(e.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => paymentsApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['payments', 'jobs']); toast.success('Updated'); setModal(null); }, onError: e => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: paymentsApi.delete, onSuccess: () => { qc.invalidateQueries(['payments', 'jobs']); toast.success('Deleted'); setDeleting(null); }, onError: e => toast.error(e.message) });

  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const custMap = Object.fromEntries(customers.map(c => [c.customerCode, c.fullName]));
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.jobTitle]));

  const COLS = [
    { label: '#', accessor: 'paymentId', sortable: true, render: r => <span className="text-muted font-mono text-[10px]">#{r.paymentId}</span> },
    {
      label: 'Customer', render: r => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-green-400/10 flex items-center justify-center text-green-400 text-[9px] font-bold shrink-0">
            {(custMap[r.customerCode] || '??').slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs">{custMap[r.customerCode] || r.customerCode}</span>
        </div>
      )
    },
    {
      label: 'Job', render: r => (
        <div>
          <p className="text-xs">#{r.jobId}</p>
          <p className="text-[10px] text-muted truncate max-w-[120px]">{jobMap[r.jobId] || ''}</p>
        </div>
      )
    },
    { label: 'Amount', accessor: 'amount', sortable: true, render: r => <span className="font-mono font-semibold text-green-400">{fmt(r.amount)}</span> },
    {
      label: 'Method', accessor: 'method', sortable: true,
      render: r => <span className={`badge text-[10px] ${METHOD_CLS[r.method] || METHOD_CLS.other}`}>{r.method?.toUpperCase()}</span>
    },
    {
      label: 'Date Paid', accessor: 'datePaid', sortable: true,
      render: r => r.datePaid ? fmtDate(r.datePaid) : <span className="text-yellow-400 text-xs">Pending</span>
    },
    { label: 'Notes', accessor: 'notes', render: r => <span className="text-muted text-xs truncate max-w-[100px] block">{r.notes || '—'}</span> },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          <button onClick={() => { setEditing(r); setModal('edit'); }} className="w-6 h-6 rounded bg-white/5 text-muted hover:text-text flex items-center justify-center cursor-pointer"><Pencil size={11} /></button>
          <button onClick={() => setDeleting(r)} className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"><Trash2 size={11} /></button>
        </div>
      )
    },
  ];


  const { setOpen } = useMobileMenu();

  return (
    <>
      <Topbar title="Payments" subtitle="Customer payment records" onMenuClick={() => setOpen(true)}
        actions={<button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />Record Payment</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Received" value={fmtCompact(total)} accent="green" icon={DollarSign} />
          <KpiCard label="Transactions" value={payments.length} accent="lime" icon={CreditCard} />
          <KpiCard label="Cash" value={fmtCompact(payments.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount), 0))} accent="yellow" icon={TrendingUp} />
          <KpiCard label="Bank/Transfer" value={fmtCompact(payments.filter(p => ['bank', 'transfer'].includes(p.method)).reduce((s, p) => s + parseFloat(p.amount), 0))} accent="sky" icon={CreditCard} />
        </div>
        {/* Method breakdown */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-5">
          {['cash', 'bank', 'transfer', 'pos', 'other'].map(m => {
            const t = payments.filter(p => p.method === m).reduce((s, p) => s + parseFloat(p.amount), 0);
            const c = payments.filter(p => p.method === m).length;
            return (
              <div key={m} className="card p-3">
                <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-1">{m}</p>
                <p className="text-sm font-mono font-semibold text-green-400">{fmtCompact(t)}</p>
                <p className="text-[10px] text-muted mt-0.5">{c} txn{c !== 1 ? 's' : ''}</p>
              </div>
            );
          })}
        </div>
        <Card title="All Payments">
          {isLoading ? <div className="py-16 text-center text-muted text-xs">Loading…</div> : <DataTable columns={COLS} data={payments} pageSize={12} />}
        </Card>
      </div>
      <Modal title="Record Payment" open={modal === 'create'} onClose={() => setModal(null)}>
        <PaymentForm jobs={jobs} customers={customers} loading={createMut.isPending} onClose={() => setModal(null)} onSubmit={d => createMut.mutate(d)} />
      </Modal>
      <Modal title="Edit Payment" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && <PaymentForm initial={editing} jobs={jobs} customers={customers} loading={updateMut.isPending} onClose={() => { setModal(null); setEditing(null); }} onSubmit={d => updateMut.mutate({ id: editing.paymentId, data: d })} />}
      </Modal>
      <Modal title="Delete Payment" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">Delete payment of <span className="font-medium text-text">{deleting ? fmt(deleting.amount) : ''}</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleteMut.mutate(deleting.paymentId)} className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 cursor-pointer">Delete</button>
        </div>
      </Modal>
    </>
  );
}
