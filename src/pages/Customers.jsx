import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, StatusBadge } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmtDate } from '../utils/format';
import { customersApi } from '../api/endpoints';
import { Plus, Users, DollarSign, TrendingUp, Star, Pencil, Trash2 } from 'lucide-react';

import { useMobileMenu } from '../hooks/useMobileMenu';

const normalize = d => d?.data || d || [];
const EMPTY = { fullName: '', phone: '', email: '', companyName: '', notes: '' };

function CustomerForm({ initial = EMPTY, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => {
    e.preventDefault();
    if (!form.fullName) return toast.error('Full name is required');
    onSubmit(form);
  };
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Input label="Full Name" required value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. John Doe" />
        <Input label="Company Name" value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} placeholder="Optional" />
      </FormRow>
      <FormRow>
        <Input label="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+234-800-000-0000" />
        <Input label="Email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
      </FormRow>
      <Textarea label="Notes" value={form.notes || ''} rows={2} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this customer…" />
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
    select: normalize,
  });

  const createMut = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer added'); setModal(null); },
    onError: err => toast.error(err.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ code, data }) => customersApi.update(code, data),
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer updated'); setModal(null); },
    onError: err => toast.error(err.message),
  });
  const deleteMut = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer deleted'); setDeleting(null); },
    onError: err => toast.error(err.message),
  });

  const COLS = [
    {
      label: 'Customer', accessor: 'fullName', sortable: true,
      render: r => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-400/10 flex items-center justify-center text-violet-400 text-xs font-bold shrink-0">
            {r.fullName?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-xs">{r.fullName}</p>
            {r.companyName && <p className="text-[10px] text-muted">{r.companyName}</p>}
          </div>
        </div>
      )
    },
    { label: 'Phone', accessor: 'phone', render: r => r.phone || '—' },
    { label: 'Email', accessor: 'email', render: r => r.email || '—' },
    { label: 'Code', accessor: 'customerCode', render: r => <span className="font-mono text-[10px] text-muted">{r.customerCode}</span> },
    { label: 'Since', accessor: 'createdAt', sortable: true, render: r => fmtDate(r.createdAt) },
    { label: 'Status', render: r => <StatusBadge status={r.isTentative ? 'pending' : 'active'} /> },
    {
      label: '', render: r => (
        <div className="flex gap-1.5">
          <button onClick={() => { setEditing(r); setModal('edit'); }}
            className="w-6 h-6 rounded bg-white/5 text-muted hover:text-text hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors">
            <Pencil size={11} />
          </button>
          <button onClick={() => setDeleting(r)}
            className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      )
    },
  ];

  const { setOpen } = useMobileMenu();
  return (
    <>
      <Topbar title="Customers" subtitle="Client management" onMenuClick={() => setOpen(true)}
        actions={<button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />Add Customer</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Customers" value={customers.length} accent="violet" icon={Users} />
          <KpiCard label="Active" value={customers.filter(c => !c.isTentative).length} accent="green" icon={TrendingUp} />
          <KpiCard label="Tentative" value={customers.filter(c => c.isTentative).length} accent="yellow" icon={Star} />
          <KpiCard label="With Email" value={customers.filter(c => c.email).length} accent="sky" icon={DollarSign} />
        </div>
        <Card title="All Customers" subtitle={`${customers.length} clients`}>
          {isLoading
            ? <div className="py-16 text-center text-muted text-xs">Loading customers…</div>
            : <DataTable columns={COLS} data={customers} pageSize={10} />
          }
        </Card>
      </div>

      <Modal title="Add Customer" open={modal === 'create'} onClose={() => setModal(null)}>
        <CustomerForm loading={createMut.isPending} onClose={() => setModal(null)} onSubmit={data => createMut.mutate(data)} />
      </Modal>
      <Modal title="Edit Customer" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && <CustomerForm initial={editing} loading={updateMut.isPending}
          onClose={() => { setModal(null); setEditing(null); }}
          onSubmit={data => updateMut.mutate({ code: editing.customerCode, data })} />}
      </Modal>
      <Modal title="Delete Customer" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">Delete <span className="text-text font-medium">"{deleting?.fullName}"</span>? All related jobs and payments will also be removed.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleteMut.mutate(deleting.customerCode)} disabled={deleteMut.isPending}
            className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 transition-colors cursor-pointer disabled:opacity-50">
            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </>
  );
}
