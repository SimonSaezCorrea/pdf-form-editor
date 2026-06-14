/* ─── primitives.jsx ────────────────────────────────────────────────────
   Button, IconButton, Input, Select, Modal, Tooltip, Kbd
   Plus inline Lucide-style SVG icons shared by the kit.
   Exports everything to window so other Babel scripts can use them.
   ──────────────────────────────────────────────────────────────────── */

const { useEffect, useState, useRef, useCallback } = React;

/* ── Icons (Lucide subset, 1.5–1.8 stroke, currentColor) ──────────── */
const Icon = ({ name, size = 16, ...rest }) => {
  const paths = {
    sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
    arrowLeft: <><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    help: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {paths[name]}
    </svg>
  );
};

/* ── Button ──────────────────────────────────────────────────────── */
const Button = React.forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  className = '',
  ...rest
}, ref) {
  const cls = [
    'btn',
    `btn--${variant}`,
    size === 'sm' ? 'btn--sm' : size === 'lg' ? 'btn--lg' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {icon && <span style={{display:'inline-flex'}}>{icon}</span>}
      {children}
    </button>
  );
});

/* ── IconButton ──────────────────────────────────────────────────── */
const IconButton = ({ icon, label, variant = 'default', size = 'md', className = '', ...rest }) => {
  const cls = [
    'icon-btn',
    size === 'sm' ? 'icon-btn--sm' : '',
    variant === 'active'  ? 'icon-btn--active'  : '',
    variant === 'navbar'  ? 'icon-btn--navbar'  : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button className={cls} aria-label={label} title={label} {...rest}>
      {icon}
    </button>
  );
};

/* ── Input ───────────────────────────────────────────────────────── */
const Input = ({ label, id, error, hint, className = '', ...rest }) => (
  <div className={`prop-group ${className}`}>
    {label && <label className="field-label-form" htmlFor={id}>{label}</label>}
    <input id={id} className={`field-input ${error ? 'field-input--error' : ''}`} {...rest} />
    {error && <span className="field-error">{error}</span>}
    {hint && !error && <span className="field-hint">{hint}</span>}
  </div>
);

/* ── Select ──────────────────────────────────────────────────────── */
const Select = ({ label, id, options, value, onChange, className = '' }) => (
  <div className={`prop-group ${className}`}>
    {label && <label className="field-label-form" htmlFor={id}>{label}</label>}
    <select id={id} className="field-input" value={value} onChange={onChange}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

/* ── Modal ───────────────────────────────────────────────────────── */
const Modal = ({ isOpen, onClose, title, footer, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-dialog" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="title">{title}</span>
          <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

/* ── Tooltip ─────────────────────────────────────────────────────── */
const Tooltip = ({ content, children }) => (
  <span className="tooltip-anchor">
    {children}
    <span className="tooltip-tip">{content}</span>
  </span>
);

/* ── Kbd ─────────────────────────────────────────────────────────── */
const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>;

Object.assign(window, { Icon, Button, IconButton, Input, Select, Modal, Tooltip, Kbd });
