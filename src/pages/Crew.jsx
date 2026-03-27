import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, StatusBadge, Tabs } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmt, fmtDate } from '../utils/format';
import { crewApi, crewPaymentsApi, jobsApi } from '../api/endpoints';
import { Plus, UserCheck, DollarSign, Briefcase, Award, Pencil, Trash2 } from 'lucide-react';


import { useMobileMenu } from '../hooks/useMobileMenu';
const normalize = d => d?.data || d || [];
const CREW_EMPTY = { name: '', role: '', skills: '', phone: '', email: '', rate: '', notes: '' };
const PAY_EMPTY = { crewId: '', jobId: '', amount: '', method: 'cash', datePaid: '', notes: '' };
const METHOD_OPTS = ['cash', 'bank', 'transfer', 'other'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

function CrewForm({ initial = CREW_EMPTY, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ ...CREW_EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => { e.preventDefault(); if (!form.name) return toast.error('Name required'); onSubmit(form); };
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Input label="Name" required value={form.name} onChange={e => set('name', e.target.value)} />
        <Input label="Role" value={form.role || ''} onChange={e => set('role', e.target.value)} placeholder="e.g. Mixing Engineer" />
      </FormRow>
      <Input label="Skills" value={form.skills || ''} onChange={e => set('skills', e.target.value)} placeholder="e.g. Mixing, Camera, Lighting" />
      <FormRow>
        <Input label="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
        <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
      </FormRow>
      <Input label="Daily Rate (₦)" type="number" value={form.rate || ''} onChange={e => set('rate', e.target.value)} placeholder="e.g. 20000" />
      <Textarea label="Notes" value={form.notes || ''} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

function PaymentForm({ initial = PAY_EMPTY, onSubmit, onClose, loading, crew, jobs }) {
  const [form, setForm] = useState({ ...PAY_EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => { e.preventDefault(); if (!form.crewId || !form.jobId || !form.amount) return toast.error('Crew, job and amount required'); onSubmit(form); };
  const crewOpts = crew.map(c => ({ value: c.id, label: c.name }));
  const jobOpts = jobs.map(j => ({ value: j.id, label: `#${j.id} ${j.jobTitle}` }));
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Select label="Crew Member" required options={crewOpts} value={form.crewId} onChange={e => set('crewId', +e.target.value)} />
        <Select label="Job" required options={jobOpts} value={form.jobId} onChange={e => set('jobId', +e.target.value)} />
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

export default function CrewPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('crew');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: crew = [], isLoading } = useQuery({ queryKey: ['crew'], queryFn: crewApi.list, select: normalize });
  const { data: crewPayments = [] } = useQuery({ queryKey: ['crew-payments'], queryFn: crewPaymentsApi.list, select: normalize });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs-list'], queryFn: jobsApi.list, select: normalize });

  const crewCreate = useMutation({
    mutationFn: crewApi.create,
    onSuccess: () => { qc.invalidateQueries(['crew']); toast.success('Crew member added'); setModal(null); }, onError: e => toast.error(e.message)
  });
  const crewUpdate = useMutation({
    mutationFn: ({ id, data }) => crewApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['crew']); toast.success('Updated'); setModal(null); }, onError: e => toast.error(e.message)
  });
  const crewDelete = useMutation({
    mutationFn: crewApi.delete,
    onSuccess: () => { qc.invalidateQueries(['crew']); toast.success('Deleted'); setDeleting(null); }, onError: e => toast.error(e.message)
  });
  const payCreate = useMutation({
    mutationFn: crewPaymentsApi.create,
    onSuccess: () => { qc.invalidateQueries(['crew-payments']); toast.success('Payment recorded'); setModal(null); }, onError: e => toast.error(e.message)
  });
  const payDelete = useMutation({
    mutationFn: crewPaymentsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['crew-payments']); toast.success('Payment deleted'); setDeleting(null); }, onError: e => toast.error(e.message)
  });

  const totalPaid = crewPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const CREW_COLS = [
    {
      label: 'Member', accessor: 'name', sortable: true,
      render: r => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">{r.name?.slice(0, 2).toUpperCase()}</div>
          <div><p className="font-medium text-xs">{r.name}</p><p className="text-[10px] text-muted">{r.role}</p></div>
        </div>
      )
    },
    {
      label: 'Skills', render: r => (
        <div className="flex flex-wrap gap-1">
          {(r.skills || '').split(',').slice(0, 3).map(s => (
            <span key={s} className="text-[10px] bg-white/5 text-muted px-1.5 py-0.5 rounded">{s.trim()}</span>
          ))}
        </div>
      )
    },
    { label: 'Phone', accessor: 'phone', render: r => r.phone || '—' },
    { label: 'Rate/Day', accessor: 'rate', sortable: true, render: r => <span className="font-mono">{r.rate ? fmt(r.rate) : '—'}</span> },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          <button onClick={() => { setEditing(r); setModal('editCrew'); }} className="w-6 h-6 rounded bg-white/5 text-muted hover:text-text flex items-center justify-center cursor-pointer"><Pencil size={11} /></button>
          <button onClick={() => setDeleting({ type: 'crew', item: r })} className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"><Trash2 size={11} /></button>
        </div>
      )
    },
  ];

  const crewMap = Object.fromEntries(crew.map(c => [c.id, c.name]));
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.jobTitle]));

  const PAY_COLS = [
    { label: 'Crew', render: r => <span className="text-xs">{crewMap[r.crewId] || `#${r.crewId}`}</span> },
    { label: 'Job', render: r => <span className="text-xs">#{r.jobId} {jobMap[r.jobId]?.slice(0, 20) || ''}</span> },
    { label: 'Amount', accessor: 'amount', sortable: true, render: r => <span className="font-mono font-semibold text-green-400">{fmt(r.amount)}</span> },
    { label: 'Method', accessor: 'method', render: r => <StatusBadge status={r.method} /> },
    { label: 'Date', accessor: 'datePaid', sortable: true, render: r => r.datePaid ? fmtDate(r.datePaid) : <span className="text-yellow-400 text-xs">Pending</span> },
    { label: 'Notes', accessor: 'notes', render: r => <span className="text-muted text-xs">{r.notes || '—'}</span> },
    {
      label: '', render: r => (
        <button onClick={() => setDeleting({ type: 'payment', item: r })} className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"><Trash2 size={11} /></button>
      )
    },
  ];


  const { setOpen } = useMobileMenu();
  return (
    <>
      <Topbar title="Crew" subtitle="Team management & payments" onMenuClick={() => setOpen(true)}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setModal('addPayment')} className="btn-ghost flex items-center gap-1.5 text-xs"><Plus size={12} />Record Payment</button>
            <button onClick={() => setModal('addCrew')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />Add Crew</button>
          </div>
        } />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Crew" value={crew.length} accent="orange" icon={UserCheck} />
          <KpiCard label="Total Paid" value={fmtCompact(totalPaid)} accent="green" icon={DollarSign} />
          <KpiCard label="Crew Payments" value={crewPayments.length} accent="yellow" icon={Briefcase} />
          <KpiCard label="Pending Pay" value={crewPayments.filter(p => !p.datePaid).length} accent="coral" icon={Award} />
        </div>

        <Tabs tabs={[{ key: 'crew', label: `Members (${crew.length})` }, { key: 'payments', label: `Payments (${crewPayments.length})` }]} active={tab} onChange={setTab} />

        {tab === 'crew' && (
          <Card title="Crew Members">
            {isLoading ? <div className="py-16 text-center text-muted text-xs">Loading…</div> : <DataTable columns={CREW_COLS} data={crew} pageSize={10} />}
          </Card>
        )}
        {tab === 'payments' && (
          <Card title="Crew Payments">
            <DataTable columns={PAY_COLS} data={crewPayments} pageSize={10} />
          </Card>
        )}
      </div>

      <Modal title="Add Crew Member" open={modal === 'addCrew'} onClose={() => setModal(null)}>
        <CrewForm loading={crewCreate.isPending} onClose={() => setModal(null)} onSubmit={d => crewCreate.mutate(d)} />
      </Modal>
      <Modal title="Edit Crew Member" open={modal === 'editCrew'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && <CrewForm initial={editing} loading={crewUpdate.isPending} onClose={() => { setModal(null); setEditing(null); }} onSubmit={d => crewUpdate.mutate({ id: editing.id, data: d })} />}
      </Modal>
      <Modal title="Record Crew Payment" open={modal === 'addPayment'} onClose={() => setModal(null)}>
        <PaymentForm crew={crew} jobs={jobs} loading={payCreate.isPending} onClose={() => setModal(null)} onSubmit={d => payCreate.mutate(d)} />
      </Modal>
      <Modal title="Confirm Delete" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">Delete <span className="font-medium text-text">"{deleting?.item?.name || `payment #${deleting?.item?.crewPaymentId}`}"</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleting.type === 'crew' ? crewDelete.mutate(deleting.item.id) : payDelete.mutate(deleting.item.crewPaymentId)}
            className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 cursor-pointer">Delete</button>
        </div>
      </Modal>
    </>
  );
}
