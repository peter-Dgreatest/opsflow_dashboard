import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { jobDetailApi } from '../api/jobDetailApi';
import { equipmentApi, customersApi, crewApi } from '../api/endpoints';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { StatusBadge } from '../components/ui';
import { fmt, fmtCompact, fmtDate } from '../utils/format';
import { ArrowLeft, Pencil, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const normalize = d => d?.data || d || [];
const nr = d => d?.data || d;

// ── helpers ───────────────────────────────────────────────────────────────────
const METHOD_OPTS = ['cash', 'bank', 'transfer', 'pos', 'other'].map(v => ({ value: v, label: v.toUpperCase() }));
const TAG_OPTS = ['crew', 'equipment', 'third_party', 'misc'].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const SOURCE_OPTS = ['inhouse', 'outsourced'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, count, accent = '#38bdf8', children, action }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 cursor-pointer group">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted group-hover:text-text transition-colors">{title}</span>
          {count !== undefined && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${accent}18`, color: accent }}>{count}</span>
          )}
          {open ? <ChevronUp size={11} className="text-muted" /> : <ChevronDown size={11} className="text-muted" />}
        </button>
        {action && <div>{action}</div>}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// ── Small card ────────────────────────────────────────────────────────────────
function ItemCard({ primary, secondary, amount, amountColor = 'text-text', onDelete, loading }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.02] border border-border/40 mb-1.5 hover:bg-white/[0.04] transition-colors group">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-xs font-medium truncate">{primary}</p>
        {secondary && <p className="text-[10px] text-muted mt-0.5">{secondary}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {amount !== undefined && <span className={`font-mono text-xs ${amountColor}`}>{fmt(amount)}</span>}
        {onDelete && (
          <button onClick={onDelete} disabled={loading}
            className="w-5 h-5 rounded flex items-center justify-center bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30">
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Inhouse Rental form ───────────────────────────────────────────────────
function AddInhouseRentalForm({ jobId, equipment, onClose, loading, onSubmit }) {
  const [items, setItems] = useState([{ equipment_id: '', item_name: '', unit_cost: '', days_used: 1, booked_dates: [] }]);
  const addRow = () => setItems(i => [...i, { equipment_id: '', item_name: '', unit_cost: '', days_used: 1, booked_dates: [] }]);
  const setRow = (idx, k, v) => setItems(i => i.map((r, j) => j === idx ? { ...r, [k]: v } : r));
  const removeRow = (idx) => setItems(i => i.filter((_, j) => j !== idx));

  const onEqChange = (idx, eqId) => {
    const eq = equipment.find(e => e.id === +eqId);
    setRow(idx, 'equipment_id', eqId);
    if (eq) { setRow(idx, 'item_name', eq.name); setRow(idx, 'unit_cost', eq.pricePerUnit || ''); }
  };

  const handle = (e) => {
    e.preventDefault();
    for (const item of items) {
      if (!item.equipment_id || !item.days_used) return toast.error('Equipment and days required');
    }
    onSubmit({ items });
  };

  const eqOpts = equipment.map(e => ({ value: e.id, label: e.name }));

  return (
    <form onSubmit={handle}>
      {items.map((row, idx) => (
        <div key={idx} className="p-3 rounded-lg bg-white/[0.03] border border-border/50 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted">Item {idx + 1}</span>
            {items.length > 1 && (
              <button type="button" onClick={() => removeRow(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 size={12} /></button>
            )}
          </div>
          <Select label="Equipment" required options={eqOpts} value={row.equipment_id}
            onChange={e => onEqChange(idx, e.target.value)} />
          <FormRow>
            <Input label="Rate/Day (₦)" type="number" required value={row.unit_cost}
              onChange={e => setRow(idx, 'unit_cost', e.target.value)} />
            <Input label="Days" type="number" required min={1} value={row.days_used}
              onChange={e => setRow(idx, 'days_used', +e.target.value)} />
          </FormRow>
          {row.unit_cost && row.days_used && (
            <p className="text-xs text-lime-400 font-mono mt-1">
              Total: {fmt(parseFloat(row.unit_cost) * row.days_used)}
            </p>
          )}
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="w-full py-2 text-xs text-sky-400 border border-dashed border-sky-400/30 rounded-lg hover:bg-sky-400/5 cursor-pointer mb-3 flex items-center justify-center gap-1">
        <Plus size={11} /> Add another item
      </button>
      <FormActions onClose={onClose} loading={loading} submitLabel="Add Rentals" />
    </form>
  );
}

// ── Add Outsourced Rental form ────────────────────────────────────────────────
function AddOutsourcedRentalForm({ onClose, loading, onSubmit }) {
  const [form, setForm] = useState({ item_name: '', supplier_name: '', quantity: 1, unit_cost: '', days_used: 1, notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => {
    e.preventDefault();
    if (!form.item_name || !form.supplier_name) return toast.error('Item name and supplier required');
    onSubmit(form);
  };
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Input label="Item Name" required value={form.item_name} onChange={e => set('item_name', e.target.value)} />
        <Input label="Supplier" required value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Unit Cost (₦)" required type="number" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
        <Input label="Days" required type="number" min={1} value={form.days_used} onChange={e => set('days_used', +e.target.value)} />
      </FormRow>
      <FormRow>
        <Input label="Quantity" type="number" min={1} value={form.quantity} onChange={e => set('quantity', +e.target.value)} />
      </FormRow>
      {form.unit_cost && <p className="text-xs text-lime-400 font-mono mb-3">Total: {fmt(parseFloat(form.unit_cost) * form.days_used * (form.quantity || 1))}</p>}
      <Textarea label="Notes" value={form.notes} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} submitLabel="Add Outsourced Rental" />
    </form>
  );
}

// ── Add Crew form ─────────────────────────────────────────────────────────────
// Both inhouse and outsourced POST to POST /jobs/:jobId/crew
// Controller reads crew_type to decide: 'inhouse' → job_crew table, 'outsourced' → outsourced_crew table
// Inhouse requires: crew_type, crew_code, amountToPay
// Outsourced requires: crew_type, contractorName, agreedAmount
function AddCrewForm({ jobId, crewList, onClose, loading, onSubmit }) {
  const [crewType, setCrewType] = useState('inhouse');
  const [form, setForm] = useState({
    crew_code: '', role: '', amountToPay: '', dates: [],
    contractorName: '', agreedAmount: '', amountPaid: 0, notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = (e) => {
    e.preventDefault();
    if (crewType === 'inhouse') {
      if (!form.crew_code) return toast.error('Crew member required');
      if (!form.amountToPay) return toast.error('Amount to pay required');
      onSubmit({ crew_type: 'inhouse', crew_code: form.crew_code, role: form.role || undefined, amountToPay: parseFloat(form.amountToPay), notes: form.notes || undefined });
    } else {
      if (!form.contractorName) return toast.error('Contractor name required');
      if (!form.agreedAmount) return toast.error('Agreed amount required');
      onSubmit({ crew_type: 'outsourced', contractorName: form.contractorName, role: form.role || undefined, agreedAmount: parseFloat(form.agreedAmount), amountPaid: 0, notes: form.notes || undefined });
    }
  };

  const crewOpts = crewList.map(c => ({ value: c.crew_code, label: `${c.name}${c.role ? ' · ' + c.role : ''}` }));

  const onCrewSelect = (code) => {
    set('crew_code', code);
    const member = crewList.find(c => c.crew_code === code);
    if (member?.rate) set('amountToPay', member.rate);
    if (member?.role) set('role', member.role);
  };

  return (
    <form onSubmit={handle}>
      <div className="flex gap-2 mb-4">
        {['inhouse', 'outsourced'].map(t => (
          <button key={t} type="button" onClick={() => setCrewType(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors
              ${crewType === t ? 'bg-orange-400/10 border-orange-400/30 text-orange-400' : 'border-border text-muted hover:text-text'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {crewType === 'inhouse' ? (
        <>
          <Select label="Crew Member" required options={crewOpts} value={form.crew_code}
            onChange={e => onCrewSelect(e.target.value)} />
          <FormRow>
            <Input label="Role" value={form.role}
              onChange={e => set('role', e.target.value)} placeholder="e.g. Camera Operator" />
            <Input label="Amount to Pay (₦)" required type="number" value={form.amountToPay}
              onChange={e => set('amountToPay', e.target.value)} />
          </FormRow>
        </>
      ) : (
        <>
          <Input label="Contractor Name" required value={form.contractorName}
            onChange={e => set('contractorName', e.target.value)} placeholder="e.g. Tunde Visuals" />
          <FormRow>
            <Input label="Role" value={form.role}
              onChange={e => set('role', e.target.value)} placeholder="e.g. Videographer" />
            <Input label="Agreed Amount (₦)" required type="number" value={form.agreedAmount}
              onChange={e => set('agreedAmount', e.target.value)} />
          </FormRow>
        </>
      )}
      <Textarea label="Notes" value={form.notes} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} submitLabel="Assign Crew" />
    </form>
  );
}

// ── Add Purchase Item form ────────────────────────────────────────────────────
function AddPurchaseForm({ onClose, loading, onSubmit }) {
  const [form, setForm] = useState({ itemName: '', sourceType: 'inhouse', supplierName: '', unitPrice: '', quantity: 1, unit: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => {
    e.preventDefault();
    if (!form.itemName || !form.unitPrice || !form.quantity) return toast.error('Item name, price and quantity required');
    if (form.sourceType === 'outsourced' && !form.supplierName) return toast.error('Supplier name required for outsourced items');
    onSubmit(form);
  };
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Input label="Item Name" required value={form.itemName} onChange={e => set('itemName', e.target.value)} />
        <Select label="Source" options={SOURCE_OPTS} value={form.sourceType} onChange={e => set('sourceType', e.target.value)} />
      </FormRow>
      {form.sourceType === 'outsourced' && (
        <Input label="Supplier Name" required value={form.supplierName} onChange={e => set('supplierName', e.target.value)} />
      )}
      <FormRow>
        <Input label="Unit Price (₦)" required type="number" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} />
        <Input label="Quantity" required type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
      </FormRow>
      {form.unitPrice && <p className="text-xs text-lime-400 font-mono mb-3">Total: {fmt(parseFloat(form.unitPrice) * (form.quantity || 1))}</p>}
      <Input label="Unit (optional)" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="pcs, meters, kg…" />
      <Textarea label="Notes" value={form.notes} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} submitLabel="Add Purchase Item" />
    </form>
  );
}

// ── Add Expense form ──────────────────────────────────────────────────────────
function AddExpenseForm({ onClose, loading, onSubmit }) {
  const [form, setForm] = useState({ purpose: '', tag: 'misc', amount: '', dateMade: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => {
    e.preventDefault();
    if (!form.amount) return toast.error('Amount required');
    onSubmit(form);
  };
  return (
    <form onSubmit={handle}>
      <Input label="Purpose" value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="e.g. Fuel for van" />
      <FormRow>
        <Select label="Category" options={TAG_OPTS} value={form.tag} onChange={e => set('tag', e.target.value)} />
        <Input label="Amount (₦)" required type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
      </FormRow>
      <Input label="Date" type="date" value={form.dateMade} onChange={e => set('dateMade', e.target.value)} />
      <Textarea label="Notes" value={form.notes} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} submitLabel="Log Expense" />
    </form>
  );
}

// ── Add Payment form ──────────────────────────────────────────────────────────
function AddPaymentForm({ jobId, customerCode, onClose, loading, onSubmit }) {
  const [form, setForm] = useState({ jobId, customerCode, amount: '', method: 'cash', datePaid: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handle = (e) => {
    e.preventDefault();
    if (!form.amount) return toast.error('Amount required');
    onSubmit(form);
  };
  return (
    <form onSubmit={handle}>
      <FormRow>
        <Input label="Amount (₦)" required type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
        <Select label="Method" options={METHOD_OPTS} value={form.method} onChange={e => set('method', e.target.value)} />
      </FormRow>
      <Input label="Date Paid" type="date" value={form.datePaid} onChange={e => set('datePaid', e.target.value)} />
      <Textarea label="Notes" value={form.notes} rows={2} onChange={e => set('notes', e.target.value)} />
      <FormActions onClose={onClose} loading={loading} submitLabel="Record Payment" />
    </form>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CHIPS = {
  planned: { color: '#38bdf8' },
  confirmed: { color: '#a78bfa' },
  in_progress: { color: '#fb923c' },
  completed: { color: '#4ade80' },
  cancelled: { color: '#fb7185' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function JobDetailPage({ job: jobProp, onBack, onNavigateToEditJob }) {
  const qc = useQueryClient();
  const jobId = jobProp?.id;
  const [modal, setModal] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: rentals = {} } = useQuery({
    queryKey: ['job-rentals', jobId],
    queryFn: () => jobDetailApi.getRentalItems(jobId),
    select: d => nr(d) || {},
    enabled: !!jobId,
  });

  const { data: crewData = {} } = useQuery({
    queryKey: ['job-crew', jobId],
    queryFn: () => jobDetailApi.getCrew(jobId),
    select: d => nr(d) || {},
    enabled: !!jobId,
  });

  const { data: purchaseItems = [] } = useQuery({
    queryKey: ['job-purchases', jobId],
    queryFn: () => jobDetailApi.getPurchaseItems(jobId),
    select: d => normalize(nr(d)?.data || nr(d)),
    enabled: !!jobId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['job-expenses', jobId],
    queryFn: () => jobDetailApi.getExpenses(jobId),
    select: d => normalize(nr(d)?.data || nr(d)),
    enabled: !!jobId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['job-payments', jobId],
    queryFn: () => jobDetailApi.getPayments(jobId),
    select: d => normalize(nr(d)?.data || nr(d)),
    enabled: !!jobId,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.list(),
    select: normalize,
  });

  const { data: crewList = [] } = useQuery({
    queryKey: ['crew'],
    queryFn: () => crewApi.list(),
    select: normalize,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const inval = (...keys) => keys.forEach(k => qc.invalidateQueries([k]));

  const addInhouseRental = useMutation({
    mutationFn: data => jobDetailApi.addInhouseRentals(jobId, data),
    onSuccess: () => { inval('job-rentals', 'jobs'); toast.success('Rental items added'); setModal(null); },
    onError: e => toast.error(e.message),
  });
  const delInhouseRental = useMutation({
    mutationFn: id => jobDetailApi.deleteInhouseRental(jobId, id),
    onSuccess: () => { inval('job-rentals', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });
  const addOutsourcedRental = useMutation({
    mutationFn: data => jobDetailApi.addOutsourcedRental(jobId, data),
    onSuccess: () => { inval('job-rentals', 'jobs'); toast.success('Outsourced rental added'); setModal(null); },
    onError: e => toast.error(e.message),
  });
  const delOutsourcedRental = useMutation({
    mutationFn: id => jobDetailApi.deleteOutsourcedRental(jobId, id),
    onSuccess: () => { inval('job-rentals', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });

  const addCrew = useMutation({
    mutationFn: data => jobDetailApi.addCrew(jobId, data),
    onSuccess: () => { inval('job-crew', 'jobs'); toast.success('Crew assigned'); setModal(null); },
    onError: e => toast.error(e.message),
  });
  const delInhouseCrew = useMutation({
    mutationFn: id => jobDetailApi.deleteInhouseCrew(id),
    onSuccess: () => { inval('job-crew', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });
  const delOutsourcedCrew = useMutation({
    mutationFn: ({ jobId, id }) => jobDetailApi.deleteOutsourcedCrew(jobId, id),
    onSuccess: () => { inval('job-crew', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });

  const addPurchase = useMutation({
    mutationFn: data => jobDetailApi.addPurchaseItem(jobId, data),
    onSuccess: () => { inval('job-purchases', 'jobs'); toast.success('Purchase item added'); setModal(null); },
    onError: e => toast.error(e.message),
  });
  const delPurchase = useMutation({
    mutationFn: id => jobDetailApi.deletePurchaseItem(id),
    onSuccess: () => { inval('job-purchases', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });

  const addExpense = useMutation({
    mutationFn: data => jobDetailApi.addExpense(jobId, data),
    onSuccess: () => { inval('job-expenses', 'jobs'); toast.success('Expense logged'); setModal(null); },
    onError: e => toast.error(e.message),
  });
  const delExpense = useMutation({
    mutationFn: id => jobDetailApi.deleteExpense(id),
    onSuccess: () => { inval('job-expenses', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });

  const addPayment = useMutation({
    mutationFn: data => jobDetailApi.addPayment(data),
    onSuccess: () => { inval('job-payments', 'jobs'); toast.success('Payment recorded'); setModal(null); },
    onError: e => toast.error(e.message),
  });
  const delPayment = useMutation({
    mutationFn: id => jobDetailApi.deletePayment(id),
    onSuccess: () => { inval('job-payments', 'jobs'); toast.success('Removed'); },
    onError: e => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: status => jobDetailApi.updateStatus(jobId, status),
    onSuccess: () => { inval('jobs'); toast.success('Status updated'); },
    onError: e => toast.error(e.message),
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const job = jobProp || {};
  const inhouseRentals = rentals.inhouse || [];
  const outsourcedRentals = rentals.outsourced || [];
  const inhouseCrew = crewData.inhouse || [];
  const outsourcedCrew = crewData.outsourced || [];
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const outstanding = (parseFloat(job.quotedPrice) || 0) - totalPaid;

  const AddBtn = ({ onClick, label }) => (
    <button onClick={onClick}
      className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer">
      <Plus size={10} />{label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-bg overflow-y-auto">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="flex-1 text-sm font-semibold truncate">{job.jobTitle}</h1>
        <StatusBadge status={job.jobStatus} />
        <button onClick={onNavigateToEditJob}
          className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 cursor-pointer transition-colors">
          <Pencil size={12} /> Edit
        </button>
      </div>

      {/* ── Body ── */}
      <div className="p-5 space-y-5 pb-16">

        {/* ── Header card ── */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted mb-1">Customer</p>
              <p className="text-sm font-medium">{job.customerCode}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted">Quoted Price</p>
              <p className="text-xl font-mono font-semibold text-sky-400">{fmtCompact(job.quotedPrice || 0)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-muted text-[10px]">Start</p><p className="font-medium">{fmtDate(job.eventDateStart)}</p></div>
            <div><p className="text-muted text-[10px]">End</p><p className="font-medium">{fmtDate(job.eventDateEnd)}</p></div>
            <div><p className="text-muted text-[10px]">Setup</p><p className="font-medium">{fmtDate(job.setupDate)}</p></div>
          </div>
          {job.jobNotes && <p className="text-xs text-muted mt-3 border-t border-border/50 pt-3">{job.jobNotes}</p>}
        </div>

        {/* ── Financials ── */}
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Cost Breakdown</p>
          <div className="space-y-2">
            {[
              { label: 'Crew Cost', value: job.totalCrewCost, color: 'text-orange-400' },
              { label: 'Rental Cost', value: job.totalRentalCost, color: 'text-sky-400' },
              { label: 'Purchase Cost', value: job.totalPurchaseCost, color: 'text-violet-400' },
              { label: 'Other Expenses', value: job.totalOtherExpenses, color: 'text-yellow-400' },
              { label: 'External Vendor', value: job.externalVendorCost, color: 'text-pink-400' },
            ].map(({ label, value, color }) => value > 0 ? (
              <div key={label} className="flex justify-between items-center text-xs border-b border-border/30 pb-2">
                <span className="text-muted">{label}</span>
                <span className={`font-mono ${color}`}>{fmtCompact(value)}</span>
              </div>
            ) : null)}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold">Net Profit</span>
              <div className="text-right">
                <p className={`font-mono text-base font-bold ${(job.jobProfit || 0) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                  {fmtCompact(job.jobProfit || 0)}
                </p>
                <p className="text-[10px] text-muted">{(job.profitMargin || 0)}% margin</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment tiles ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 border-t-2 border-t-green-400">
            <p className="text-[10px] text-muted mb-1">Total Paid</p>
            <p className="font-mono text-base font-bold text-green-400">{fmtCompact(totalPaid)}</p>
          </div>
          <div className="card p-3 border-t-2 border-t-rose-400">
            <p className="text-[10px] text-muted mb-1">Outstanding</p>
            <p className={`font-mono text-base font-bold ${outstanding > 0 ? 'text-rose-400' : 'text-green-400'}`}>
              {fmtCompact(Math.max(0, outstanding))}
            </p>
          </div>
        </div>

        {/* ── In-house Rentals ── */}
        <Section title="In-House Rentals" count={inhouseRentals.length} accent="#34d399"
          action={<AddBtn onClick={() => setModal('inhouse-rental')} label="Add" />}>
          {inhouseRentals.length === 0
            ? <p className="text-xs text-muted px-1">No in-house rentals yet.</p>
            : inhouseRentals.map(item => (
              <ItemCard key={item.id}
                primary={item.itemName || item.item_name}
                secondary={`${item.daysUsed || item.days_used} day(s) · ${fmt(item.unitCost || item.unit_cost)}/day`}
                amount={parseFloat(item.totalCost || item.total_cost)}
                amountColor="text-emerald-400"
                onDelete={() => delInhouseRental.mutate(item.id)}
                loading={delInhouseRental.isPending}
              />
            ))
          }
        </Section>

        {/* ── Outsourced Rentals ── */}
        <Section title="Outsourced Rentals" count={outsourcedRentals.length} accent="#38bdf8"
          action={<AddBtn onClick={() => setModal('outsourced-rental')} label="Add" />}>
          {outsourcedRentals.length === 0
            ? <p className="text-xs text-muted px-1">No outsourced rentals yet.</p>
            : outsourcedRentals.map(item => (
              <ItemCard key={item.id}
                primary={item.itemName || item.item_name}
                secondary={`${item.supplierName || item.supplier_name} · qty ${item.quantity} · ${item.daysUsed || item.days_used} day(s)`}
                amount={parseFloat(item.totalCost || item.total_cost)}
                amountColor="text-sky-400"
                onDelete={() => delOutsourcedRental.mutate(item.id)}
                loading={delOutsourcedRental.isPending}
              />
            ))
          }
        </Section>

        {/* ── Inhouse Crew ── */}
        <Section title="Inhouse Staff" count={inhouseCrew.length} accent="#fb923c"
          action={<AddBtn onClick={() => setModal('crew')} label="Assign" />}>
          {inhouseCrew.length === 0
            ? <p className="text-xs text-muted px-1">No inhouse staff assigned.</p>
            : inhouseCrew.map(c => (
              <ItemCard key={c.id}
                primary={c.staffName || c.name}
                secondary={`${c.role || '—'} · paid: ${fmt(c.amountPaid || 0)} · outstanding: ${fmt(c.amountOutstanding || 0)}`}
                amount={parseFloat(c.amountToPay)}
                amountColor="text-orange-400"
                onDelete={() => delInhouseCrew.mutate(c.id)}
                loading={delInhouseCrew.isPending}
              />
            ))
          }
        </Section>

        {/* ── Outsourced Contractors ── */}
        <Section title="Contractors" count={outsourcedCrew.length} accent="#f472b6"
          action={<AddBtn onClick={() => setModal('crew')} label="Add" />}>
          {outsourcedCrew.length === 0
            ? <p className="text-xs text-muted px-1">No contractors assigned.</p>
            : outsourcedCrew.map(c => (
              <ItemCard key={c.id}
                primary={c.contractorName || c.staffName}
                secondary={`${c.role || '—'} · outstanding: ${fmt(c.amountOutstanding || 0)}`}
                amount={parseFloat(c.agreedAmount)}
                amountColor="text-pink-400"
                onDelete={() => delOutsourcedCrew.mutate({ jobId, id: c.id })}
                loading={delOutsourcedCrew.isPending}
              />
            ))
          }
        </Section>

        {/* ── Purchase Items ── */}
        <Section title="Purchase Items" count={purchaseItems.length} accent="#a78bfa"
          action={<AddBtn onClick={() => setModal('purchase')} label="Add" />}>
          {purchaseItems.length === 0
            ? <p className="text-xs text-muted px-1">No purchase items yet.</p>
            : purchaseItems.map(item => (
              <ItemCard key={item.id}
                primary={item.itemName}
                secondary={`${item.sourceType} · qty ${item.quantity}${item.unit ? ' ' + item.unit : ''}`}
                amount={parseFloat(item.totalCost)}
                amountColor="text-violet-400"
                onDelete={() => delPurchase.mutate(item.id)}
                loading={delPurchase.isPending}
              />
            ))
          }
        </Section>

        {/* ── Expenses ── */}
        <Section title="Expenses" count={expenses.length} accent="#facc15"
          action={<AddBtn onClick={() => setModal('expense')} label="Log" />}>
          {expenses.length === 0
            ? <p className="text-xs text-muted px-1">No expenses logged yet.</p>
            : expenses.map(e => (
              <ItemCard key={e.expenseId}
                primary={e.purpose || e.notes || '—'}
                secondary={e.tag?.replace(/_/g, ' ')}
                amount={parseFloat(e.amount)}
                amountColor="text-yellow-400"
                onDelete={() => delExpense.mutate(e.expenseId)}
                loading={delExpense.isPending}
              />
            ))
          }
        </Section>

        {/* ── Payments ── */}
        <Section title="Payments" count={payments.length} accent="#4ade80"
          action={<AddBtn onClick={() => setModal('payment')} label="Record" />}>
          {payments.length === 0
            ? <p className="text-xs text-muted px-1">No payments recorded yet.</p>
            : payments.map(p => (
              <ItemCard key={p.paymentId}
                primary={`${fmtDate(p.datePaid)}`}
                secondary={`${p.method?.toUpperCase()} ${p.notes ? '· ' + p.notes : ''}`}
                amount={parseFloat(p.amount)}
                amountColor="text-green-400"
                onDelete={() => delPayment.mutate(p.paymentId)}
                loading={delPayment.isPending}
              />
            ))
          }
        </Section>

        {/* ── Update Status ── */}
        <Section title="Update Status" accent="#6b7280">
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CHIPS)
              .filter(([key]) => key !== job.jobStatus)
              .map(([key, cfg]) => (
                <button key={key} onClick={() => updateStatus.mutate(key)}
                  disabled={updateStatus.isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-opacity hover:opacity-75 disabled:opacity-40"
                  style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}10`, color: cfg.color }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))
            }
          </div>
        </Section>
      </div>

      {/* ── Modals ── */}
      <Modal title="Add In-House Rentals" open={modal === 'inhouse-rental'} onClose={() => setModal(null)} width="max-w-lg">
        <AddInhouseRentalForm jobId={jobId} equipment={equipment}
          loading={addInhouseRental.isPending} onClose={() => setModal(null)}
          onSubmit={d => addInhouseRental.mutate(d)} />
      </Modal>

      <Modal title="Add Outsourced Rental" open={modal === 'outsourced-rental'} onClose={() => setModal(null)}>
        <AddOutsourcedRentalForm loading={addOutsourcedRental.isPending} onClose={() => setModal(null)}
          onSubmit={d => addOutsourcedRental.mutate(d)} />
      </Modal>

      <Modal title="Assign Crew" open={modal === 'crew'} onClose={() => setModal(null)}>
        <AddCrewForm jobId={jobId} crewList={crewList} loading={addCrew.isPending}
          onClose={() => setModal(null)} onSubmit={d => addCrew.mutate(d)} />
      </Modal>

      <Modal title="Add Purchase Item" open={modal === 'purchase'} onClose={() => setModal(null)}>
        <AddPurchaseForm loading={addPurchase.isPending} onClose={() => setModal(null)}
          onSubmit={d => addPurchase.mutate(d)} />
      </Modal>

      <Modal title="Log Expense" open={modal === 'expense'} onClose={() => setModal(null)}>
        <AddExpenseForm loading={addExpense.isPending} onClose={() => setModal(null)}
          onSubmit={d => addExpense.mutate(d)} />
      </Modal>

      <Modal title="Record Payment" open={modal === 'payment'} onClose={() => setModal(null)}>
        <AddPaymentForm jobId={jobId} customerCode={job.customerCode}
          loading={addPayment.isPending} onClose={() => setModal(null)}
          onSubmit={d => addPayment.mutate(d)} />
      </Modal>
    </div>
  );
}
