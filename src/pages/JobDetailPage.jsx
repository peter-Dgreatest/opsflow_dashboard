import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { jobDetailApi } from '../api/jobDetailApi';
import { equipmentApi, crewApi } from '../api/endpoints';
import { Modal, Input, Textarea, Select, FormRow, FormActions } from '../components/modals/Modal';
import { fmt, fmtCompact, fmtDate } from '../utils/format';
import { ArrowLeft, Pencil, Menu } from 'lucide-react';

import { useMobileMenu } from '../hooks/useMobileMenu';
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
const findOpt = (opts, val) => opts.find(o => o.value === String(val ?? '').toUpperCase()) ?? null;

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
                    {visible.map((item, index) => (
                        <div key={item.id ?? item.paymentId ?? item.expenseId ?? index}>
                            {renderItem(item, index, items)}
                        </div>
                    ))}
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

function AddInhouseRentalForm({ equipment, equipmentBookedDates = {}, jobDateStart, jobDateEnd, loading, onClose, onSubmit }) {
    const [selections, setSelections] = useState({});
    const [unitCosts, setUnitCosts] = useState({}); // overridden cost per equipment

    const jobDates = useMemo(() => {
        if (!jobDateStart || !jobDateEnd) return [];
        const dates = [];
        let cur = new Date(jobDateStart);
        const end = new Date(jobDateEnd);
        while (cur <= end) {
            dates.push(cur.toISOString().slice(0, 10));
            cur = new Date(cur);
            cur.setDate(cur.getDate() + 1);
        }
        return dates;
    }, [jobDateStart, jobDateEnd]);

    const getUnitCost = (eq) => {
        const id = String(eq.id);
        return unitCosts[id] !== undefined ? unitCosts[id] : (eq.rentalPrice || eq.rental_price || 0);
    };

    const toggleEquipment = (equipmentId) => {
        const id = String(equipmentId);
        const booked = equipmentBookedDates[id] || [];
        const availableDates = jobDates.filter(d => !booked.includes(d));
        const current = selections[id];
        if (current && current.size > 0) {
            setSelections(s => ({ ...s, [id]: new Set() }));
        } else {
            setSelections(s => ({ ...s, [id]: new Set(availableDates) }));
        }
    };

    const toggleDay = (equipmentId, date) => {
        const id = String(equipmentId);
        setSelections(s => {
            const current = new Set(s[id] || []);
            if (current.has(date)) current.delete(date); else current.add(date);
            return { ...s, [id]: current };
        });
    };

    const hasSelections = Object.values(selections).some(s => s.size > 0);

    const submit = (e) => {
        e?.preventDefault();
        const items = equipment
            .filter(eq => selections[String(eq.id)]?.size > 0)
            .map(eq => {
                const dates = [...selections[String(eq.id)]].sort();
                const cost = Number(getUnitCost(eq));
                return {
                    equipment_id: eq.id,
                    item_name: eq.name || eq.itemName,
                    days_used: dates.length,
                    unit_cost: cost,
                    booked_dates: dates,
                };
            });
        if (!items.length) return toast.error('Select at least one equipment and day');
        onSubmit({ items });
    };

    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                {jobDates.length === 0 && (
                    <p className="text-[10px] text-rose-400 italic">Job has no event dates set</p>
                )}
                {equipment.map(eq => {
                    const id = String(eq.id);
                    const booked = equipmentBookedDates[id] || [];
                    const selectedDays = selections[id] || new Set();
                    const isSelected = selectedDays.size > 0;
                    const fullyBooked = jobDates.length > 0 && jobDates.every(d => booked.includes(d));
                    const fixedCost = eq.unitCost || eq.pricePerUnit || 0;
                    const currentCost = getUnitCost(eq);
                    const isDiscounted = Number(currentCost) !== Number(fixedCost);
                    const total = selectedDays.size * Number(currentCost);

                    if (fullyBooked) return null;

                    return (
                        <div key={id} className={`border rounded-xl p-3 space-y-2 transition-colors ${isSelected ? 'border-sky-400 dark:border-sky-600 bg-sky-50/50 dark:bg-sky-900/10' : 'border-gray-100 dark:border-white/10'}`}>
                            {/* Header row */}
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleEquipment(id)}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {isSelected && <span className="text-white text-[8px]">✓</span>}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{eq.name || eq.itemName}</p>
                                        {eq.category && <p className="text-[10px] text-gray-400">{eq.category}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono text-gray-400 line-through">{fmtCurrency(fixedCost)}/day</p>
                                    <p className={`text-xs font-mono font-semibold ${isDiscounted ? 'text-green-500' : 'text-sky-500'}`}>
                                        {fmtCurrency(currentCost)}/day
                                        {isDiscounted && <span className="text-[9px] ml-1">discounted</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Cost override — only show when selected */}
                            {isSelected && (
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg px-2 py-1.5" onClick={e => e.stopPropagation()}>
                                    <span className="text-[10px] text-gray-400 shrink-0">Cost/day</span>
                                    <span className="text-[10px] text-gray-300 line-through shrink-0">{fmtCurrency(fixedCost)}</span>
                                    <input
                                        type="number"
                                        value={currentCost}
                                        min={0}
                                        onChange={e => setUnitCosts(s => ({ ...s, [id]: e.target.value }))}
                                        className="flex-1 text-xs bg-transparent border-b border-sky-300 dark:border-sky-700 outline-none text-sky-600 dark:text-sky-400 font-mono text-right py-0.5"
                                        placeholder={String(fixedCost)}
                                    />
                                    {isDiscounted && (
                                        <button type="button" onClick={() => setUnitCosts(s => { const n = { ...s }; delete n[id]; return n; })}
                                            className="text-[9px] text-gray-400 hover:text-rose-400">reset</button>
                                    )}
                                </div>
                            )}

                            {/* Day chips */}
                            {isSelected && jobDates.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1" onClick={e => e.stopPropagation()}>
                                    {jobDates.map(date => {
                                        const isBooked = booked.includes(date);
                                        const isDaySelected = selectedDays.has(date);
                                        const shortLabel = new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
                                        return (
                                            <button key={date} type="button" disabled={isBooked}
                                                onClick={() => !isBooked && toggleDay(id, date)}
                                                className={`text-[10px] px-2 py-1 rounded-lg border transition-colors
                                                    ${isBooked ? 'line-through text-rose-300 border-rose-200 dark:border-rose-800 cursor-not-allowed bg-rose-50 dark:bg-rose-900/10' : ''}
                                                    ${isDaySelected && !isBooked ? 'bg-sky-500 text-white border-sky-500 font-semibold' : ''}
                                                    ${!isDaySelected && !isBooked ? 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-sky-400 hover:text-sky-500' : ''}
                                                `}>
                                                {shortLabel}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Total */}
                            {isSelected && selectedDays.size > 0 && (
                                <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] text-gray-400">{selectedDays.size} day(s) × {fmtCurrency(currentCost)}</span>
                                    <span className={`text-xs font-mono font-semibold ${isDiscounted ? 'text-green-500' : 'text-sky-500'}`}>{fmtCurrency(total)}</span>
                                </div>
                            )}

                            {/* Legend */}
                            {isSelected && booked.some(d => jobDates.includes(d)) && (
                                <div className="flex gap-3 pt-0.5">
                                    <span className="text-[9px] text-rose-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Already booked</span>
                                    <span className="text-[9px] text-sky-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />Selected</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {equipment.length > 0 && equipment.every(eq => {
                    const booked = equipmentBookedDates[String(eq.id)] || [];
                    return jobDates.length > 0 && jobDates.every(d => booked.includes(d));
                }) && (
                        <p className="text-[10px] text-rose-400 italic text-center py-2">All equipment is fully booked for this job's dates</p>
                    )}

                <FormActions loading={loading} onClose={onClose} onSubmit={submit} submitLabel="Assign Equipment" />
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

function DatePicker({ label, selectedDates, disabledDates = [], minDate, maxDate, onToggle }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    // On mount, jump to the job's start month if provided
    useState(() => {
        if (minDate) {
            const d = new Date(minDate);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
        }
    });

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    const fmt = (d) => {
        const dd = String(d).padStart(2, '0');
        const mm = String(viewMonth + 1).padStart(2, '0');
        return `${viewYear}-${mm}-${dd}`;
    };

    const prev = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
    const next = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

    return (
        <div>
            {label && <p className="text-[11px] text-gray-400 mb-1.5">{label}</p>}
            {minDate && maxDate && (
                <p className="text-[9px] text-gray-400 mb-1">
                    {fmtDate(minDate)} → {fmtDate(maxDate)}
                </p>
            )}
            <div className="border border-gray-100 dark:border-white/10 rounded-lg p-2">
                <div className="flex justify-between items-center mb-2">
                    <button type="button" onClick={prev} className="text-gray-400 hover:text-gray-600 px-1">‹</button>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{monthLabel}</span>
                    <button type="button" onClick={next} className="text-gray-400 hover:text-gray-600 px-1">›</button>
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="text-[9px] text-center text-gray-300 py-0.5">{d}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const d = i + 1;
                        const dateStr = fmt(d);
                        const isSelected = selectedDates.includes(dateStr);
                        const isDisabled = disabledDates.includes(dateStr);
                        const outOfRange = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
                        return (
                            <button
                                key={d}
                                type="button"
                                disabled={isDisabled || outOfRange}
                                onClick={() => onToggle(dateStr)}
                                className={`text-[10px] rounded py-1 text-center transition-colors
                                    ${outOfRange ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed' : ''}
                                    ${isDisabled && !outOfRange ? 'text-rose-300 dark:text-rose-700 cursor-not-allowed line-through' : ''}
                                    ${isSelected ? 'bg-sky-500 text-white font-semibold' : !isDisabled && !outOfRange ? 'text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-sky-900/20' : ''}
                                `}
                            >
                                {d}
                            </button>
                        );
                    })}
                </div>
                {selectedDates.length > 0 && (
                    <p className="text-[9px] text-sky-500 mt-1.5 text-center">
                        {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
                    </p>
                )}
            </div>
        </div>
    );
}

function AddCrewForm({ crewList, assignedCrewCodes = [], jobDateStart, jobDateEnd, loading, onClose, onSubmit, lockedSource }) {
    const [source, setSource] = useState(lockedSource ?? 'inhouse');
    const [f, setF] = useState({ staffId: '', role: '', amountToPay: '', contractorName: '', agreedAmount: '', notes: '', selectedDates: [] });

    const toggleCrewDate = (date) => {
        setF(p => {
            const already = p.selectedDates.includes(date);
            return {
                ...p,
                selectedDates: already
                    ? p.selectedDates.filter(d => d !== date)
                    : [...p.selectedDates, date].sort()
            };
        });
    };
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));


    const crewOptions = crewList
        .filter(c => !assignedCrewCodes.includes(c.id))
        .map(c => ({
            value: c.crewCode,   // send crewCode as the value — this is what goes to the API
            label: c.name || c.staffName
        }));

    const submit = (e) => {
        e?.preventDefault();
        if (source === 'inhouse') {
            if (!f.staffId || !f.amountToPay) return toast.error('Select staff and amount');
            onSubmit({ crew_type: 'inhouse', crew_code: f.staffId, role: f.role, amountToPay: Number(f.amountToPay), work_dates: f.selectedDates });
        } else {
            if (!f.contractorName || !f.agreedAmount) return toast.error('Fill contractor details');
            onSubmit({ crew_type: 'outsourced', contractorName: f.contractorName, role: f.role, agreedAmount: Number(f.agreedAmount), notes: f.notes, work_dates: f.selectedDates });
        }
    };

    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                {!lockedSource && (
                    <Select
                        label="Source"
                        value={source}
                        onChange={e => setSource(e.target.value)}
                        options={SOURCE_OPTS}
                    />
                )}
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
                        <DatePicker
                            label="Work dates (optional)"
                            selectedDates={f.selectedDates}
                            disabledDates={[]} // staff can work multiple jobs — no blocking
                            minDate={jobDateStart}
                            maxDate={jobDateEnd}
                            onToggle={toggleCrewDate}
                        />
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

    const { setOpen } = useMobileMenu();

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

    const equipmentBookedDates = useMemo(() => {
        const map = {};
        for (const item of inhouseRentals) {
            const id = String(item.equipmentId);
            const dates = item.rentalDates?.map(r => r.bookedDate) || [];
            map[id] = [...(map[id] || []), ...dates];
        }
        return map;
    }, [inhouseRentals]);

    const outsourcedRentals = rentals.outsourced || [];
    const inhouseCrew = crewData.inhouse || [];


    const outsourcedCrew = crewData.outsourced || [];
    const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const outstanding = (parseFloat(job.quotedPrice) || 0) - totalPaid;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">

            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/10 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => setOpen(true)}
                    className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                    <Menu size={16} />
                </button>
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
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{job.customer.fullName ?? '—'}</p>
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
                <CollapsibleCard items={inhouseRentals} emptyText="No in-house rental items added yet." renderItem={(p, i, arr) => (
                    <>
                        {i === 0 && (
                            <>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-xs text-gray-400">Total paid</span>
                                    <span className="font-mono text-xs font-semibold text-green-600">
                                        {fmtCurrency(arr.reduce((s, x) => s + parseFloat(x.totalCost || 0), 0))}
                                    </span>
                                </div>
                                <Divider />
                            </>
                        )}
                        <CostRow
                            primary={p.itemName}
                            secondary={`${fmtCurrency(p.unitCost)} × ${p.daysUsed} day(s)${p.rentalDates?.length ? ' · ' + p.rentalDates.map(r => fmtDate(r.bookedDate)).join(', ') : ''}`}
                            amount={p.totalCost}
                            amountClass="text-green-600"
                            onDelete={() => delInhouseRental.mutate(p.id)}
                            loading={delPayment.isPending}
                        />
                    </>
                )}
                />

                <SubSectionHeader title="Outsourced Rentals" actionLabel="+ Add" onAction={() => setModal('outsourced-rental')} />
                <CollapsibleCard items={outsourcedRentals} emptyText="No outsourced rental items added yet." renderItem={(item) => (
                    <CostRow key={item.id} primary={item.itemName || item.item_name}
                        secondary={`${item.supplierName || item.supplier_name} · qty ${item.quantity} · ${item.daysUsed || item.days_used} day(s)`}
                        amount={parseFloat(item.totalCost || item.total_cost)} amountClass="text-sky-600"
                        onDelete={() => delOutsourcedRental.mutate(item.id)} loading={delOutsourcedRental.isPending} />
                )} />

                <SubSectionHeader title="Inhouse Staff" actionLabel="+ Assign" onAction={() => setModal('crew-inhouse')} />
                <CollapsibleCard items={inhouseCrew} emptyText="No inhouse staff assigned yet." renderItem={(c) => (
                    <CostRow key={c.id} primary={c.staffName || c.name}
                        secondary={`${c.role || '—'} · paid: ${fmtCurrency(c.amountPaid || 0)} · outstanding: ${fmtCurrency(c.amountOutstanding || 0)}`}
                        amount={parseFloat(c.amountToPay)} amountClass="text-amber-600"
                        onDelete={() => delInhouseCrew.mutate(c.id)} loading={delInhouseCrew.isPending} />
                )} />

                <SubSectionHeader title="Outsourced Contractors" actionLabel="+ Add" onAction={() => setModal('crew-outsourced')} />
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
                <AddInhouseRentalForm
                    equipment={equipment}
                    equipmentBookedDates={equipmentBookedDates}
                    jobDateStart={job.eventDateStart}
                    jobDateEnd={job.eventDateEnd}
                    loading={addInhouseRental.isPending}
                    onClose={() => setModal(null)}
                    onSubmit={d => addInhouseRental.mutate(d)}
                />
            </Modal>
            <Modal title="Add Outsourced Rental" open={modal === 'outsourced-rental'} onClose={() => setModal(null)}>
                <AddOutsourcedRentalForm loading={addOutsourcedRental.isPending} onClose={() => setModal(null)} onSubmit={d => addOutsourcedRental.mutate(d)} />
            </Modal>
            <Modal title="Assign Inhouse Staff" open={modal === 'crew-inhouse'} onClose={() => setModal(null)}>
                <AddCrewForm
                    crewList={crewList}
                    assignedCrewCodes={inhouseCrew.map(c => c.crewId).filter(Boolean)}
                    jobDateStart={job.eventDateStart}
                    jobDateEnd={job.eventDateEnd}
                    loading={addCrew.isPending}
                    onClose={() => setModal(null)}
                    onSubmit={d => addCrew.mutate(d)}
                    lockedSource="inhouse"
                />
            </Modal>
            <Modal title="Add Outsourced Contractor" open={modal === 'crew-outsourced'} onClose={() => setModal(null)}>
                <AddCrewForm
                    crewList={crewList}
                    assignedCrewCodes={inhouseCrew.map(c => c.crewCode || c.staffCode || String(c.id)).filter(Boolean)}
                    jobDateStart={job.eventDateStart}
                    jobDateEnd={job.eventDateEnd}
                    loading={addCrew.isPending}
                    onClose={() => setModal(null)}
                    onSubmit={d => addCrew.mutate(d)}
                    lockedSource="outsourced"
                />
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