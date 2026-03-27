import React from 'react';
import { Card } from '../components/ui';
import { Topbar } from '../components/layout';
import { useMobileMenu } from '../hooks/useMobileMenu';
import {
    BookOpen, PlayCircle, ArrowRight, LayoutDashboard, Briefcase,
    Users, CreditCard, Receipt, TrendingUp, Bell, Settings, HardDrive,
    Truck, BarChart2, UserCheck, Clock, CheckCircle, AlertCircle,
    ChevronRight, Search, Star, Zap, Target
} from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_STARTS = [
    {
        icon: Users,
        title: 'Add Your First Customer',
        description: 'Build your client database to start tracking jobs and payments.',
        path: '/customers',
        color: '#a78bfa',
        steps: ['Go to Customers → Add Customer', 'Enter name, phone, email', 'Save to create customer record'],
    },
    {
        icon: TrendingUp,
        title: 'Track a New Lead',
        description: 'Capture potential clients before they become paying customers.',
        path: '/leads',
        color: '#38bdf8',
        steps: ['Go to Leads → Add Lead', 'Enter client details & estimated value', 'Track status until conversion'],
    },
    {
        icon: Briefcase,
        title: 'Create Your First Job',
        description: 'Start managing projects from quote to completion.',
        path: '/jobs',
        color: '#84cc16',
        steps: ['Go to Jobs → New Job', 'Select customer & set dates', 'Track revenue, expenses & profit'],
    },
    {
        icon: CreditCard,
        title: 'Record a Payment',
        description: 'Keep track of all money coming in from clients.',
        path: '/payments',
        color: '#4ade80',
        steps: ['Go to Payments → Record Payment', 'Select job & enter amount', 'Choose payment method'],
    },
];

const MODULES = [
    { icon: LayoutDashboard, label: 'Dashboard', desc: 'Overview & KPIs', path: '/dashboard', color: '#84cc16' },
    { icon: Briefcase, label: 'Jobs', desc: 'Projects & Events', path: '/jobs', color: '#38bdf8' },
    { icon: TrendingUp, label: 'Leads', desc: 'Prospective Clients', path: '/leads', color: '#38bdf8' },
    { icon: Users, label: 'Customers', desc: 'Client Management', path: '/customers', color: '#a78bfa' },
    { icon: UserCheck, label: 'Crew', desc: 'Team & Payments', path: '/crew', color: '#fb923c' },
    { icon: HardDrive, label: 'Equipment', desc: 'Inventory', path: '/equipment', color: '#34d399' },
    { icon: Truck, label: 'Vendors', desc: 'Third-Party Services', path: '/vendors', color: '#f472b6' },
    { icon: CreditCard, label: 'Payments', desc: 'Income Tracking', path: '/payments', color: '#4ade80' },
    { icon: Receipt, label: 'Expenses', desc: 'Spending Log', path: '/expenses', color: '#facc15' },
    { icon: Bell, label: 'Reminders', desc: 'Follow-up Alerts', path: '/reminders', color: '#fb7185' },
    { icon: BarChart2, label: 'Reports', desc: 'Analytics', path: '/reports', color: '#e879f9' },
    { icon: Settings, label: 'Settings', desc: 'Account & Preferences', path: '/settings', color: '#6b7280' },
];

const TIPS = [
    {
        icon: Zap,
        title: 'Quick Navigation',
        tip: 'Use the sidebar to quickly switch between modules. The sidebar collapses on smaller screens.',
    },
    {
        icon: Target,
        title: 'Track Everything',
        tip: 'Log every payment and expense to get accurate profit calculations and reports.',
    },
    {
        icon: Bell,
        title: 'Set Reminders',
        tip: 'Never miss a follow-up. Create reminders for payments, meetings, and deadlines.',
    },
    {
        icon: TrendingUp,
        title: 'Convert Leads',
        tip: 'When a lead is ready, convert them to a customer with a job in one click.',
    },
    {
        icon: Star,
        title: 'Monitor Margins',
        tip: 'Keep your profit margins healthy. Green is 60%+, Yellow is 40-59%, Red is below 40%.',
    },
    {
        icon: CheckCircle,
        title: 'Update Status',
        tip: 'Always update job statuses as they progress to keep your dashboard accurate.',
    },
];

