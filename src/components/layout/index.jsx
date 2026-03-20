import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Briefcase, Users, HardDrive, Truck,
  CreditCard, Receipt, Bell, BarChart2, Settings,
  ChevronLeft, ChevronRight, UserCheck, TrendingUp, Search
} from 'lucide-react';

const NAV = [
  { key: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, accent: '#a3e635', section: 'main' },
  { key: 'jobs',       label: 'Jobs',        icon: Briefcase,       accent: '#38bdf8', section: 'main' },
  { key: 'leads',      label: 'Leads',       icon: TrendingUp,      accent: '#7dd3fc', section: 'main' },
  { key: 'customers',  label: 'Customers',   icon: Users,           accent: '#a78bfa', section: 'main' },
  { key: 'crew',       label: 'Crew',        icon: UserCheck,       accent: '#fb923c', section: 'operations' },
  { key: 'equipment',  label: 'Equipment',   icon: HardDrive,       accent: '#34d399', section: 'operations' },
  { key: 'vendors',    label: 'Vendors',     icon: Truck,           accent: '#f472b6', section: 'operations' },
  { key: 'payments',   label: 'Payments',    icon: CreditCard,      accent: '#4ade80', section: 'finance' },
  { key: 'expenses',   label: 'Expenses',    icon: Receipt,         accent: '#facc15', section: 'finance' },
  { key: 'reminders',  label: 'Reminders',   icon: Bell,            accent: '#fb7185', section: 'finance' },
  { key: 'reports',    label: 'Reports',     icon: BarChart2,       accent: '#e879f9', section: 'analytics' },
  { key: 'settings',   label: 'Settings',    icon: Settings,        accent: '#6b7280', section: 'analytics' },
];

const SECTIONS = [
  { key: 'main',       label: 'Main' },
  { key: 'operations', label: 'Operations' },
  { key: 'finance',    label: 'Finance' },
  { key: 'analytics',  label: 'Analytics' },
];

export function Sidebar({ active, onChange }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-52'} shrink-0 bg-card border-r border-border flex flex-col transition-all duration-200 overflow-hidden z-10`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-lime-400 flex items-center justify-center text-bg font-bold text-sm shrink-0">O</div>
        {!collapsed && <span className="font-semibold text-sm tracking-tight"><span className="text-lime-400">Ops</span>Flow</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        {SECTIONS.map(sec => {
          const items = NAV.filter(n => n.section === sec.key);
          return (
            <div key={sec.key} className="mb-1">
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted/50 px-2.5 py-1.5 mt-1">{sec.label}</p>
              )}
              {items.map(item => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <button key={item.key} onClick={() => onChange(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all duration-100 cursor-pointer mb-0.5
                      ${isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: isActive ? `${item.accent}18` : 'transparent' }}>
                      <Icon size={14} style={{ color: isActive ? item.accent : '#6b7280' }} />
                    </div>
                    {!collapsed && (
                      <span className={`text-xs ${isActive ? 'text-text font-medium' : 'text-muted'}`}>{item.label}</span>
                    )}
                    {!collapsed && item.key === 'reminders' && (
                      <span className="ml-auto text-[9px] bg-rose-500/20 text-rose-400 font-semibold px-1.5 py-0.5 rounded-full">5</span>
                    )}
                    {!collapsed && item.key === 'leads' && (
                      <span className="ml-auto text-[9px] bg-sky-500/20 text-sky-400 font-semibold px-1.5 py-0.5 rounded-full">2</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-border p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-400 to-emerald-400 flex items-center justify-center text-bg text-xs font-bold shrink-0">
              {(user?.fullName || 'U').slice(0,2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-muted capitalize">{user?.subscriptionPlan || 'free'} plan</p>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors text-xs cursor-pointer">
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={12} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
export function Topbar({ title, subtitle, actions }) {
  return (
    <header className="h-14 shrink-0 bg-card border-b border-border flex items-center gap-4 px-5">
      <div className="flex-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 bg-input border border-border rounded-lg px-3 py-1.5 w-44">
        <Search size={12} className="text-muted shrink-0" />
        <input placeholder="Search anything…" className="bg-transparent outline-none text-xs placeholder:text-muted text-text w-full" />
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
      <button className="w-7 h-7 rounded-lg bg-white/5 border border-border flex items-center justify-center text-muted hover:text-text hover:bg-white/10 transition-colors cursor-pointer">
        <Bell size={13} />
      </button>
    </header>
  );
}
