import { useState } from "react";

// ─── mock data (replace with real API/props) ───────────────────────────────
const MOCK_JOB = {
    id: 1,
    jobTitle: "Wedding Setup – Grand Ballroom",
    status: "confirmed",
    quotedPrice: 8500,
    customerName: "Mr. & Mrs. Adeyemi",
    eventDateStart: "Jun 14, 2025",
    eventDateEnd: "Jun 16, 2025",
    setupDate: "Jun 13, 2025",
    notes: "Client wants ivory draping throughout. Extra lighting rig on south wall.",
    totalCrewCost: 1200,
    totalRentalCost: 2400,
    totalPurchaseCost: 380,
    totalOtherExpenses: 220,
    jobProfit: 4300,
    profitMargin: 50.6,
    totalAmountPaid: 5000,
    inhouseRentals: [
        { id: 1, itemName: "Truss System A", daysUsed: 3, unitCost: 150, totalCost: 450 },
        { id: 2, itemName: "LED Par Lights × 12", daysUsed: 3, unitCost: 60, totalCost: 180 },
        { id: 3, itemName: "Power Generator", daysUsed: 2, unitCost: 200, totalCost: 400 },
    ],
    outsourcedRentals: [
        { id: 1, itemName: "Stage Platform", supplierName: "Lagos AV Hire", quantity: 1, daysUsed: 3, totalCost: 900 },
        { id: 2, itemName: "Ivory Draping", supplierName: "ElegantDecor Ltd", quantity: 2, daysUsed: 1, totalCost: 470 },
    ],
    purchaseItems: [
        { id: 1, itemName: "Cable ties & gaffer tape", quantity: 10, totalCost: 45 },
        { id: 2, itemName: "Colour gels", quantity: 24, totalCost: 180 },
        { id: 3, itemName: "Extension leads", quantity: 4, totalCost: 155 },
    ],
    inhouseStaff: [
        { id: 1, staffName: "Chidi Okafor", role: "Lead Rigger", amountToPay: 300 },
        { id: 2, staffName: "Amaka Eze", role: "Lighting Tech", amountToPay: 250 },
    ],
    contractors: [
        { id: 1, contractorName: "Tunde Visuals", role: "Videographer", agreedAmount: 450, amountOutstanding: 150 },
        { id: 2, contractorName: "Foto by Seun", role: "Photographer", agreedAmount: 200, amountOutstanding: 0 },
    ],
    expenses: [
        { id: 1, notes: "Fuel for van", purpose: "Transport", amount: 60 },
        { id: 2, notes: "Meals on site", purpose: "Catering", amount: 80 },
        { id: 3, notes: "Parking permits", purpose: "Logistics", amount: 40 },
        { id: 4, notes: "Equipment cleaning", purpose: "Maintenance", amount: 40 },
    ],
    invoices: [
        { id: 1, invoiceNumber: "INV-2025-001", dueDate: "Jun 1, 2025", status: "PAID", amount: 5000 },
        { id: 2, invoiceNumber: "INV-2025-002", dueDate: "Jun 13, 2025", status: "PENDING", amount: 3500 },
    ],
    payments: [
        { id: 1, paymentDate: "May 28, 2025", method: "Bank transfer", amount: 3000 },
        { id: 2, paymentDate: "Jun 3, 2025", method: "Cash", amount: 2000 },
    ],
};

const STATUS_CONFIG = {
    planned: { label: "Planned", pill: "bg-blue-100 text-blue-700", chip: "bg-blue-50 text-blue-700 border-blue-200" },
    confirmed: { label: "Confirmed", pill: "bg-green-100 text-green-700", chip: "bg-green-50 text-green-700 border-green-200" },
    in_progress: { label: "In Progress", pill: "bg-amber-100 text-amber-700", chip: "bg-amber-50 text-amber-700 border-amber-200" },
    completed: { label: "Completed", pill: "bg-violet-100 text-violet-700", chip: "bg-violet-50 text-violet-700 border-violet-200" },
    cancelled: { label: "Cancelled", pill: "bg-rose-100 text-rose-700", chip: "bg-rose-50 text-rose-700 border-rose-200" },
};

