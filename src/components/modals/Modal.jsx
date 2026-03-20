import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, open, onClose, children, width = 'max-w-lg' }) {
  const overlayRef = useRef();

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className={`bg-card border border-border rounded-2xl w-full ${width} shadow-2xl flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Field components
export function Field({ label, error, required, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-medium text-muted mb-1.5">
          {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

export function Input({ label, error, required, ...props }) {
  return (
    <Field label={label} error={error} required={required}>
      <input
        className="input-base text-sm w-full"
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, error, required, rows = 3, ...props }) {
  return (
    <Field label={label} error={error} required={required}>
      <textarea
        rows={rows}
        className="input-base text-sm w-full resize-none"
        {...props}
      />
    </Field>
  );
}

export function Select({ label, error, required, options = [], ...props }) {
  return (
    <Field label={label} error={error} required={required}>
      <select className="input-base text-sm w-full" {...props}>
        <option value="">Select…</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function FormRow({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function FormActions({ onClose, loading, submitLabel = 'Save' }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
      <button type="button" onClick={onClose}
        className="btn-ghost text-xs px-4 py-2">Cancel</button>
      <button type="submit" disabled={loading}
        className="btn-primary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
        {loading && <span className="w-3 h-3 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />}
        {loading ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
