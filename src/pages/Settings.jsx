import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, Tabs } from '../components/ui';
import { authApi } from '../api/endpoints';
import { Topbar } from '../components/layout';
import { useAuth } from '../hooks/useAuth';

import { Save, Shield } from 'lucide-react';

const InputField = ({ label, value, onChange, type = 'text', placeholder, disabled }) => (
  <div className="mb-4">
    <label className="text-xs font-medium text-muted block mb-1.5">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      className="input-base text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed" />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div className="mb-4">
    <label className="text-xs font-medium text-muted block mb-1.5">{label}</label>
    <select value={value} onChange={onChange} className="input-base text-sm w-full">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
    <div className="flex-1 pr-8">
      <p className="text-xs font-medium">{label}</p>
      {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
    </div>
    <button onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? 'bg-lime-400' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('profile');

  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    businessName: user?.businessName || '',
  });
  const [business, setBusiness] = useState({
    businessType: user?.businessType || 'individual',
    businessIndustry: user?.businessIndustry || 'other',
    businessSize: user?.businessSize || '1-5',
    businessLocation: user?.businessLocation || '',
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [notifs, setNotifs] = useState({
    paymentReminders: true,
    jobAlerts: true,
    crewPayments: true,
    leadFollowUps: false,
    monthlyReports: false,
  });

  const profileMut = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => toast.success('Profile updated'),
    onError: err => toast.error(err.message),
  });

  const passwordMut = useMutation({
    mutationFn: authApi.updatePassword,
    onSuccess: () => { toast.success('Password changed'); setPasswords({ current: '', newPass: '', confirm: '' }); },
    onError: err => toast.error(err.message),
  });

  const submitProfile = (e) => {
    e.preventDefault();
    if (!profile.fullName) return toast.error('Name is required');
    profileMut.mutate({ ...profile, ...business });
  };

  const submitPassword = (e) => {
    e.preventDefault();
    if (!passwords.current) return toast.error('Current password required');
    if (passwords.newPass.length < 8) return toast.error('New password must be 8+ characters');
    if (passwords.newPass !== passwords.confirm) return toast.error('Passwords do not match');
    passwordMut.mutate({ currentPassword: passwords.current, newPassword: passwords.newPass });
  };

  return (
    <>
      <Topbar title="Settings" subtitle="Account & preferences" />
      <div className="flex-1 overflow-y-auto p-5">
        <Tabs tabs={[
          { key: 'profile', label: 'Profile' },
          { key: 'business', label: 'Business' },
          { key: 'notifications', label: 'Notifications' },
          { key: 'security', label: 'Security' },
          { key: 'billing', label: 'Billing' },
        ]} active={tab} onChange={setTab} />

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <div className="">
            <Card title="Personal Information">
              <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-white/[0.02] border border-border/50">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lime-400 to-emerald-400 flex items-center justify-center text-bg text-xl font-bold shrink-0">
                  {user?.fullName?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                  <p className="text-[10px] text-lime-400 mt-0.5 font-medium capitalize">
                    {user?.role} · {user?.subscriptionPlan} plan
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-muted">Service Code</p>
                  <p className="text-xs font-mono mt-0.5">{user?.serviceCode}</p>
                </div>
              </div>
              <form onSubmit={submitProfile}>
                <div className="grid grid-cols-2 gap-x-4">
                  <InputField label="Full Name" value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} />
                  <InputField label="Email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} type="email" />
                  <InputField label="Phone" value={profile.phoneNumber} onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))} />
                  <InputField label="Business Name" value={profile.businessName} onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))} />
                </div>
                <button type="submit" disabled={profileMut.isPending}
                  className="btn-primary flex items-center gap-1.5 mt-2 disabled:opacity-50">
                  {profileMut.isPending && <span className="w-3 h-3 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />}
                  <Save size={12} />{profileMut.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* ── BUSINESS ── */}
        {tab === 'business' && (
          <div className="">
            <Card title="Business Details">
              <form onSubmit={submitProfile}>
                <div className="grid grid-cols-2 gap-x-4">
                  <InputField label="Service Code" value={user?.serviceCode || ''} disabled />
                  <SelectField label="Business Type" value={business.businessType}
                    onChange={e => setBusiness(b => ({ ...b, businessType: e.target.value }))}
                    options={[{ value: 'individual', label: 'Individual' }, { value: 'company', label: 'Company' }]} />
                  <SelectField label="Industry" value={business.businessIndustry}
                    onChange={e => setBusiness(b => ({ ...b, businessIndustry: e.target.value }))}
                    options={[
                      { value: 'film_video_production', label: 'Film & Video Production' },
                      { value: 'events', label: 'Events & Entertainment' },
                      { value: 'construction', label: 'Construction' },
                      { value: 'equipment_rental', label: 'Equipment Rental' },
                      { value: 'other', label: 'Other' },
                    ]} />
                  <SelectField label="Business Size" value={business.businessSize}
                    onChange={e => setBusiness(b => ({ ...b, businessSize: e.target.value }))}
                    options={[{ value: '1-5', label: '1–5' }, { value: '6-20', label: '6–20' }, { value: '21-50', label: '21–50' }, { value: '50+', label: '50+' }]} />
                </div>
                <InputField label="Business Location" value={business.businessLocation}
                  onChange={e => setBusiness(b => ({ ...b, businessLocation: e.target.value }))} placeholder="City, Country" />
                <button type="submit" disabled={profileMut.isPending}
                  className="btn-primary flex items-center gap-1.5 mt-2 disabled:opacity-50">
                  <Save size={12} />{profileMut.isPending ? 'Saving…' : 'Save Business Info'}
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 'notifications' && (
          <div className="">
            <Card title="Notification Preferences">
              <Toggle label="Payment Reminders" description="Get notified when outstanding payments are due" checked={notifs.paymentReminders} onChange={v => setNotifs(n => ({ ...n, paymentReminders: v }))} />
              <Toggle label="Job Alerts" description="Alerts for upcoming and in-progress jobs" checked={notifs.jobAlerts} onChange={v => setNotifs(n => ({ ...n, jobAlerts: v }))} />
              <Toggle label="Crew Payment Reminders" description="Remind yourself to pay crew members" checked={notifs.crewPayments} onChange={v => setNotifs(n => ({ ...n, crewPayments: v }))} />
              <Toggle label="Lead Follow-ups" description="Reminders to follow up on prospective clients" checked={notifs.leadFollowUps} onChange={v => setNotifs(n => ({ ...n, leadFollowUps: v }))} />
              <Toggle label="Monthly Reports" description="Receive monthly financial summary via email" checked={notifs.monthlyReports} onChange={v => setNotifs(n => ({ ...n, monthlyReports: v }))} />
            </Card>
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab === 'security' && (
          <div className=" space-y-5">
            <Card title="Change Password">
              <form onSubmit={submitPassword}>
                <InputField label="Current Password" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                <InputField label="New Password" type="password" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} placeholder="Minimum 8 characters" />
                <InputField label="Confirm Password" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
                <button type="submit" disabled={passwordMut.isPending}
                  className="btn-primary flex items-center gap-1.5 mt-2 disabled:opacity-50">
                  <Shield size={12} />{passwordMut.isPending ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </Card>
            <Card title="Danger Zone">
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <p className="text-sm font-medium text-rose-400 mb-1">Sign out of all devices</p>
                <p className="text-xs text-muted mb-3">This will sign you out of all active sessions.</p>
                <button onClick={() => { logout(); toast.success('Signed out'); }}
                  className="text-xs px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors">
                  Sign Out
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ── BILLING ── */}
        {tab === 'billing' && (
          <div className=" space-y-5">
            <Card title="Current Plan">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-border/50 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold capitalize">{user?.subscriptionPlan || 'Free'} Plan</p>
                    <p className="text-xs text-muted mt-0.5 capitalize">{user?.subscriptionStatus || 'Trialing'}</p>
                  </div>
                  <span className="text-xs bg-lime-400/10 text-lime-400 font-semibold px-2 py-1 rounded-lg">Active</span>
                </div>
                {user?.subscriptionExpiresAt && (
                  <p className="text-[10px] text-muted mt-3">Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Starter', price: '₦15,000', period: '/mo', features: ['Unlimited Jobs', '5 Users', 'Advanced Reports'] },
                  { name: 'Pro', price: '₦35,000', period: '/mo', features: ['Everything in Starter', '10 Users', 'Full Analytics', 'API Access'], popular: true },
                  { name: 'Enterprise', price: 'Custom', period: '', features: ['White Label', 'Unlimited Users', 'Dedicated Support'] },
                ].map(plan => (
                  <div key={plan.name} className={`card p-4 ${plan.popular ? 'border-lime-400/30' : ''}`}>
                    {plan.popular && <p className="text-[10px] font-semibold text-lime-400 mb-2">Most Popular</p>}
                    <p className="font-semibold text-sm">{plan.name}</p>
                    <p className="text-xl font-bold font-mono mt-1">{plan.price}<span className="text-xs text-muted font-normal">{plan.period}</span></p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map(f => (
                        <li key={f} className="text-[11px] text-muted flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-lime-400 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full mt-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${plan.popular ? 'btn-primary' : 'btn-ghost'}`}>
                      {plan.popular ? 'Upgrade Now' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
