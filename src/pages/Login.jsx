import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/endpoints';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Eye, EyeOff, Building2, MapPin, DollarSign } from 'lucide-react';

// ── constants matching backend validation ─────────────────────────────────────
const INDUSTRIES = [
  { value: 'solar_energy', label: 'Solar & Renewable Energy' },
  { value: 'tailoring', label: 'Fashion Design/ Tailoring' },
  { value: 'electrical_plumbing_hvac', label: 'Electrical / Plumbing / HVAC' },
  { value: 'event_vendor', label: 'Event Vendors' },
  { value: 'construction_maintenance', label: 'Construction & Maintenance' },
  { value: 'teaching', label: 'Education' },
  { value: 'film_video_production', label: 'Film / Video Production' },
  { value: 'other', label: 'Other' },
];

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+'];

// ── tiny helpers ──────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <label className="block text-xs font-medium text-muted mb-1.5">{children}</label>
);

function TextInput({ icon: Icon, type = 'text', rightEl, ...props }) {
  return (
    <div className="relative mb-4">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <Icon size={15} />
        </div>
      )}
      <input
        type={type}
        className={`input-base w-full text-sm ${Icon ? 'pl-9' : ''} ${rightEl ? 'pr-10' : ''}`}
        {...props}
      />
      {rightEl && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
      )}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mb-4">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
        <Lock size={15} />
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input-base w-full text-sm pl-9 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function ChipSelector({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer font-medium
              ${active
                ? 'border-lime-500 bg-lime-500/10 text-lime-600 dark:text-lime-400'
                : 'border-border bg-transparent text-muted hover:border-lime-500/40 hover:text-text'
              }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SubmitBtn({ loading, children, onClick, type = 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2 rounded-xl"
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function LinkBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-lime-500 hover:text-lime-400 transition-colors cursor-pointer font-medium"
    >
      {children}
    </button>
  );
}

// Step indicator
function StepIndicator({ step, total, title, subtitle }) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-lg font-semibold text-text mb-0.5">{title}</h1>
      <p className="text-xs text-muted">
        Step {step} of {total} — {subtitle}
      </p>
      <div className="flex gap-1.5 justify-center mt-3">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i < step ? 'bg-lime-500 w-8' : 'bg-border w-4'
              }`}
          />
        ))}
      </div>
    </div>
  );
}

// OTP input
function OtpInput({ value, onChange }) {
  return (
    <div className="flex gap-2 justify-center mb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={ev => {
            const char = ev.target.value.replace(/\D/, '');
            const next = value.split('');
            next[i] = char;
            const joined = next.join('').slice(0, 6);
            onChange(joined);
            if (char && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
          }}
          onKeyDown={ev => {
            if (ev.key === 'Backspace' && !value[i] && i > 0)
              document.getElementById(`otp-${i - 1}`)?.focus();
          }}
          onPaste={ev => {
            ev.preventDefault();
            const pasted = ev.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            onChange(pasted);
            document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
          }}
          className="w-11 h-12 text-center text-lg font-mono font-semibold input-base"
        />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function LoginPage() {
  const { signin } = useAuth();
  const [view, setView] = useState('signin');
  const [loading, setLoading] = useState(false);

  // signin state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup step 1 — personal
  const [personal, setPersonal] = useState({
    fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
  });

  // signup step 2 — business
  const [business, setBusiness] = useState({
    businessName: '', businessLocation: '', businessIndustry: '',
    businessSize: '', monthlyRevenue: '',
  });

  // otp / token
  const [otp, setOtp] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const go = v => { setView(v); setOtp(''); };

  const setP = k => e => setPersonal(f => ({ ...f, [k]: e.target.value }));
  const setB = k => e => setBusiness(f => ({ ...f, [k]: e.target.value }));
  const setBv = k => v => setBusiness(f => ({ ...f, [k]: v }));

  // ── SIGN IN ────────────────────────────────────────────────────────────────
  const handleSignin = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await signin(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP STEP 1 validation → go to step 2 ────────────────────────────────
  const handleStep1 = e => {
    e.preventDefault();
    const { fullName, email, phoneNumber, password, confirmPassword } = personal;
    if (!fullName.trim() || fullName.trim().length < 2) return toast.error('Enter your full name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email');
    if (!/^\+?\d{9,19}$/.test(phoneNumber.replace(/\s/g, ''))) return toast.error('Enter a valid phone number');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    go('signup_step2');
  };

  // ── SIGNUP STEP 2 → submit ─────────────────────────────────────────────────
  const handleSignup = async e => {
    e.preventDefault();
    const { businessName, businessLocation, businessIndustry, businessSize } = business;
    if (!businessName.trim()) return toast.error('Enter your business name');
    if (!businessLocation.trim()) return toast.error('Enter your business location');
    if (!businessIndustry) return toast.error('Select your industry');
    if (!businessSize) return toast.error('Select your team size');

    setLoading(true);
    try {
      const res = await authApi.signup({
        ...personal,
        ...business,
        monthlyRevenue: business.monthlyRevenue ? Number(business.monthlyRevenue) : null,
        confirmPassword: undefined, // don't send to backend
      });
      setPendingToken(res?.data?.pendingToken || res?.pendingToken || '');
      toast.success(res?.message || 'Verification code sent!');
      go('signup_otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── VERIFY SIGNUP OTP ──────────────────────────────────────────────────────
  const handleVerifySignupOtp = async e => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      await authApi.verifySignupOtp({ pendingToken, otp });
      toast.success('Account created! Welcome.');
      window.location.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async purpose => {
    try {
      await authApi.resendOtp({ pendingToken, purpose });
      toast.success('New code sent!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  const handleForgot = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      toast.success('Reset code sent if account exists.');
      go('reset_otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async e => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const res = await authApi.verifyResetOtp({ email, otp });
      setResetToken(res?.data?.resetToken || res?.resetToken || '');
      go('reset_password');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async e => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPass) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ resetToken, password: newPassword });
      toast.success(res?.message || 'Password reset! Please sign in.');
      setNewPassword(''); setConfirmPass('');
      go('signin');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-9 h-9 rounded-xl bg-lime-500 flex items-center justify-center text-white font-bold text-base">O</div>
          <span className="text-xl font-semibold tracking-tight text-text">
            <span className="text-lime-500">Ops</span>Flow
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">

          {/* ── SIGN IN ── */}
          {view === 'signin' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-text">Sign in</h1>
                <p className="text-xs text-muted mt-0.5">Operations Management Platform</p>
              </div>
              <form onSubmit={handleSignin}>
                <Label>Email address</Label>
                <TextInput icon={Mail} type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <Label>Password</Label>
                <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <div className="flex justify-end mb-2">
                  <LinkBtn onClick={() => go('forgot')}>Forgot password?</LinkBtn>
                </div>
                <SubmitBtn loading={loading}>Sign in</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-4">
                No account? <LinkBtn onClick={() => go('signup_step1')}>Create one</LinkBtn>
              </p>
            </>
          )}

          {/* ── SIGNUP STEP 1 — Personal details ── */}
          {view === 'signup_step1' && (
            <>
              <StepIndicator step={1} total={2} title="Create Account" subtitle="Personal details" />
              <form onSubmit={handleStep1}>
                <Label>Full Name</Label>
                <TextInput icon={User} required value={personal.fullName}
                  onChange={setP('fullName')} placeholder="Your full name" />
                <Label>Email</Label>
                <TextInput icon={Mail} type="email" required value={personal.email}
                  onChange={setP('email')} placeholder="you@example.com" />
                <Label>Phone Number</Label>
                <TextInput icon={Phone} type="tel" required value={personal.phoneNumber}
                  onChange={setP('phoneNumber')} placeholder="+234 800 000 0000" />
                <Label>Password</Label>
                <PasswordInput value={personal.password} onChange={setP('password')} placeholder="Min. 8 characters" />
                <Label>Confirm Password</Label>
                <PasswordInput value={personal.confirmPassword} onChange={setP('confirmPassword')} placeholder="Repeat password" />
                <SubmitBtn loading={false} type="submit">Continue</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-4">
                Already have an account? <LinkBtn onClick={() => go('signin')}>Sign In</LinkBtn>
              </p>
            </>
          )}

          {/* ── SIGNUP STEP 2 — Business details ── */}
          {view === 'signup_step2' && (
            <>
              <StepIndicator step={2} total={2} title="Create Account" subtitle="Business details" />
              <form onSubmit={handleSignup}>
                <Label>Business Name</Label>
                <TextInput icon={Building2} required value={business.businessName}
                  onChange={setB('businessName')} placeholder="Your company name" />
                <Label>Business Location</Label>
                <TextInput icon={MapPin} required value={business.businessLocation}
                  onChange={setB('businessLocation')} placeholder="City, Country" />

                <Label>Industry *</Label>
                <ChipSelector
                  options={INDUSTRIES}
                  value={business.businessIndustry}
                  onChange={setBv('businessIndustry')}
                />

                <Label>Team Size *</Label>
                <ChipSelector
                  options={TEAM_SIZES}
                  value={business.businessSize}
                  onChange={setBv('businessSize')}
                />

                <Label>Monthly Revenue (optional)</Label>
                <TextInput icon={DollarSign} type="number" value={business.monthlyRevenue}
                  onChange={setB('monthlyRevenue')} placeholder="Monthly Revenue (optional)" />

                <SubmitBtn loading={loading}>Create Account</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-3">
                <LinkBtn onClick={() => go('signup_step1')}>← Go back</LinkBtn>
              </p>
            </>
          )}

          {/* ── SIGNUP OTP ── */}
          {view === 'signup_otp' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-text">Verify your email</h1>
                <p className="text-xs text-muted mt-1">
                  We sent a 6-digit code to{' '}
                  <span className="text-text font-medium">{personal.email}</span>
                </p>
              </div>
              <form onSubmit={handleVerifySignupOtp}>
                <OtpInput value={otp} onChange={setOtp} />
                <SubmitBtn loading={loading}>Verify & Create Account</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-3">
                Didn't get it?{' '}
                <LinkBtn onClick={() => handleResend('signup')}>Resend code</LinkBtn>
              </p>
              <p className="text-xs text-muted text-center mt-1">
                <LinkBtn onClick={() => go('signup_step2')}>← Go back</LinkBtn>
              </p>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-text">Reset password</h1>
                <p className="text-xs text-muted mt-0.5">We'll send a reset code to your email</p>
              </div>
              <form onSubmit={handleForgot}>
                <Label>Email address</Label>
                <TextInput icon={Mail} type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <SubmitBtn loading={loading}>Send reset code</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-4">
                <LinkBtn onClick={() => go('signin')}>← Back to sign in</LinkBtn>
              </p>
            </>
          )}

          {/* ── RESET OTP ── */}
          {view === 'reset_otp' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-text">Enter reset code</h1>
                <p className="text-xs text-muted mt-1">
                  Sent to <span className="text-text font-medium">{email}</span>
                </p>
              </div>
              <form onSubmit={handleVerifyResetOtp}>
                <OtpInput value={otp} onChange={setOtp} />
                <SubmitBtn loading={loading}>Verify code</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-3">
                <LinkBtn onClick={() => go('forgot')}>← Try different email</LinkBtn>
              </p>
            </>
          )}

          {/* ── RESET PASSWORD ── */}
          {view === 'reset_password' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-text">New password</h1>
                <p className="text-xs text-muted mt-0.5">Choose a strong password</p>
              </div>
              <form onSubmit={handleResetPassword}>
                <Label>New password</Label>
                <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
                <Label>Confirm new password</Label>
                <PasswordInput value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
                <SubmitBtn loading={loading}>Set new password</SubmitBtn>
              </form>
            </>
          )}

        </div>

        <p className="text-center text-xs text-muted/40 mt-6">OpsFlow · Operations Management</p>
      </div>
    </div>
  );
}