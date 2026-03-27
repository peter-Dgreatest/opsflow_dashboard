// ─── Equipment Page ───────────────────────────────────────────────────────────
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard, StatusBadge } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmtCompact, fmt, fmtDate } from '../utils/format';
import { equipmentApi } from '../api/endpoints';
import { Plus, HardDrive, DollarSign, Activity, Package, Pencil, Trash2 } from 'lucide-react';

import { useMobileMenu } from '../hooks/useMobileMenu';
const normalize = d => d?.data || d || [];
const STATUS_OPTS = ['active', 'inactive', 'deprecated'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const EMPTY = { name: '', category: '', qty: 1, pricePerUnit: '', totalCostOfPurchase: '', status: 'active', notes: '' };

function EquipmentForm({ initial = EMPTY, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => { e.preventDefault(); if (!form.name) return toast.error('Name required'); onSubmit(form); };
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Input label="Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sony EX1 Camera" />
        <Input label="Category" value={form.category || ''} onChange={e => set('category', e.target.value)} placeholder="e.g. Video, Audio, Lighting" />
      </FormRow>
      <FormRow>
        <Input label="Quantity" type="number" value={form.qty} onChange={e => set('qty', +e.target.value)} min={1} />
        <Select label="Status" options={STATUS_OPTS} value={form.status} onChange={e => set('status', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Rate Per Day (₦)" type="number" value={form.pricePerUnit || ''} onChange={e => set('pricePerUnit', e.target.value)} />
        <Input label="Total Purchase Cost (₦)" type="number" value={form.totalCostOfPurchase || ''} onChange={e => set('totalCostOfPurchase', e.target.value)} />
      </FormRow>
      <Textarea label="Notes" value={form.notes || ''} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

export function EquipmentPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: equipment = [], isLoading } = useQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list, select: normalize });

  const createMut = useMutation({ mutationFn: equipmentApi.create, onSuccess: () => { qc.invalidateQueries(['equipment']); toast.success('Equipment added'); setModal(null); }, onError: e => toast.error(e.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => equipmentApi.update(id, data), onSuccess: () => { qc.invalidateQueries(['equipment']); toast.success('Updated'); setModal(null); }, onError: e => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: equipmentApi.delete, onSuccess: () => { qc.invalidateQueries(['equipment']); toast.success('Deleted'); setDeleting(null); }, onError: e => toast.error(e.message) });

  const totalCost = equipment.reduce((s, e) => s + (e.totalCostOfPurchase || 0), 0);
  const active = equipment.filter(e => e.status === 'active').length;

  const COLS = [
    {
      label: 'Equipment', accessor: 'name', sortable: true,
      render: r => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400 shrink-0"><HardDrive size={13} /></div>
          <div><p className="font-medium text-xs">{r.name}</p><p className="text-[10px] text-muted">{r.category}</p></div>
        </div>
      )
    },
    { label: 'Qty', accessor: 'qty', sortable: true, render: r => <span className="font-mono">{r.qty}</span> },
    { label: 'Rate/Day', accessor: 'pricePerUnit', sortable: true, render: r => <span className="font-mono">{r.pricePerUnit ? fmt(r.pricePerUnit) : '—'}</span> },
    { label: 'Purchase Cost', accessor: 'totalCostOfPurchase', sortable: true, render: r => <span className="font-mono text-muted">{fmtCompact(r.totalCostOfPurchase || 0)}</span> },
    { label: 'Status', accessor: 'status', sortable: true, render: r => <StatusBadge status={r.status} /> },
    { label: 'Added', accessor: 'createdAt', sortable: true, render: r => fmtDate(r.createdAt) },
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
      <Topbar title="Equipment" subtitle="Inventory management" onMenuClick={() => setOpen(true)}
        actions={<button onClick={() => setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13} />Add Equipment</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Items" value={equipment.length} accent="emerald" icon={Package} />
          <KpiCard label="Active" value={active} accent="green" icon={Activity} />
          <KpiCard label="Total Value" value={fmtCompact(totalCost)} accent="yellow" icon={DollarSign} />
          <KpiCard label="Inactive" value={equipment.length - active} accent="coral" icon={HardDrive} />
        </div>
        <Card title="Equipment Inventory">
          {isLoading ? <div className="py-16 text-center text-muted text-xs">Loading…</div> : <DataTable columns={COLS} data={equipment} pageSize={12} />}
        </Card>
      </div>
      <Modal title="Add Equipment" open={modal === 'create'} onClose={() => setModal(null)}>
        <EquipmentForm loading={createMut.isPending} onClose={() => setModal(null)} onSubmit={d => createMut.mutate(d)} />
      </Modal>
      <Modal title="Edit Equipment" open={modal === 'edit'} onClose={() => { setModal(null); setEditing(null); }}>
        {editing && <EquipmentForm initial={editing} loading={updateMut.isPending} onClose={() => { setModal(null); setEditing(null); }} onSubmit={d => updateMut.mutate({ id: editing.id, data: d })} />}
      </Modal>
      <Modal title="Delete Equipment" open={!!deleting} onClose={() => setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">Delete <span className="font-medium text-text">"{deleting?.name}"</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={() => deleteMut.mutate(deleting.id)} className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 cursor-pointer">Delete</button>
        </div>
      </Modal>
    </>
  );
}
export default EquipmentPage;
