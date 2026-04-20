import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, Tabs } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmtDate } from '../utils/format';
import { leadsApi, customersApi } from '../api/endpoints';
import { Plus, TrendingUp, DollarSign, CheckCircle, Clock, Pencil, Trash2 } from 'lucide-react';

import { useMobileMenu } from '../hooks/useMobileMenu';
const normalize = d => d?.data || d || [];

const STATUS_OPTS = ['open', 'follow_up', 'client_ghosted', 'budget_too_high', 'client_not_serious', 'unreachable', 'declined', 'converted', 'closed']
  .map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

const STATUS_CLS = {
  open: 'bg-sky-400/10 text-sky-400',
  follow_up: 'bg-amber-400/10 text-amber-400',
  converted: 'bg-green-400/10 text-green-400',
  closed: 'bg-zinc-400/10 text-zinc-400',
  client_ghosted: 'bg-red-400/10 text-red-400',
  budget_too_high: 'bg-orange-400/10 text-orange-400',
  client_not_serious: 'bg-zinc-400/10 text-zinc-400',
  unreachable: 'bg-red-400/10 text-red-400',
  declined: 'bg-zinc-400/10 text-zinc-400',
};

const LEAD_EMPTY = {
  prospectiveClientName: '', prospectiveClientPhone: '',
  prospectiveClientEmail: '', eventDateText: '',
  eventDateStart: '', estimatedCost: '',
  status: 'open', info: '', notes: '',
};

