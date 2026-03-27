import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, Tabs } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmt, fmtDate } from '../utils/format';
import { remindersApi, jobsApi } from '../api/endpoints';
import { Plus, Bell, AlertCircle, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';

import { useMobileMenu } from '../hooks/useMobileMenu';
const normalize = d => d?.data || d || [];
const TYPE_OPTS = ['client_payment', 'crew_payment', 'third_party_payment', 'prospective_job', 'other'].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const TAG_OPTS = ['partial_payment', 'overdue', 'follow_up', 'prospective_job', 'other'].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const EMPTY = { jobId: '', reminderForType: 'client_payment', reminderForId: '', reminderMessage: '', tag: 'other', dueAmount: '', nextNotifyAt: '', notifyIntervalDays: 3 };

const TYPE_CLS = { client_payment: 'bg-green-400/10 text-green-400', crew_payment: 'bg-orange-400/10 text-orange-400', third_party_payment: 'bg-violet-400/10 text-violet-400', prospective_job: 'bg-sky-400/10 text-sky-400', other: 'bg-zinc-400/10 text-zinc-400' };
const TAG_CLS = { partial_payment: 'bg-yellow-400/10 text-yellow-400', overdue: 'bg-red-400/10 text-red-400', follow_up: 'bg-sky-400/10 text-sky-400', other: 'bg-zinc-400/10 text-zinc-400' };

function ReminderForm({ initial = EMPTY, onSubmit, onClose, loading, jobs }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => { e.preventDefault(); if (!form.reminderMessage) return toast.error('Message required'); onSubmit(form); };
  const jobOpts = [{ value: '', label: 'No specific job' }, ...jobs.map(j => ({ value: j.id, label: `#${j.id} ${j.jobTitle}` }))];
  return (
    <form onSubmit={handle}>
      <Textarea label="Reminder Message" required value={form.reminderMessage} rows={2} onChange={e => set('reminderMessage', e.target.value)} placeholder="e.g. Outstanding balance: ₦50,000" />
      <FormRow>
        <Select label="Type" options={TYPE_OPTS} value={form.reminderForType} onChange={e => set('reminderForType', e.target.value)} />
        <Select label="Tag" options={TAG_OPTS} value={form.tag} onChange={e => set('tag', e.target.value)} />
      </FormRow>
      <FormRow>
        <Select label="Related Job" options={jobOpts} value={form.jobId || ''} onChange={e => set('jobId', e.target.value ? +e.target.value : null)} />
        <Input label="Notify At" type="datetime-local" value={form.nextNotifyAt || ''} onChange={e => set('nextNotifyAt', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Due Amount (₦)" type="number" value={form.dueAmount || ''} onChange={e => set('dueAmount', e.target.value)} placeholder="Optional" />
        <Input label="Interval (days)" type="number" value={form.notifyIntervalDays} onChange={e => set('notifyIntervalDays', +e.target.value)} min={1} />
      </FormRow>
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

export default function RemindersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('active');
  const [modal, setModal] = useState(null);

  const { data: reminders = [], isLoading } = useQuery({ queryKey: ['reminders'], queryFn: remindersApi.list, select: normalize });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs-list'], queryFn: jobsApi.list, select: normalize });

  const createMut = useMutation({ mutationFn: remindersApi.create, onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Reminder added'); setModal(null); }, onError: e => toast.error(e.message) });
  const dismissMut = useMutation({ mutationFn: remindersApi.dismiss, onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Dismissed'); }, onError: e => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: remindersApi.delete, onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Deleted'); }, onError: e => toast.error(e.message) });

  const active = reminders.filter(r => r.active);
  const dismissed = reminders.filter(r => !r.active);
  const withAmt = active.filter(r => r.dueAmount);
  const totalDue = withAmt.reduce((s, r) => s + (parseFloat(r.dueAmount) || 0), 0);
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.jobTitle]));

  const displayed = tab === 'active' ? active : tab === 'dismissed' ? dismissed : reminders;

  const COLS = [
    {
      label: 'Message', accessor: 'reminderMessage',
      render: r => (
        <div className="max-w-[250px]">
          <p className="text-xs font-medium truncate">{r.reminderMessage}</p>
          {r.jobId && <p className="text-[10px] text-muted mt-0.5">#{r.jobId} {jobMap[r.jobId]?.slice(0, 25) || ''}</p>}
        </div>
      )
    },
    {
      label: 'Type', accessor: 'reminderForType',
      render: r => <span className={`badge text-[10px] ${TYPE_CLS[r.reminderForType] || TYPE_CLS.other}`}>{r.reminderForType?.replace(/_/g, ' ')}</span>
    },
    {
      label: 'Tag', accessor: 'tag',
      render: r => <span className={`badge text-[10px] ${TAG_CLS[r.tag] || TAG_CLS.other}`}>{r.tag?.replace(/_/g, ' ')}</span>
    },
    {
      label: 'Due Amount', accessor: 'dueAmount', sortable: true,
      render: r => r.dueAmount ? <span className="font-mono text-rose-400">{fmt(r.dueAmount)}</span> : '—'
    },
    {
      label: 'Next Notify', accessor: 'nextNotifyAt',
      render: r => r.nextNotifyAt ? <span className="text-xs flex items-center gap-1"><Clock size={10} className="text-muted" />{fmtDate(r.nextNotifyAt)}</span> : '—'
    },
    {
      label: 'Status', accessor: 'active',
      render: r => r.active
        ? <span className="badge text-[10px] bg-green-400/10 text-green-400">Active</span>
        : <span className="badge text-[10px] bg-zinc-400/10 text-zinc-400">Dismissed</span>
    },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          {r.active && (
            <button onClick={() => dismissMut.mutate(r.reminderId)} title="Dismiss"
              className="w-6 h-6 rounded bg-green-400/10 text-green-400 hover:bg-green-400/20 flex items-center justify-center cursor-pointer">
              <CheckCircle size={11} />
            </button>
          )}
          <button onClick={() => deleteMut.mutate(r.reminderId)} title="Delete"
            className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer">
            <Trash2 size={11} />
          </button>
        </div>
      )
    },
  ];


  const { setOpen } = useMobileMenu();
  return (
    <>
      <Topbar title="Reminders" subtitle="Payment & follow-up alerts" onMenuClick={() => setOpen(true)}
        actions={<button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />Add Reminder</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total" value={reminders.length} accent="coral" icon={Bell} />
          <KpiCard label="Active" value={active.length} accent="yellow" icon={AlertCircle} />
          <KpiCard label="Dismissed" value={dismissed.length} accent="violet" icon={CheckCircle} />
          <KpiCard label="Total Due" value={`₦${Math.round(totalDue / 1000)}k`} accent="rose" icon={AlertCircle} />
        </div>

        {/* Active reminder cards */}
        {tab === 'active' && active.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {active.map(r => (
              <div key={r.reminderId} className="card p-4 border-l-2 hover:bg-white/[0.02] transition-colors"
                style={{ borderLeftColor: r.tag === 'partial_payment' ? '#facc15' : r.tag === 'overdue' ? '#fb7185' : '#38bdf8' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`badge text-[9px] ${TYPE_CLS[r.reminderForType] || TYPE_CLS.other}`}>{r.reminderForType?.replace(/_/g, ' ')}</span>
                  <span className={`badge text-[9px] ${TAG_CLS[r.tag] || TAG_CLS.other}`}>{r.tag?.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs font-medium leading-snug mb-2">{r.reminderMessage}</p>
                {r.dueAmount && <p className="text-sm font-mono font-bold text-rose-400 mb-2">{fmt(r.dueAmount)}</p>}
                {r.jobId && <p className="text-[10px] text-muted mb-2">#{r.jobId} {jobMap[r.jobId]?.slice(0, 28) || ''}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted flex items-center gap-1"><Clock size={9} />Due {fmtDate(r.nextNotifyAt)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => dismissMut.mutate(r.reminderId)} className="w-5 h-5 rounded bg-green-400/10 text-green-400 hover:bg-green-400/20 flex items-center justify-center cursor-pointer"><CheckCircle size={10} /></button>
                    <button onClick={() => deleteMut.mutate(r.reminderId)} className="w-5 h-5 rounded bg-zinc-400/10 text-zinc-400 hover:bg-zinc-400/20 flex items-center justify-center cursor-pointer"><XCircle size={10} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Card title="All Reminders">
          <Tabs tabs={[{ key: 'active', label: `Active (${active.length})` }, { key: 'dismissed', label: `Dismissed (${dismissed.length})` }, { key: 'all', label: `All (${reminders.length})` }]} active={tab} onChange={setTab} />
          {isLoading ? <div className="py-16 text-center text-muted text-xs">Loading…</div> : <DataTable columns={COLS} data={displayed} pageSize={10} />}
        </Card>
      </div>
      <Modal title="Add Reminder" open={modal === 'create'} onClose={() => setModal(null)}>
        <ReminderForm jobs={jobs} loading={createMut.isPending} onClose={() => setModal(null)} onSubmit={d => createMut.mutate(d)} />
      </Modal>
    </>
  );
}