const FAQS = [
    {
        q: 'How do I reset my password?',
        a: 'Click "Forgot password?" on the login page. Enter your email and we\'ll send you a reset code.',
    },
    {
        q: 'How is profit calculated?',
        a: 'Profit = Total Revenue - Total Expenses. The system calculates this automatically for each job.',
    },
    {
        q: 'Can I use OpsFlow on my phone?',
        a: 'Yes! OpsFlow is mobile-responsive. You can also download the mobile app for a native experience.',
    },
    {
        q: 'How do I export my data?',
        a: 'Go to Reports and click "Export CSV" to download your data for any time period.',
    },
    {
        q: 'What\'s the difference between Leads and Customers?',
        a: 'Leads are prospective clients you\'re still pursuing. Customers are confirmed clients with active or completed jobs.',
    },
    {
        q: 'Can I link expenses to specific jobs?',
        a: 'Yes! When logging an expense, you can optionally select a related job to track job-specific costs.',
    },
];

export default function HelpPage() {
    const { setOpen } = useMobileMenu();
    const [expanded, setExpanded] = React.useState(null);

    return (
        <>
            <Topbar title="Help & How-To" subtitle="Learn how to use OpsFlow" onMenuClick={() => setOpen(true)} />
            <div className="flex-1 overflow-y-auto p-5">

                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Search help articles..."
                        className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-lime-500/50"
                    />
                </div>

                {/* Module Quick Links */}
                <Card title="All Modules" subtitle="Click any module to navigate directly" className="mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {MODULES.map(mod => (
                            <Link
                                key={mod.path}
                                to={mod.path}
                                className="flex flex-col items-center p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-border/50 hover:border-border transition-all group"
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                                    style={{ background: `${mod.color}15` }}
                                >
                                    <mod.icon size={18} style={{ color: mod.color }} />
                                </div>
                                <p className="text-xs font-medium text-text text-center">{mod.label}</p>
                                <p className="text-[10px] text-muted text-center mt-0.5">{mod.desc}</p>
                            </Link>
                        ))}
                    </div>
                </Card>

                {/* Quick Start Guides */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <PlayCircle size={16} className="text-lime-500" />
                        Quick Start Guides
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {QUICK_STARTS.map((qs, i) => (
                            <Card key={i} className="relative overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 w-full h-1"
                                    style={{ background: qs.color }}
                                />
                                <div className="flex items-start gap-3 mb-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: `${qs.color}15` }}
                                    >
                                        <qs.icon size={18} style={{ color: qs.color }} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold">{qs.title}</h4>
                                        <p className="text-xs text-muted mt-0.5">{qs.description}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5 mb-4">
                                    {qs.steps.map((step, j) => (
                                        <div key={j} className="flex items-center gap-2 text-xs text-muted">
                                            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-semibold">
                                                {j + 1}
                                            </span>
                                            {step}
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    to={qs.path}
                                    className="flex items-center gap-1 text-xs font-medium text-lime-500 hover:text-lime-400 transition-colors"
                                >
                                    Go to {(qs.label || '').replace('Your First ', '')}
                                    <ArrowRight size={12} />
                                </Link>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Pro Tips */}
                <Card title="Pro Tips" subtitle="Get more out of OpsFlow" className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {TIPS.map((tip, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-border/30"
                            >
                                <div className="w-8 h-8 rounded-lg bg-lime-500/10 flex items-center justify-center shrink-0">
                                    <tip.icon size={14} className="text-lime-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium mb-0.5">{tip.title}</p>
                                    <p className="text-[11px] text-muted leading-relaxed">{tip.tip}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* FAQ */}
                <Card title="Frequently Asked Questions" subtitle="Quick answers to common questions">
                    <div className="space-y-2">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className="border border-border/30 rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpanded(expanded === i ? null : i)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-sm font-medium pr-4">{faq.q}</span>
                                    <ChevronRight
                                        size={16}
                                        className={`text-muted shrink-0 transition-transform ${expanded === i ? 'rotate-90' : ''}`}
                                    />
                                </button>
                                {expanded === i && (
                                    <div className="px-4 pb-4 pt-0">
                                        <p className="text-xs text-muted leading-relaxed">{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Bottom Navigation */}
                <div className="mt-6 p-4 rounded-xl bg-lime-500/5 border border-lime-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center shrink-0">
                            <BookOpen size={18} className="text-lime-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">Full Documentation</p>
                            <p className="text-xs text-muted">Check out our comprehensive knowledge base for detailed guides.</p>
                        </div>
                        <a
                            href="/docs/KNOWLEDGE_BASE.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-xs flex items-center gap-1.5 shrink-0"
                        >
                            View Docs
                            <ArrowRight size={12} />
                        </a>
                    </div>
                </div>

            </div>
        </>
    );
}