const fmt = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);

// ─── small reusable pieces ─────────────────────────────────────────────────

function StatusPill({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
    return (
        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.pill}`}>
            {cfg.label}
        </span>
    );
}

function Divider() {
    return <div className="h-px bg-gray-100 dark:bg-white/5 my-0" />;
}

function SectionLabel({ children }) {
    return (
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 mt-4 mb-1.5">
            {children}
        </p>
    );
}

function Card({ children, className = "" }) {
    return (
        <div className={`bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 ${className}`}>
            {children}
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex justify-between items-start gap-3 py-2">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            <span className="text-xs text-gray-700 dark:text-gray-200 text-right">{value}</span>
        </div>
    );
}

function CostRow({ primary, secondary, amount, amountClass = "text-gray-700 dark:text-gray-200" }) {
    return (
        <>
            <div className="flex justify-between items-center py-2 gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{primary}</p>
                    {secondary && <p className="text-[10px] text-gray-400 mt-0.5">{secondary}</p>}
                </div>
                <span className={`font-mono text-xs shrink-0 ${amountClass}`}>{fmt(amount)}</span>
            </div>
            <Divider />
        </>
    );
}

function SubSectionHeader({ title, actionLabel = "+", onAction }) {
    return (
        <div className="flex justify-between items-center mt-3 mb-1 px-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            <button
                onClick={onAction}
                className="text-xs font-semibold text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-md px-2 py-1 transition-colors"
            >
                {actionLabel}
            </button>
        </div>
    );
}

function CollapsibleCard({ items = [], emptyText, previewCount = 3, renderItem, loading = false }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, previewCount);

    return (
        <Card>
            {loading ? (
                <div className="h-1 bg-sky-200 rounded animate-pulse" />
            ) : items.length === 0 ? (
                <p className="text-xs text-gray-400">{emptyText}</p>
            ) : (
                <>
                    {visible.map(renderItem)}
                    {items.length > previewCount && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs font-medium text-sky-500 hover:text-sky-600 pt-1 w-full text-left"
                        >
                            {expanded ? "Show less" : `Show all ${items.length}`}
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}

// ─── main detail component ─────────────────────────────────────────────────

export default function JobDetailPage({
    jobId,
    job: jobProp,
    onBack,
    onNavigateToEditJob,
    onNavigateToAssignEquipment,
    onNavigateToAssignCrew,
    onNavigateToAddPurchaseItem,
    onNavigateToAddExpense,
    onNavigateToManageInvoices,
    onNavigateToManagePayments,
    onNavigateToPhotos,
}) {
    // use prop if provided, else fall back to mock
    const [job, setJob] = useState(jobProp ?? MOCK_JOB);

    function updateStatus(newStatus) {
        setJob((j) => ({ ...j, status: newStatus }));
        // TODO: call your API here, e.g.:
        // updateMut.mutate({ id: job.id, data: { status: newStatus } });
    }

    const outstanding = job.quotedPrice - job.totalAmountPaid;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">

            {/* ── Topbar ── */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/10 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                    ← Back
                </button>
                <h1 className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {job.jobTitle}
                </h1>
                <button
                    onClick={onNavigateToEditJob}
                    className="text-sm font-medium text-sky-500 hover:text-sky-600 transition-colors"
                >
                    Edit
                </button>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-col gap-2 p-4 pb-10 mx-auto w-full">

                {/* Status + Header card */}
                <Card>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                            <StatusPill status={job.status} />
                            <p className="text-[11px] text-gray-400 mt-0.5">{job.jobTitle}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] text-gray-400">Quoted price</p>
                            <p className="font-mono text-xl font-semibold text-sky-500">{fmt(job.quotedPrice)}</p>
                        </div>
                    </div>
                    <Divider />
                    <DetailRow label="Customer" value={job.customerName ?? "—"} />
                    <Divider />
                    <DetailRow label="Event dates" value={`${job.eventDateStart} → ${job.eventDateEnd}`} />
                    <Divider />
                    <DetailRow label="Setup date" value={job.setupDate} />
                    {job.notes && (
                        <>
                            <Divider />
                            <DetailRow label="Notes" value={job.notes} />
                        </>
                    )}
                </Card>

                {/* Quick action chips */}
                <SectionLabel>Manage</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: "Equipment", icon: "📦", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700", onClick: onNavigateToAssignEquipment },
                        { label: "Crew", icon: "👥", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700", onClick: onNavigateToAssignCrew },
                        { label: "Photos", icon: "📷", color: "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700", onClick: onNavigateToPhotos },
                    ].map(({ label, icon, color, onClick }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-opacity hover:opacity-75 ${color}`}
                        >
                            <span className="text-lg">{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Cost breakdown */}
                <SectionLabel>Cost Breakdown</SectionLabel>
                <Card>
                    {[
                        { label: "Crew", amount: job.totalCrewCost, cls: "text-amber-600" },
                        { label: "Rentals", amount: job.totalRentalCost, cls: "text-blue-600" },
                        { label: "Purchases", amount: job.totalPurchaseCost, cls: "text-gray-700 dark:text-gray-200" },
                        { label: "Other", amount: job.totalOtherExpenses, cls: "text-gray-400" },
                    ].map(({ label, amount, cls }) => (
                        <div key={label}>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs text-gray-400">{label}</span>
                                <span className={`font-mono text-xs ${cls}`}>{fmt(amount)}</span>
                            </div>
                            <Divider />
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Net profit</span>
                        <div className="text-right">
                            <p className={`font-mono text-base font-semibold ${job.jobProfit >= 0 ? "text-green-600" : "text-rose-500"}`}>
                                {fmt(job.jobProfit)}
                            </p>
                            <p className="text-[10px] text-gray-400">{job.profitMargin}% margin</p>
                        </div>
                    </div>
                </Card>

                {/* Payment tiles */}
                <SectionLabel>Payment</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3">
                        <p className="text-[11px] text-green-600 mb-1">Paid</p>
                        <p className="font-mono text-base font-semibold text-green-700">{fmt(job.totalAmountPaid)}</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl p-3">
                        <p className="text-[11px] text-rose-500 mb-1">Outstanding</p>
                        <p className="font-mono text-base font-semibold text-rose-600">{fmt(outstanding)}</p>
                    </div>
                </div>

                {/* In-house rentals */}
                <SubSectionHeader title="In-House Rentals" onAction={onNavigateToAssignEquipment} />
                <CollapsibleCard
                    items={job.inhouseRentals}
                    emptyText="No in-house rental items added yet."
                    renderItem={(item) => (
                        <CostRow
                            key={item.id}
                            primary={item.itemName}
                            secondary={`${item.daysUsed} day(s) · ${fmt(item.unitCost)}/day`}
                            amount={item.totalCost}
                        />
                    )}
                />

                {/* Outsourced rentals */}
                <SubSectionHeader title="Outsourced Rentals" onAction={onNavigateToAssignEquipment} />
                <CollapsibleCard
                    items={job.outsourcedRentals}
                    emptyText="No outsourced rental items added yet."
                    renderItem={(item) => (
                        <CostRow
                            key={item.id}
                            primary={item.itemName}
                            secondary={`${item.supplierName} · qty ${item.quantity} · ${item.daysUsed} day(s)`}
                            amount={item.totalCost}
                        />
                    )}
                />

                {/* Purchase items */}
                <SubSectionHeader title="Purchase Items" onAction={onNavigateToAddPurchaseItem} />
                <CollapsibleCard
                    items={job.purchaseItems}
                    emptyText="No purchase items added yet."
                    renderItem={(item) => (
                        <CostRow
                            key={item.id}
                            primary={item.itemName}
                            secondary={`qty ${item.quantity}`}
                            amount={item.totalCost}
                        />
                    )}
                />

                {/* Inhouse staff */}
                <SubSectionHeader title="Inhouse Staff" onAction={onNavigateToAssignCrew} />
                <CollapsibleCard
                    items={job.inhouseStaff}
                    emptyText="No inhouse staff assigned yet."
                    renderItem={(s) => (
                        <CostRow
                            key={s.id}
                            primary={s.staffName}
                            secondary={`${s.role} · ${fmt(s.amountToPay)}`}
                            amount={s.amountToPay}
                        />
                    )}
                />

                {/* Contractors */}
                <SubSectionHeader title="Outsourced Contractors" onAction={onNavigateToAssignCrew} />
                <CollapsibleCard
                    items={job.contractors}
                    emptyText="No contractors assigned yet."
                    renderItem={(o) => (
                        <CostRow
                            key={o.id}
                            primary={o.contractorName}
                            secondary={`${o.role} · outstanding: ${fmt(o.amountOutstanding)}`}
                            amount={o.agreedAmount}
                        />
                    )}
                />

                {/* Expenses */}
                <SubSectionHeader title="Expenses" onAction={onNavigateToAddExpense} />
                <CollapsibleCard
                    items={job.expenses}
                    emptyText="No expenses logged yet."
                    previewCount={3}
                    renderItem={(e) => (
                        <CostRow key={e.id} primary={e.notes} secondary={e.purpose} amount={e.amount} />
                    )}
                />

                {/* Invoices */}
                <SubSectionHeader title="Invoices" actionLabel="Manage" onAction={onNavigateToManageInvoices} />
                <CollapsibleCard
                    items={job.invoices}
                    emptyText="No invoices created yet."
                    previewCount={2}
                    renderItem={(inv) => {
                        const iColor =
                            inv.status === "PAID" ? "bg-green-100 text-green-700"
                                : inv.status === "OVERDUE" ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700";
                        return (
                            <div key={inv.id}>
                                <div className="flex justify-between items-center py-2">
                                    <div>
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{inv.invoiceNumber}</p>
                                        <p className="text-[10px] text-gray-400">Due: {inv.dueDate}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${iColor}`}>
                                            {inv.status}
                                        </span>
                                        <span className="font-mono text-xs text-gray-700 dark:text-gray-200">{fmt(inv.amount)}</span>
                                    </div>
                                </div>
                                <Divider />
                            </div>
                        );
                    }}
                />

                {/* Payments */}
                <SubSectionHeader title="Payments" actionLabel="Manage" onAction={onNavigateToManagePayments} />
                <CollapsibleCard
                    items={job.payments}
                    emptyText="No payments recorded yet."
                    previewCount={3}
                    renderItem={(p, i, arr) => (
                        <div key={p.id}>
                            {i === 0 && (
                                <>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-xs text-gray-400">Total paid</span>
                                        <span className="font-mono text-xs font-semibold text-green-600">
                                            {fmt(arr.reduce((s, x) => s + x.amount, 0))}
                                        </span>
                                    </div>
                                    <Divider />
                                </>
                            )}
                            <div className="flex justify-between items-center py-2">
                                <div>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{p.paymentDate}</p>
                                    <p className="text-[10px] text-gray-400">{p.method}</p>
                                </div>
                                <span className="font-mono text-xs text-green-600">{fmt(p.amount)}</span>
                            </div>
                            <Divider />
                        </div>
                    )}
                />

                {/* Update status */}
                <SectionLabel>Update Status</SectionLabel>
                <div className="flex flex-wrap gap-2 px-1">
                    {Object.entries(STATUS_CONFIG)
                        .filter(([key]) => key !== job.status)
                        .map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => updateStatus(key)}
                                className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-opacity hover:opacity-75 ${cfg.chip}`}
                            >
                                {cfg.label}
                            </button>
                        ))}
                </div>

                {/* Notes */}
                {job.notes && (
                    <>
                        <SectionLabel>Notes</SectionLabel>
                        <Card>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{job.notes}</p>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}