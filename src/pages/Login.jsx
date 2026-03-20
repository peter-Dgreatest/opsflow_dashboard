import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/endpoints';
import toast from 'react-hot-toast';

// ── tiny helpers ──────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <label className="block text-xs font-medium text-muted mb-1.5">{children}</label>
);
const TextInput = ({ ...props }) => (
  <input className="input-base w-full text-sm mb-4" {...props} />
);
const SubmitBtn = ({ loading, children }) => (
  <button type="submit" disabled={loading}
    className="btn-primary w-full py-2.5 text-sm justify-center flex items-center gap-2 disabled:opacity-50 mt-2">
    {loading && <span className="w-3.5 h-3.5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />}
    {loading ? 'Please wait…' : children}
  </button>
);
const LinkBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick}
    className="text-lime-400 hover:text-lime-300 transition-colors cursor-pointer font-medium">
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// VIEW STATES
//   signin          → email + password
//   signup          → full registration form
//   signup_otp      → enter the 6-digit code sent after signup
//   forgot          → enter email to receive reset OTP
//   reset_otp       → enter the reset OTP code
//   reset_password  → enter new password using the resetToken
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signin } = useAuth();
  const [view, setView] = useState('signin');
  const [loading, setLoading] = useState(false);

  // shared form state
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // signup extras
  const [signupForm, setSignupForm] = useState({
    fullName: '', phoneNumber: '', businessName: '',
    businessIndustry: 'other', businessSize: '1-5', businessLocation: '',
  });

  // OTP / token handoff
  const [otp,          setOtp]          = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [resetToken,   setResetToken]   = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');

  const go = (v) => { setView(v); setOtp(''); };

  // ── SIGN IN ──────────────────────────────────────────────────────────────
  const handleSignin = async (e) => {
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

  // ── SIGN UP step 1 — send OTP ─────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email and password are required');
    if (password.length < 8)  return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const res = await authApi.signup({
        email, password,
        ...signupForm,
        monthlyRevenue: null,
      });
      // backend returns { pendingToken }
      setPendingToken(res?.data?.pendingToken || res?.pendingToken || '');
      toast.success(res?.message || 'Verification code sent!');
      go('signup_otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── SIGN UP step 2 — verify OTP ───────────────────────────────────────────
  const handleVerifySignupOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const res = await authApi.verifySignupOtp({ pendingToken, otp });
      // backend sets cookies and returns { user }
      const u = res?.data?.user || res?.user;
      // AuthProvider's useEffect will pick up the new session via /auth/me,
      // but we can also trigger immediately by updating state via the event.
      window.dispatchEvent(new CustomEvent('auth:signin', { detail: u }));
      toast.success(res?.message || 'Account created! Welcome.');
      // force page reload so AuthProvider re-runs /auth/me and gets cookies
      window.location.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RESEND OTP ────────────────────────────────────────────────────────────
  const handleResend = async (purpose) => {
    try {
      await authApi.resendOtp({ pendingToken, purpose });
      toast.success('New code sent!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── FORGOT PASSWORD step 1 — request OTP ─────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      toast.success(res?.message || 'Reset code sent if account exists.');
      go('reset_otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD step 2 — verify OTP ──────────────────────────────────
  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const res = await authApi.verifyResetOtp({ email, otp });
      setResetToken(res?.data?.resetToken || res?.resetToken || '');
      toast.success(res?.message || 'Code verified.');
      go('reset_password');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD step 3 — set new password ────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8)          return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPass)      return toast.error('Passwords do not match');
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

  // ── OTP input — auto-advance, numbers only ────────────────────────────────
  const OtpInput = ({ value, onChange }) => (
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

  // ── SHELL ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-lime-400 flex items-center justify-center text-bg font-bold text-lg">O</div>
          <span className="text-xl font-semibold tracking-tight"><span className="text-lime-400">Ops</span>Flow</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">

          {/* ── SIGN IN ── */}
          {view === 'signin' && (
            <>
              <h1 className="text-base font-semibold mb-1">Sign in</h1>
              <p className="text-xs text-muted mb-5">Operations Management Platform</p>
              <form onSubmit={handleSignin}>
                <Label>Email address</Label>
                <TextInput type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <Label>Password</Label>
                <TextInput type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <div className="flex justify-end mb-2">
                  <LinkBtn onClick={() => go('forgot')}>Forgot password?</LinkBtn>
                </div>
                <SubmitBtn loading={loading}>Sign in</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-4">
                No account? <LinkBtn onClick={() => go('signup')}>Create one</LinkBtn>
              </p>
            </>
          )}

          {/* ── SIGN UP ── */}
          {view === 'signup' && (
            <>
              <h1 className="text-base font-semibold mb-1">Create account</h1>
              <p className="text-xs text-muted mb-5">We'll send a verification code to your email.</p>
              <form onSubmit={handleSignup}>
                <Label>Full name</Label>
                <TextInput required value={signupForm.fullName}
                  onChange={e => setSignupForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Your full name" />
                <Label>Email address</Label>
                <TextInput type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <Label>Phone number</Label>
                <TextInput value={signupForm.phoneNumber}
                  onChange={e => setSignupForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+234-800-000-0000" />
                <Label>Password</Label>
                <TextInput type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
                <Label>Business name</Label>
                <TextInput value={signupForm.businessName}
                  onChange={e => setSignupForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Your company or trading name" />
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <Label>Industry</Label>
                    <select value={signupForm.businessIndustry}
                      onChange={e => setSignupForm(f => ({ ...f, businessIndustry: e.target.value }))}
                      className="input-base text-sm w-full">
                      <option value="film_video_production">Film / Video</option>
                      <option value="events">Events</option>
                      <option value="equipment_rental">Equipment Rental</option>
                      <option value="construction">Construction</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Team size</Label>
                    <select value={signupForm.businessSize}
                      onChange={e => setSignupForm(f => ({ ...f, businessSize: e.target.value }))}
                      className="input-base text-sm w-full">
                      {['1-5','6-20','21-50','50+'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <Label>Location</Label>
                <TextInput value={signupForm.businessLocation}
                  onChange={e => setSignupForm(f => ({ ...f, businessLocation: e.target.value }))} placeholder="City, Country" />
                <SubmitBtn loading={loading}>Create account</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-4">
                Already have an account? <LinkBtn onClick={() => go('signin')}>Sign in</LinkBtn>
              </p>
            </>
          )}

          {/* ── SIGNUP OTP ── */}
          {view === 'signup_otp' && (
            <>
              <h1 className="text-base font-semibold mb-1">Verify your email</h1>
              <p className="text-xs text-muted mb-5">
                We sent a 6-digit code to <span className="text-text font-medium">{email}</span>.
                Enter it below to activate your account.
              </p>
              <form onSubmit={handleVerifySignupOtp}>
                <OtpInput value={otp} onChange={setOtp} />
                <SubmitBtn loading={loading}>Verify & create account</SubmitBtn>
              </form>
              <p className="text-xs text-muted text-center mt-3">
                Didn't get it?{' '}
                <LinkBtn onClick={() => handleResend('signup')}>Resend code</LinkBtn>
              </p>
              <p className="text-xs text-muted text-center mt-1">
                <LinkBtn onClick={() => go('signup')}>← Go back</LinkBtn>
              </p>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <h1 className="text-base font-semibold mb-1">Reset password</h1>
              <p className="text-xs text-muted mb-5">Enter your email and we'll send a reset code.</p>
              <form onSubmit={handleForgot}>
                <Label>Email address</Label>
                <TextInput type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
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
              <h1 className="text-base font-semibold mb-1">Enter reset code</h1>
              <p className="text-xs text-muted mb-5">
                A 6-digit code was sent to <span className="text-text font-medium">{email}</span>.
              </p>
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
              <h1 className="text-base font-semibold mb-1">New password</h1>
              <p className="text-xs text-muted mb-5">Choose a strong password for your account.</p>
              <form onSubmit={handleResetPassword}>
                <Label>New password</Label>
                <TextInput type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
                <Label>Confirm new password</Label>
                <TextInput type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
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
