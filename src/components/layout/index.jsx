import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import {
  LayoutDashboard, Briefcase, Users, HardDrive, Truck,
  CreditCard, Receipt, Bell, BarChart2, Settings,
  ChevronLeft, ChevronRight, UserCheck, TrendingUp, Search,
  Sun, Moon, Menu, X, HelpCircle,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#84cc16', section: 'main' },
  { key: 'jobs', label: 'Jobs', icon: Briefcase, accent: '#38bdf8', section: 'main' },
  { key: 'leads', label: 'Leads', icon: TrendingUp, accent: '#7dd3fc', section: 'main' },
  { key: 'customers', label: 'Customers', icon: Users, accent: '#a78bfa', section: 'main' },
  { key: 'crew', label: 'Crew', icon: UserCheck, accent: '#fb923c', section: 'operations' },
  { key: 'equipment', label: 'Equipment', icon: HardDrive, accent: '#34d399', section: 'operations' },
  { key: 'vendors', label: 'Vendors', icon: Truck, accent: '#f472b6', section: 'operations' },
  { key: 'payments', label: 'Payments', icon: CreditCard, accent: '#4ade80', section: 'finance' },
  { key: 'expenses', label: 'Expenses', icon: Receipt, accent: '#facc15', section: 'finance' },
  { key: 'reminders', label: 'Reminders', icon: Bell, accent: '#fb7185', section: 'finance' },
  { key: 'reports', label: 'Reports', icon: BarChart2, accent: '#e879f9', section: 'analytics' },
  { key: 'settings', label: 'Settings', icon: Settings, accent: '#6b7280', section: 'analytics' },
  { key: 'help', label: 'Help', icon: HelpCircle, accent: '#38bdf8', section: 'analytics' },
];

const SECTIONS = [
  { key: 'main', label: 'Main' },
  { key: 'operations', label: 'Operations' },
  { key: 'finance', label: 'Finance' },
  { key: 'analytics', label: 'Analytics' },
];

// ── Shared sidebar nav content ────────────────────────────────────────────────
function SidebarContent({ collapsed, onNavigate, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  const active = location.pathname.replace('/', '') || 'dashboard';

  const handleNav = (key) => {
    navigate(`/${key}`);
    onNavigate?.(); // close mobile drawer after navigating
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo row */}
      <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-lime-500 flex items-center justify-center text-white font-bold text-sm shrink-0">O</div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight text-text flex-1 min-w-0">
            <span className="text-lime-500">Ops</span>Flow
          </span>
        )}
        {/* X button only shown in mobile drawer mode */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-muted hover:text-text transition-colors cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        {SECTIONS.map(sec => {
          const items = NAV.filter(n => n.section === sec.key);
          return (
            <div key={sec.key} className="mb-1">
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted px-2.5 py-1.5 mt-1 opacity-50">
                  {sec.label}
                </p>
              )}
              {items.map(item => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all duration-100 cursor-pointer mb-0.5
                      ${isActive
                        ? 'bg-black/[0.06] dark:bg-white/[0.07]'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'}`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: isActive ? `${item.accent}20` : 'transparent' }}
                    >
                      <Icon size={14} style={{ color: isActive ? item.accent : 'var(--muted)' }} />
                    </div>
                    {!collapsed && (
                      <span className={`text-xs ${isActive ? 'text-text font-medium' : 'text-muted'}`}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.key === 'reminders' && (
                      <span className="ml-auto text-[9px] bg-rose-500/20 text-rose-500 font-semibold px-1.5 py-0.5 rounded-full">5</span>
                    )}
                    {!collapsed && item.key === 'leads' && (
                      <span className="ml-auto text-[9px] bg-sky-500/20 text-sky-500 font-semibold px-1.5 py-0.5 rounded-full">2</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer: theme + user */}
      <div className="border-t border-border p-2 space-y-1 shrink-0">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-muted hover:text-text transition-colors cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
        >
          {theme === 'dark'
            ? <Sun size={14} className="shrink-0" />
            : <Moon size={14} className="shrink-0" />
          }
          {!collapsed && (
            <span className="text-xs">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          )}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/5 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.fullName || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-text truncate">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-muted capitalize">{user?.subscriptionPlan || 'free'} plan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar (desktop static + mobile overlay) ─────────────────────────────────
export function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse sidebar on medium screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = e => setCollapsed(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close mobile drawer on route change
  const location = useLocation();
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  return (
    <>
      {/* ── Mobile: backdrop overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40
          transform transition-transform duration-250 ease-in-out
          md:hidden
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        <SidebarContent collapsed={false} onNavigate={onMobileClose} onClose={onMobileClose} />
      </aside>

      {/* ── Desktop: static collapsible sidebar ── */}
      <aside
        className={`
          hidden md:flex flex-col shrink-0
          bg-card border-r border-border
          transition-all duration-200 overflow-hidden z-10
          ${collapsed ? 'w-14' : 'w-52'}
        `}
      >
        <SidebarContent collapsed={collapsed} />
        {/* Collapse toggle */}
        <div className="border-t border-border p-2 shrink-0">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-muted hover:text-text hover:bg-black/[0.04] dark:hover:bg-white/5 rounded-lg transition-colors text-xs cursor-pointer"
          >
            {collapsed
              ? <ChevronRight size={14} />
              : <><ChevronLeft size={12} /><span>Collapse</span></>
            }
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
export function Topbar({ title, subtitle, actions, onMenuClick }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="h-14 shrink-0 bg-card border-b border-border flex items-center gap-3 px-4 md:px-5">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-text truncate">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted hidden sm:block">{subtitle}</p>}
      </div>

      {/* Search bar — hidden on small screens */}
      <div className="hidden sm:flex items-center gap-2 bg-input border border-border rounded-lg px-3 py-1.5 w-36 md:w-44">
        <Search size={12} className="text-muted shrink-0" />
        <input
          placeholder="Search…"
          className="bg-transparent outline-none text-xs placeholder:text-muted text-text w-full"
        />
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className="w-7 h-7 rounded-lg bg-input border border-border flex items-center justify-center text-muted hover:text-text transition-colors cursor-pointer shrink-0"
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>

      <button className="w-7 h-7 rounded-lg bg-input border border-border flex items-center justify-center text-muted hover:text-text transition-colors cursor-pointer shrink-0">
        <Bell size={13} />
      </button>
    </header>
  );
}