// ── Add / Edit lead form ──────────────────────────────────────────────────────
function LeadForm({ initial = LEAD_EMPTY, onSubmit, onClose, loading, customers = [] }) {
  const [form, setForm] = useState({ ...LEAD_EMPTY, ...initial });
  const [useExisting, setUseExisting] = useState(!!initial.customerCode);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const custOpts = customers.map(c => ({ value: c.customerCode, label: c.fullName }));

  const handle = (e) => {
    e.preventDefault();
    const name = form.prospectiveClientName || form.customerCode;
    if (!name) return toast.error('Client name or customer required');
    onSubmit(form);
  };

  return (
    <form onSubmit={handle}>
      {/* Toggle: existing customer vs new prospect */}
      <div className="flex gap-2 mb-4">
        <button type="button"
          onClick={() => { setUseExisting(false); set('customerCode', ''); }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${!useExisting ? 'bg-sky-400/10 border-sky-400/40 text-sky-400' : 'border-border/40 text-muted hover:text-text'}`}>
          New prospect
        </button>
        <button type="button"
          onClick={() => { setUseExisting(true); set('prospectiveClientName', ''); set('prospectiveClientPhone', ''); set('prospectiveClientEmail', ''); }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${useExisting ? 'bg-sky-400/10 border-sky-400/40 text-sky-400' : 'border-border/40 text-muted hover:text-text'}`}>
          Existing customer
        </button>
      </div>

      {useExisting ? (
        <Select label="Customer" required options={custOpts} value={form.customerCode}
          onChange={e => set('customerCode', e.target.value)} />
      ) : (
        <FormRow>
          <Input label="Client Name" required
            value={form.prospectiveClientName}
            onChange={e => set('prospectiveClientName', e.target.value)} />
          <Input label="Phone"
            value={form.prospectiveClientPhone || ''}
            onChange={e => set('prospectiveClientPhone', e.target.value)} />
        </FormRow>
      )}

      {!useExisting && (
        <Input label="Email" type="email"
          value={form.prospectiveClientEmail || ''}
          onChange={e => set('prospectiveClientEmail', e.target.value)} />
      )}

      <FormRow>
        <Input label="Event Date Text"
          value={form.eventDateText || ''}
          onChange={e => set('eventDateText', e.target.value)}
          placeholder="e.g. April 2026" />
        <Input label="Event Start Date" type="date"
          value={form.eventDateStart || ''}
          onChange={e => set('eventDateStart', e.target.value)} />
      </FormRow>

      <Input label="Estimated Cost (₦)" type="number"
        value={form.estimatedCost || ''}
        onChange={e => set('estimatedCost', e.target.value)} />

      <Select label="Status" options={STATUS_OPTS} value={form.status}
        onChange={e => set('status', e.target.value)} />

      <Textarea label="Event Info" value={form.info || ''} rows={2}
        onChange={e => set('info', e.target.value)}
        placeholder="What equipment/services they need…" />
      <Textarea label="Notes" value={form.notes || ''} rows={2}
        onChange={e => set('notes', e.target.value)} />

      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

// ── Convert lead → full job form (mirrors Android TentativeToJobScreen) ───────
function ConvertLeadForm({ lead, customers, onSubmit, onClose, loading }) {
  const clientName = lead.prospectiveClientName || lead.customer?.fullName || '';

  const [form, setForm] = useState({
    customerCode: lead.customerCode || '',
    jobTitle: '',
    eventDateStart: lead.eventDateStart || '',
    eventDateEnd: '',
    setupDate: '',
    quotedPrice: lead.estimatedCost || '',
    notes: lead.notes || '',
    createJob: true,   // if false, just create the customer and link to lead without creating a job (for cases where lead is not actually ready for a job yet)
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = (e) => {
    e.preventDefault();
    if (!form.customerCode) return toast.error('Customer is required');
    if (!form.eventDateStart) return toast.error('Start date is required');
    onSubmit({ createJob: form });
  };

  const custOpts = customers.map(c => ({ value: c.customerCode, label: c.fullName }));

  return (
    <form onSubmit={handle}>
      {/* Show lead context at the top */}
      <div className="p-3 rounded-lg bg-white/[0.03] border border-border/50 mb-4">
        <p className="text-xs font-semibold text-lime-400 mb-0.5">Converting lead</p>
        <p className="text-sm font-medium">{clientName}</p>
        {lead.estimatedCost && (
          <p className="text-xs text-muted mt-0.5">
            Estimated: <span className="text-lime-400 font-mono">{fmtCompact(parseFloat(lead.estimatedCost))}</span>
          </p>
        )}
      </div>

      <Select label="Customer" required options={custOpts} value={form.customerCode}
        onChange={e => set('customerCode', e.target.value)} />

      <Input label="Job Title"
        value={form.jobTitle}
        onChange={e => set('jobTitle', e.target.value)}
        placeholder={`e.g. ${clientName} Event`} />

      <FormRow>
        <Input label="Start Date" required type="date"
          value={form.eventDateStart}
          onChange={e => set('eventDateStart', e.target.value)} />
        <Input label="End Date" type="date"
          value={form.eventDateEnd}
          onChange={e => set('eventDateEnd', e.target.value)} />
      </FormRow>

      <FormRow>
        <Input label="Setup Date" type="date"
          value={form.setupDate}
          onChange={e => set('setupDate', e.target.value)} />
        <Input label="Quoted Price (₦)" type="number"
          value={form.quotedPrice}
          onChange={e => set('quotedPrice', e.target.value)} />
      </FormRow>

      <Textarea label="Notes" value={form.notes} rows={2}
        onChange={e => set('notes', e.target.value)} />

      <FormActions onClose={onClose} loading={loading} submitLabel="Convert & Create Job" />
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [converting, setConverting] = useState(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.list(),
    select: normalize,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersApi.list(),
    select: normalize,
  });

  const createMut = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Lead added'); setModal(null); },
    onError: e => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => leadsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Updated'); setModal(null); },
    onError: e => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Deleted'); setDeleting(null); },
    onError: e => toast.error(e.message),
  });

  // Convert sends full job details — backend creates customer + job together
  const convertMut = useMutation({
    mutationFn: ({ id, data }) => leadsApi.convert(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['leads', 'customers', 'jobs']);
      toast.success('Lead converted — customer & job created!');
      setConverting(null);
    },
    onError: e => toast.error(e.message),
  });

  // Derived counts
  const open = leads.filter(l => l.status === 'open');
  const followUp = leads.filter(l => l.status === 'follow_up');
  const converted = leads.filter(l => l.status === 'converted' || l.convertedToJob);
  const closed = leads.filter(l => ['closed', 'client_ghosted', 'budget_too_high', 'declined'].includes(l.status));
  const totalVal = leads.reduce((s, l) => s + (parseFloat(l.estimatedCost) || 0), 0);

  const tabMap = { all: leads, open, follow_up: followUp, converted, closed };

  const COLS = [
    {
      label: 'Client', accessor: 'prospectiveClientName', sortable: true,
      render: r => {
        const name = r.prospectiveClientName || r.customer?.fullName || '—';
        const email = r.prospectiveClientEmail || r.customer?.email || null;
        const initials = name.slice(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-400/10 flex items-center justify-center text-sky-400 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-medium text-xs">{name}</p>
              {email && <p className="text-[10px] text-muted">{email}</p>}
            </div>
          </div>
        );
      },
    },
    {
      label: 'Phone', render: r =>
        r.prospectiveClientPhone || r.customer?.phone || '—',
    },
    {
      label: 'Event Date', accessor: 'eventDateText',
      render: r => r.eventDateText || fmtDate(r.eventDateStart) || '—',
    },
    {
      label: 'Est. Value', accessor: 'estimatedCost', sortable: true,
      render: r => r.estimatedCost
        ? <span className="font-mono text-lime-400">{fmtCompact(parseFloat(r.estimatedCost))}</span>
        : '—',
    },
    {
      label: 'Status', accessor: 'status', sortable: true,
      render: r => (
        <span className={`badge text-[10px] ${STATUS_CLS[r.status] || 'bg-zinc-400/10 text-zinc-400'}`}>
          {r.status?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      label: 'Last Contact',
      render: r => r.lastContactedAt
        ? fmtDate(r.lastContactedAt)
        : <span className="text-muted text-xs">Never</span>,
    },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          {!r.convertedToJob && r.status !== 'converted' && (
            <button
              onClick={() => setConverting(r)}
              className="text-[10px] px-2 py-1 rounded bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 cursor-pointer whitespace-nowrap">
              Convert
            </button>
          )}
          <button
            onClick={() => { setEditing(r); setModal('edit'); }}
            className="w-6 h-6 rounded bg-white/5 text-muted hover:text-text flex items-center justify-center cursor-pointer">
            <Pencil size={11} />
          </button>
          <button
            onClick={() => setDeleting(r)}
            className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer">
            <Trash2 size={11} />
          </button>
        </div>
      ),
    },
  ];

  const { setOpen } = useMobileMenu();
  return (
    <>
      <Topbar title="Leads" subtitle="Prospective clients & tentative jobs" onMenuClick={() => setOpen(true)}
        actions={
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5">
            <Plus size={13} />Add Lead
          </button>
        } />

      <div className="flex-1 overflow-y-auto p-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Leads" value={leads.length} accent="sky" icon={TrendingUp} />
          <KpiCard label="Open" value={open.length} accent="sky" icon={Clock} />
          <KpiCard label="Converted" value={converted.length} accent="green" icon={CheckCircle} />
          <KpiCard label="Pipeline Value" value={fmtCompact(totalVal)} accent="lime" icon={DollarSign} />
        </div>

        {/* Stage funnel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Open', color: '#38bdf8', count: open.length },
            { label: 'Follow Up', color: '#fb923c', count: followUp.length },
            { label: 'Converted', color: '#4ade80', count: converted.length },
            { label: 'Closed/Lost', color: '#6b7280', count: closed.length },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className="text-2xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.count}</div>
              <p className="text-[11px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <Card title="All Leads">
          <Tabs tabs={[
            { key: 'all', label: `All (${leads.length})` },
            { key: 'open', label: `Open (${open.length})` },
            { key: 'follow_up', label: `Follow Up (${followUp.length})` },
            { key: 'converted', label: `Converted (${converted.length})` },
            { key: 'closed', label: `Closed (${closed.length})` },
          ]} active={tab} onChange={setTab} />
          {isLoading
            ? <div className="py-16 text-center text-muted text-xs">Loading…</div>
            : <DataTable columns={COLS} data={tabMap[tab] || leads} pageSize={10} />
          }
        </Card>
      </div>

      {/* Add lead */}
      <Modal title="Add Lead" open={modal === 'create'} onClose={() => setModal(null)}>
        <LeadForm
          customers={customers}         // ← add this
          loading={createMut.isPending}
          onClose={() => setModal(null)}
          onSubmit={d => createMut.mutate(d)}
        />
      </Modal>

      {/* Edit lead */}
      <Modal title="Edit Lead" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && (
          <LeadForm
            customers={customers}       // ← add this
            initial={editing}
            loading={updateMut.isPending}
            onClose={() => { setModal(null); setEditing(null); }}
            onSubmit={d => updateMut.mutate({ id: editing.id, data: d })}
          />
        )}
      </Modal>

      {/* Edit lead */}
      <Modal title="Edit Lead" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && (
          <LeadForm initial={editing} loading={updateMut.isPending}
            onClose={() => { setModal(null); setEditing(null); }}
            onSubmit={d => updateMut.mutate({ id: editing.id, data: d })} />
        )}
      </Modal>

      {/* Convert lead → job form */}
      <Modal title="Convert Lead to Job" open={!!converting} onClose={() => setConverting(null)} width="max-w-lg">
        {converting && (
          <ConvertLeadForm
            lead={converting}
            customers={customers}
            loading={convertMut.isPending}
            onClose={() => setConverting(null)}
            onSubmit={data => convertMut.mutate({ id: converting.id, data })}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal title="Delete Lead" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">
          Delete lead for <span className="font-medium text-text">
            "{deleting?.prospectiveClientName || deleting?.customer?.fullName}"
          </span>?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleteMut.mutate(deleting.id)} disabled={deleteMut.isPending}
            className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 cursor-pointer disabled:opacity-50">
            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </>
  );
}