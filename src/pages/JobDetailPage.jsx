import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { jobDetailApi } from '../api/jobDetailApi';
import { equipmentApi, crewApi } from '../api/endpoints';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmt, fmtCompact, fmtDate } from '../utils/format';
import { ArrowLeft, Pencil } from 'lucide-react';

const normalize = d => d?.data || d || [];
const nr = d => d?.data || d;

const METHOD_OPTS = ['cash', 'bank', 'transfer', 'pos', 'other'].map(v => ({ value: v, label: v.toUpperCase() }));
const TAG_OPTS = ['crew', 'equipment', 'third_party', 'misc'].map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const SOURCE_OPTS = ['inhouse', 'outsourced'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

const fmtCurrency = (n) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })
        .format(n ?? 0).replace('NGN', '₦');

const STATUS_CONFIG = {
    planned: { label: 'Planned', pill: 'bg-blue-100 text-blue-700', chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
    confirmed: { label: 'Confirmed', pill: 'bg-green-100 text-green-700', chip: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' },
    in_progress: { label: 'In Progress', pill: 'bg-amber-100 text-amber-700', chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300' },
    completed: { label: 'Completed', pill: 'bg-violet-100 text-violet-700', chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300' },
    cancelled: { label: 'Cancelled', pill: 'bg-rose-100 text-rose-700', chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-300' },
};

// ─── helper: always pass the full {value,label} object to react-select-style Select ──
const findOpt = (opts, val) => opts.find(o => o.value === val.toUpperCase()) ?? null;

// ─── UI primitives ────────────────────────────────────────────────────────────
function StatusPill({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
    return <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>;
}
function Divider() { return <div className="h-px bg-gray-100 dark:bg-white/5 my-0" />; }
function SectionLabel({ children }) {
    return <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 mt-4 mb-1.5">{children}</p>;
}
function Card({ children, className = '' }) {
    return <div className={`bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 ${className}`}>{children}</div>;
}
function DetailRow({ label, value }) {
    return (
        <div className="flex justify-between items-start gap-3 py-2">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            <span className="text-xs text-gray-700 dark:text-gray-200 text-right">{value}</span>
        </div>
    );
}
function CostRow({ primary, secondary, amount, amountClass = 'text-gray-700 dark:text-gray-200', onDelete, loading }) {
    return (
        <>
            <div className="flex justify-between items-center py-2 gap-3 group">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{primary}</p>
                    {secondary && <p className="text-[10px] text-gray-400 mt-0.5">{secondary}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-xs ${amountClass}`}>{fmtCurrency(amount)}</span>
                    {onDelete && (
                        <button onClick={onDelete} disabled={loading}
                            className="w-5 h-5 rounded flex items-center justify-center text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30 text-[10px]">
                            ✕
                        </button>
                    )}
                </div>
            </div>
            <Divider />
        </>
    );
}
function SubSectionHeader({ title, actionLabel = '+', onAction }) {
    return (
        <div className="flex justify-between items-center mt-3 mb-1 px-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            {onAction && (
                <button onClick={onAction} className="text-xs font-semibold text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-md px-2 py-1 transition-colors">
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
function CollapsibleCard({ items = [], emptyText, previewCount = 3, renderItem }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, previewCount);
    return (
        <Card>
            {items.length === 0 ? (
                <p className="text-xs text-gray-400">{emptyText}</p>
            ) : (
                <>
                    {visible.map(renderItem)}
                    {items.length > previewCount && (
                        <button onClick={() => setExpanded(!expanded)}
                            className="text-xs font-medium text-sky-500 hover:text-sky-600 pt-1 w-full text-left">
                            {expanded ? 'Show less' : `Show all ${items.length}`}
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}

// ─── Forms ────────────────────────────────────────────────────────────────────
// KEY FIXES applied to ALL forms:
// 1. Select value={findOpt(opts, storedString)}  — pass full {value,label} object
// 2. Select onChange={v => set(v?.value ?? fallback)} — extract string from object
// 3. submit uses e?.preventDefault() — safe whether called from form submit or FormActions click

function AddInhouseRentalForm({ equipment, loading, onClose, onSubmit }) {
    const [rows, setRows] = useState([{ equipmentId: '', itemName: '', daysUsed: 1, unitCost: '' }]);
    const equipmentOptions = equipment.map(e => ({ value: e.id, label: e.name || e.itemName }));

    const update = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    const handleEquipmentChange = (i, equipmentId) => {
        const selected = equipment.find(e => String(e.id) === String(equipmentId));
        setRows(r => r.map((row, idx) => idx === i ? {
            ...row,
            equipmentId,
            itemName: selected?.name || selected?.itemName || '',
        } : row));
    };

    const submit = (e) => {
        e?.preventDefault();
        const items = rows
            .filter(r => r.equipmentId)
            .map(r => ({ equipment_id: r.equipmentId, item_name: r.itemName, days_used: Number(r.daysUsed), unit_cost: Number(r.unitCost) }));
        if (!items.length) return toast.error('Select at least one equipment item');
        onSubmit({ items });
    };

    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                {rows.map((row, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2">
                        <Select
                            label="Equipment"
                            value={row.equipmentId}
                            onChange={e => handleEquipmentChange(i, e.target.value)}
                            options={equipmentOptions}
                        />
                        <Input label="Days" type="number" min={1} value={row.daysUsed}
                            onChange={e => update(i, 'daysUsed', e.target.value)} />
                        <Input label="Cost/day" type="number" value={row.unitCost}
                            onChange={e => update(i, 'unitCost', e.target.value)} />
                    </div>
                ))}
                <button type="button"
                    onClick={() => setRows(r => [...r, { equipmentId: '', itemName: '', daysUsed: 1, unitCost: '' }])}
                    className="text-xs text-sky-500 hover:text-sky-400">+ Add row</button>
                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Add Rentals" />
            </div>
        </form>
    );
}

function AddOutsourcedRentalForm({ loading, onClose, onSubmit }) {
    const [f, setF] = useState({ itemName: '', supplierName: '', quantity: 1, daysUsed: 1, unitCost: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = (e) => {
        e?.preventDefault();
        if (!f.itemName || !f.supplierName || !f.unitCost) return toast.error('Fill all fields');
        onSubmit({ ...f, item_name: f.itemName, supplier_name: f.supplierName, qty: Number(f.quantity), days_used: Number(f.daysUsed), unit_cost: Number(f.unitCost) });
    };
    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                <FormRow>
                    <Input label="Item name" value={f.itemName} onChange={e => set('itemName', e.target.value)} />
                    <Input label="Supplier" value={f.supplierName} onChange={e => set('supplierName', e.target.value)} />
                </FormRow>
                <FormRow>
                    <Input label="Qty" type="number" min={1} value={f.quantity} onChange={e => set('quantity', e.target.value)} />
                    <Input label="Days" type="number" min={1} value={f.daysUsed} onChange={e => set('daysUsed', e.target.value)} />
                    <Input label="Unit cost" type="number" value={f.unitCost} onChange={e => set('unitCost', e.target.value)} />
                </FormRow>
                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Add Rental" />
            </div>
        </form>
    );
}

function AddCrewForm({ crewList, loading, onClose, onSubmit }) {
    const [source, setSource] = useState('inhouse');
    const [f, setF] = useState({ staffId: '', role: '', amountToPay: '', contractorName: '', agreedAmount: '', notes: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));

    const crewOptions = crewList.map(c => ({ value: c.crewCode, label: c.name || c.staffName }));

    const submit = (e) => {
        e?.preventDefault();
        if (source === 'inhouse') {
            if (!f.staffId || !f.amountToPay) return toast.error('Select staff and amount');
            onSubmit({ crew_type: 'inhouse', crew_code: f.staffId, role: f.role, amountToPay: Number(f.amountToPay) });
        } else {
            if (!f.contractorName || !f.agreedAmount) return toast.error('Fill contractor details');
            onSubmit({ crew_type: 'outsourced', contractorName: f.contractorName, role: f.role, agreedAmount: Number(f.agreedAmount), notes: f.notes });
        }
    };

    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                <Select
                    label="Source"
                    value={source}                          // ✅ raw string
                    onChange={e => setSource(e.target.value)}  // ✅ e not v
                    options={SOURCE_OPTS}
                />
                {source === 'inhouse' ? (
                    <FormRow>
                        <Select
                            label="Staff member"
                            value={f.staffId}                          // ✅ raw string
                            onChange={e => set('staffId', e.target.value)}  // ✅ e not v
                            options={crewOptions}
                        />
                        <Input label="Role" value={f.role} onChange={e => set('role', e.target.value)} />
                        <Input label="Amount to pay" type="number" value={f.amountToPay} onChange={e => set('amountToPay', e.target.value)} />
                    </FormRow>
                ) : (
                    <FormRow>
                        <Input label="Contractor name" value={f.contractorName} onChange={e => set('contractorName', e.target.value)} />
                        <Input label="Role" value={f.role} onChange={e => set('role', e.target.value)} />
                        <Input label="Agreed amount" type="number" value={f.agreedAmount} onChange={e => set('agreedAmount', e.target.value)} />
                        <Textarea label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} />
                    </FormRow>
                )}
                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Assign" />
            </div>
        </form>
    );
}

function AddPurchaseForm({ loading, onClose, onSubmit }) {
    const [f, setF] = useState({ itemName: '', quantity: 1, unit: '', unitCost: '', sourceType: 'inhouse', supplierName: '', notes: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = (e) => {
        e?.preventDefault();
        if (!f.itemName || !f.unitCost) return toast.error('Fill required fields');
        onSubmit({ ...f, quantity: Number(f.quantity), unitPrice: Number(f.unitCost) });
    };
    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                <FormRow>
                    <Input label="Item name" value={f.itemName} onChange={e => set('itemName', e.target.value)} />
                    <Select
                        label="Source"
                        value={findOpt(SOURCE_OPTS, f.sourceType)}
                        onChange={v => set('sourceType', v?.target.value ?? 'inhouse')}
                        options={SOURCE_OPTS}
                    />
                </FormRow>
                <FormRow>
                    <Input label="Qty" type="number" min={1} value={f.quantity} onChange={e => set('quantity', e.target.value)} />
                    <Input label="Unit (optional)" value={f.unit} onChange={e => set('unit', e.target.value)} />
                    <Input label="Unit cost" type="number" value={f.unitCost} onChange={e => set('unitCost', e.target.value)} />
                </FormRow>
                {f.sourceType === 'outsourced' && (
                    <Input label="Supplier name" value={f.supplierName} onChange={e => set('supplierName', e.target.value)} />
                )}
                <Textarea label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} />
                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Add Item" />
            </div>
        </form>
    );
}

function AddExpenseForm({ loading, onClose, onSubmit }) {
    const [f, setF] = useState({ purpose: '', amount: '', tag: 'misc', notes: '' });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const submit = (e) => {
        e?.preventDefault();
        if (!f.purpose || !f.amount) return toast.error('Fill required fields');
        onSubmit({ ...f, amount: Number(f.amount) });
    };
    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                <FormRow>
                    <Input label="Purpose" value={f.purpose} onChange={e => set('purpose', e.target.value)} />
                    <Input label="Amount" type="number" value={f.amount} onChange={e => set('amount', e.target.value)} />
                    <Select
                        label="Tag"
                        value={findOpt(TAG_OPTS, f.tag)}
                        onChange={v => set('tag', v?.target.value ?? 'misc')}
                        options={TAG_OPTS}
                    />
                </FormRow>
                <Textarea label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} />
                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Log Expense" />
            </div>
        </form>
    );
}

function AddPaymentForm({ jobId, customerCode, loading, onClose, onSubmit }) {
    const [f, setF] = useState({ amount: '', method: 'cash', datePaid: '', notes: '' });
    const set = (k, v) => {
        setF(p => ({ ...p, [k]: v }))
    };
    const submit = (e) => {
        e?.preventDefault();
        if (!f.amount || !f.datePaid) return toast.error('Fill required fields');
        onSubmit({ jobId, customerCode, amount: Number(f.amount), method: f.method.toUpperCase(), datePaid: f.datePaid, notes: f.notes });
    };
    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                <FormRow>
                    <Input label="Amount" type="number" value={f.amount} onChange={e => set('amount', e.target.value)} />
                    <Select
                        label="Method"
                        value={findOpt(METHOD_OPTS, f.method)}
                        onChange={v => set('method', v?.target.value ?? 'cash')}
                        options={METHOD_OPTS}
                    />
                    <Input label="Date paid" type="date" value={f.datePaid} onChange={e => set('datePaid', e.target.value)} />
                </FormRow>
                <Textarea label="Notes" value={f.notes} onChange={e => set('notes', e.target.value)} />
                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Record Payment" />
            </div>
        </form>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function JobDetailPage({
    job: jobProp,
    onBack,
    onNavigateToEditJob,
    onNavigateToAssignEquipment,
    onNavigateToAssignCrew,
    onNavigateToPhotos,
}) {
    const qc = useQueryClient();
    const jobId = jobProp?.id;
    //console.log(jobId);
    const [modal, setModal] = useState(null);

    const { data: rentals = {} } = useQuery({
        queryKey: ['job-rentals', jobId],
        queryFn: () => jobDetailApi.getRentalItems(jobId),
        select: d => nr(d) || {},
        enabled: !!jobId
    });

    const { data: financials = {
        "jobProfit": jobProp?.jobProfit, "jobEquipments": jobProp?.jobEquipments, "jobCrew": jobProp?.jobCrew, "profitMargin": jobProp?.profitMargin
    } } = useQuery({
        queryKey: ['job-financials', jobId],
        queryFn: () => jobDetailApi.getFinancials(jobId),
        select: d => nr(d) || {},
        enabled: !!jobId
    })

    const { data: crewData = {} } = useQuery({
        queryKey: ['job-crew', jobId],
        queryFn: () => jobDetailApi.getCrew(jobId),
        select: d => nr(d) || {},
        enabled: !!jobId
    });

    const { data: purchaseItems = [] } = useQuery({
        queryKey: ['job-purchases', jobId],
        queryFn: () => jobDetailApi.getPurchaseItems(jobId),
        select: d => normalize(nr(d)?.data || nr(d)),
        enabled: !!jobId
    });

    const { data: expenses = [] } = useQuery({
        queryKey: ['job-expenses', jobId],
        queryFn: () => jobDetailApi.getExpenses(jobId),
        select: d => normalize(nr(d)?.data || nr(d)),
        enabled: !!jobId
    });

    const { data: payments = [] } = useQuery({
        queryKey: ['job-payments', jobId],
        queryFn: () => jobDetailApi.getPayments(jobId),
        select: d => normalize(nr(d)?.data || nr(d)),
        enabled: !!jobId
    });

    const { data: equipment = [] } = useQuery({
        queryKey: ['equipment'],
        queryFn: () => equipmentApi.list(),
        select: normalize
    });

    const { data: crewList = [] } = useQuery({
        queryKey: ['crew'],
        queryFn: () => crewApi.list(),
        select: normalize
    });

    const inval = (...keys) => keys.forEach(k => qc.invalidateQueries([k]));

    const addInhouseRental = useMutation({
        mutationFn: data => jobDetailApi.addInhouseRentals(jobId, data),
        onSuccess: () => {
            inval('job-rentals', 'jobs');
            toast.success('Rental items added');
            setModal(null);
        },
        onError: e => toast.error(e.message)
    });

    const delInhouseRental = useMutation({
        mutationFn: id => jobDetailApi.deleteInhouseRental(jobId, id),
        onSuccess: () => {
            inval('job-rentals', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });

    const addOutsourcedRental = useMutation({
        mutationFn: data => jobDetailApi.addOutsourcedRental(jobId, data),
        onSuccess: () => {
            inval('job-rentals', 'jobs');
            toast.success('Outsourced rental added');
            setModal(null);
        },
        onError: e => toast.error(e.message)
    });

    const delOutsourcedRental = useMutation({
        mutationFn: id => jobDetailApi.deleteOutsourcedRental(jobId, id),
        onSuccess: () => {
            inval('job-rentals', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });

    const addCrew = useMutation({
        mutationFn: data => jobDetailApi.addCrew(jobId, data),
        onSuccess: () => {
            inval('job-crew', 'jobs');
            toast.success('Crew assigned');
            setModal(null);
        },
        onError: e => toast.error(e.message)
    });

    const delInhouseCrew = useMutation({
        mutationFn: id => jobDetailApi.deleteInhouseCrew(id),
        onSuccess: () => {
            inval('job-crew', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });

    const delOutsourcedCrew = useMutation({
        mutationFn: ({ jobId, id }) => jobDetailApi.deleteOutsourcedCrew(jobId, id),
        onSuccess: () => {
            inval('job-crew', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });

    const addPurchase = useMutation({
        mutationFn: data => jobDetailApi.addPurchaseItem(jobId, data),
        onSuccess: () => {
            inval('job-purchases', 'jobs');
            toast.success('Purchase item added');
            setModal(null);
        },
        onError: e => toast.error(e.message)
    });

    const delPurchase = useMutation({
        mutationFn: id => jobDetailApi.deletePurchaseItem(id),
        onSuccess: () => {
            inval('job-purchases', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });

    const addExpense = useMutation({
        mutationFn: data => jobDetailApi.addExpense(jobId, data),
        onSuccess: () => {
            inval('job-expenses', 'jobs');
            toast.success('Expense logged');
            setModal(null);
        },
        onError: e => toast.error(e.message)
    });

    const delExpense = useMutation({
        mutationFn: id => jobDetailApi.deleteExpense(id),
        onSuccess: () => {
            inval('job-expenses', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });

    const addPayment = useMutation({
        mutationFn: data => jobDetailApi.addPayment(data),
        onSuccess: () => {
            inval('job-payments', 'jobs');
            toast.success('Payment recorded');
            setModal(null);
        },
        onError: e => toast.error(e.message)
    });

    const delPayment = useMutation({
        mutationFn: id => jobDetailApi.deletePayment(id),
        onSuccess: () => {
            inval('job-payments', 'jobs');
            toast.success('Removed');
        },
        onError: e => toast.error(e.message)
    });
    const updateStatus = useMutation({
        mutationFn: status => jobDetailApi.updateStatus(jobId, status),
        onSuccess: () => {
            inval('jobs');
            toast.success('Status updated');
        },
        onError: e => toast.error(e.message)
    });

    const job = jobProp || {};
    const inhouseRentals = rentals.inhouse || [];
    const outsourcedRentals = rentals.outsourced || [];
    const inhouseCrew = crewData.inhouse || [];
    const outsourcedCrew = crewData.outsourced || [];
    const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const outstanding = (parseFloat(job.quotedPrice) || 0) - totalPaid;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">

            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/10 px-4 py-3 flex items-center gap-3">
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5">
                    <ArrowLeft size={14} /> Back
                </button>
                <h1 className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{job.jobTitle}</h1>
                <StatusPill status={job.jobStatus} />
                <button onClick={onNavigateToEditJob} className="text-sm font-medium text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1">
                    <Pencil size={13} /> Edit
                </button>
            </div>

            <div className="flex flex-col gap-2 p-4 pb-10 mx-auto w-full">

                <Card>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                            <p className="text-[11px] text-gray-400">Customer</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{job.customerCode ?? '—'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] text-gray-400">Quoted price</p>
                            <p className="font-mono text-xl font-semibold text-sky-500">{fmtCompact(job.quotedPrice || 0)}</p>
                        </div>
                    </div>
                    <Divider />
                    <DetailRow label="Event dates" value={`${fmtDate(job.eventDateStart)} → ${fmtDate(job.eventDateEnd)}`} />
                    <Divider />
                    <DetailRow label="Setup date" value={fmtDate(job.setupDate)} />
                    {job.jobNotes && (<><Divider /><DetailRow label="Notes" value={job.jobNotes} /></>)}
                </Card>

                <SectionLabel>Manage</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Equipment', icon: '📦', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700', onClick: onNavigateToAssignEquipment },
                        { label: 'Crew', icon: '👥', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700', onClick: onNavigateToAssignCrew },
                        { label: 'Photos', icon: '📷', color: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700', onClick: onNavigateToPhotos },
                    ].map(({ label, icon, color, onClick }) => (
                        <button key={label} onClick={onClick} className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-opacity hover:opacity-75 ${color}`}>
                            <span className="text-lg">{icon}</span>{label}
                        </button>
                    ))}
                </div>

                <SectionLabel>Cost Breakdown</SectionLabel>
                <Card>
                    {[
                        { label: 'Crew', amount: financials.totalCrewCost, cls: 'text-amber-600' },
                        { label: 'Rentals', amount: financials.totalRentalCost, cls: 'text-blue-600' },
                        { label: 'Purchases', amount: financials.totalPurchaseCost, cls: 'text-violet-600' },
                        { label: 'Other Expenses', amount: financials.totalOtherExpenses, cls: 'text-gray-400' },
                        { label: 'External Vendor', amount: financials.externalVendorCost, cls: 'text-pink-500' },
                    ].filter(({ amount }) => amount > 0).map(({ label, amount, cls }) => (
                        <div key={label}>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs text-gray-400">{label}</span>
                                <span className={`font-mono text-xs ${cls}`}>{fmtCurrency(amount)}</span>
                            </div>
                            <Divider />
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Net profit</span>
                        <div className="text-right">
                            <p className={`font-mono text-base font-semibold ${(financials.jobProfit || 0) >= 0 ? 'text-green-600' : 'text-rose-500'}`}>{fmtCurrency(financials.jobProfit || 0)}</p>
                            <p className="text-[10px] text-gray-400">{financials.profitMargin || 0}% margin</p>
                        </div>
                    </div>
                </Card>

                <SectionLabel>Payment</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3">
                        <p className="text-[11px] text-green-600 mb-1">Paid</p>
                        <p className="font-mono text-base font-semibold text-green-700">{fmtCurrency(totalPaid)}</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl p-3">
                        <p className="text-[11px] text-rose-500 mb-1">Outstanding</p>
                        <p className="font-mono text-base font-semibold text-rose-600">{fmtCurrency(Math.max(0, outstanding))}</p>
                    </div>
                </div>

                <SubSectionHeader title="In-House Rentals" actionLabel="+ Add" onAction={() => setModal('inhouse-rental')} />
                <CollapsibleCard items={inhouseRentals} emptyText="No in-house rental items added yet." renderItem={(item) => (
                    <CostRow key={item.id} primary={item.itemName || item.item_name}
                        secondary={`${item.daysUsed || item.days_used} day(s) · ${fmtCurrency(item.unitCost || item.unit_cost)}/day`}
                        amount={parseFloat(item.totalCost || item.total_cost)} amountClass="text-emerald-600"
                        onDelete={() => delInhouseRental.mutate(item.id)} loading={delInhouseRental.isPending} />
                )} />

                <SubSectionHeader title="Outsourced Rentals" actionLabel="+ Add" onAction={() => setModal('outsourced-rental')} />
                <CollapsibleCard items={outsourcedRentals} emptyText="No outsourced rental items added yet." renderItem={(item) => (
                    <CostRow key={item.id} primary={item.itemName || item.item_name}
                        secondary={`${item.supplierName || item.supplier_name} · qty ${item.quantity} · ${item.daysUsed || item.days_used} day(s)`}
                        amount={parseFloat(item.totalCost || item.total_cost)} amountClass="text-sky-600"
                        onDelete={() => delOutsourcedRental.mutate(item.id)} loading={delOutsourcedRental.isPending} />
                )} />

                <SubSectionHeader title="Inhouse Staff" actionLabel="+ Assign" onAction={() => setModal('crew')} />
                <CollapsibleCard items={inhouseCrew} emptyText="No inhouse staff assigned yet." renderItem={(c) => (
                    <CostRow key={c.id} primary={c.staffName || c.name}
                        secondary={`${c.role || '—'} · paid: ${fmtCurrency(c.amountPaid || 0)} · outstanding: ${fmtCurrency(c.amountOutstanding || 0)}`}
                        amount={parseFloat(c.amountToPay)} amountClass="text-amber-600"
                        onDelete={() => delInhouseCrew.mutate(c.id)} loading={delInhouseCrew.isPending} />
                )} />

                <SubSectionHeader title="Outsourced Contractors" actionLabel="+ Add" onAction={() => setModal('crew')} />
                <CollapsibleCard items={outsourcedCrew} emptyText="No contractors assigned yet." renderItem={(c) => (
                    <CostRow key={c.id} primary={c.contractorName || c.staffName}
                        secondary={`${c.role || '—'} · outstanding: ${fmtCurrency(c.amountOutstanding || 0)}`}
                        amount={parseFloat(c.agreedAmount)} amountClass="text-pink-600"
                        onDelete={() => delOutsourcedCrew.mutate({ jobId, id: c.id })} loading={delOutsourcedCrew.isPending} />
                )} />

                <SubSectionHeader title="Purchase Items" actionLabel="+ Add" onAction={() => setModal('purchase')} />
                <CollapsibleCard items={purchaseItems} emptyText="No purchase items added yet." renderItem={(item) => (
                    <CostRow key={item.id} primary={item.itemName}
                        secondary={`${item.sourceType} · qty ${item.quantity}${item.unit ? ' ' + item.unit : ''}`}
                        amount={parseFloat(item.totalCost)} amountClass="text-violet-600"
                        onDelete={() => delPurchase.mutate(item.id)} loading={delPurchase.isPending} />
                )} />

                <SubSectionHeader title="Expenses" actionLabel="+ Log" onAction={() => setModal('expense')} />
                <CollapsibleCard items={expenses} emptyText="No expenses logged yet." previewCount={3} renderItem={(e) => (
                    <CostRow key={e.expenseId} primary={e.purpose || e.notes || '—'}
                        secondary={e.tag?.replace(/_/g, ' ')} amount={parseFloat(e.amount)} amountClass="text-yellow-600"
                        onDelete={() => delExpense.mutate(e.expenseId)} loading={delExpense.isPending} />
                )} />

                <SubSectionHeader title="Payments" actionLabel="+ Record" onAction={() => setModal('payment')} />
                <CollapsibleCard items={payments} emptyText="No payments recorded yet." previewCount={3}
                    renderItem={(p, i, arr) => (
                        <div key={p.paymentId}>
                            {i === 0 && (<><div className="flex justify-between items-center py-2"><span className="text-xs text-gray-400">Total paid</span><span className="font-mono text-xs font-semibold text-green-600">{fmtCurrency(arr.reduce((s, x) => s + parseFloat(x.amount || 0), 0))}</span></div><Divider /></>)}
                            <CostRow primary={fmtDate(p.datePaid)} secondary={`${p.method?.toUpperCase()}${p.notes ? ' · ' + p.notes : ''}`}
                                amount={parseFloat(p.amount)} amountClass="text-green-600"
                                onDelete={() => delPayment.mutate(p.paymentId)} loading={delPayment.isPending} />
                        </div>
                    )} />

                <SectionLabel>Update Status</SectionLabel>
                <div className="flex flex-wrap gap-2 px-1">
                    {Object.entries(STATUS_CONFIG).filter(([key]) => key !== job.jobStatus).map(([key, cfg]) => (
                        <button key={key} onClick={() => updateStatus.mutate(key)} disabled={updateStatus.isPending}
                            className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-opacity hover:opacity-75 disabled:opacity-40 ${cfg.chip}`}>
                            {cfg.label}
                        </button>
                    ))}
                </div>
            </div>

            <Modal title="Add In-House Rentals" open={modal === 'inhouse-rental'} onClose={() => setModal(null)} width="max-w-lg">
                <AddInhouseRentalForm equipment={equipment} loading={addInhouseRental.isPending} onClose={() => setModal(null)} onSubmit={d => addInhouseRental.mutate(d)} />
            </Modal>
            <Modal title="Add Outsourced Rental" open={modal === 'outsourced-rental'} onClose={() => setModal(null)}>
                <AddOutsourcedRentalForm loading={addOutsourcedRental.isPending} onClose={() => setModal(null)} onSubmit={d => addOutsourcedRental.mutate(d)} />
            </Modal>
            <Modal title="Assign Crew" open={modal === 'crew'} onClose={() => setModal(null)}>
                <AddCrewForm crewList={crewList} loading={addCrew.isPending} onClose={() => setModal(null)} onSubmit={d => addCrew.mutate(d)} />
            </Modal>
            <Modal title="Add Purchase Item" open={modal === 'purchase'} onClose={() => setModal(null)}>
                <AddPurchaseForm loading={addPurchase.isPending} onClose={() => setModal(null)} onSubmit={d => addPurchase.mutate(d)} />
            </Modal>
            <Modal title="Log Expense" open={modal === 'expense'} onClose={() => setModal(null)}>
                <AddExpenseForm loading={addExpense.isPending} onClose={() => setModal(null)} onSubmit={d => addExpense.mutate(d)} />
            </Modal>
            <Modal title="Record Payment" open={modal === 'payment'} onClose={() => setModal(null)}>
                <AddPaymentForm jobId={jobId} customerCode={job.customerCode} loading={addPayment.isPending} onClose={() => setModal(null)} onSubmit={d => addPayment.mutate(d)} />
            </Modal>
        </div>
    );
}