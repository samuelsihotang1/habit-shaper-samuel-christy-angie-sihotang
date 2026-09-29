import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useTransition,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { useNavigate } from 'react-router';
import { Icon, type IconName } from '@/components/icons';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'dark' | 'secondary' | 'danger' | 'danger-soft' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-ink hover:bg-brand-strong',
  dark: 'bg-night text-white hover:bg-night-soft',
  secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-canvas',
  danger: 'bg-danger text-white hover:brightness-95',
  'danger-soft': 'bg-surface text-danger ring-1 ring-line hover:bg-danger-soft',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface',
};

/** A pill. `busy` disables it and shows a spinner while its request runs. */
export function Button({
  variant = 'primary',
  busy = false,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

/** A Button whose click runs `action` as its own transition: the spinner stays until the action settles. */
export function ActionButton({ action, ...props }: Omit<ComponentProps<typeof Button>, 'onClick' | 'busy'> & { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return <Button {...props} busy={pending} onClick={() => startTransition(action)} />;
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <span className={cx('animate-spin rounded-full border-2 border-current border-t-transparent', className)} aria-hidden />;
}

const ICON_BUTTON_TONES = { surface: 'bg-surface text-ink hover:bg-line/60', dark: 'bg-night text-white', brand: 'bg-brand text-ink hover:bg-brand-strong' };

/** A round icon-only button; `label` is its accessible name. */
export function IconButton({
  icon,
  label,
  tone = 'surface',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tone?: 'surface' | 'dark' | 'brand' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx('inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition', ICON_BUTTON_TONES[tone], className)}
    >
      <Icon name={icon} className="size-5" />
    </button>
  );
}

/** No radius here: `rounded-full` beside another `rounded-*` wins in Tailwind v4's output, so each field sets its own. */
const fieldClass = (error?: string) =>
  cx(
    'w-full border bg-surface py-3 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2',
    error ? 'border-danger focus:ring-danger/25' : 'border-line-strong focus:border-ink focus:ring-ink/10',
  );

function FieldFrame({ id, label, error, hint, className, children }: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block px-1 text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 px-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint ? <p className="mt-1.5 px-1 text-sm text-ink-muted">{hint}</p> : null
      )}
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  type = 'text',
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode }) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';

  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(fieldClass(error), 'rounded-full px-5', isPassword && 'pr-20')}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            className="absolute inset-y-0 right-0 cursor-pointer px-5 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </FieldFrame>
  );
}

export function TextArea({
  label,
  error,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(fieldClass(error), 'block min-h-32 resize-y rounded-2xl px-4 leading-relaxed')}
      />
    </FieldFrame>
  );
}

const ALERT_TONES = {
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  info: 'bg-brand-soft text-ink',
};

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-2xl px-4 py-3 text-sm font-medium', ALERT_TONES[tone])}>
      {children}
    </div>
  );
}

/** A white section on the canvas. No border: the reference separates by colour, not lines. */
export function Card({ title, description, action, className, children }: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx('rounded-3xl bg-surface p-5', className)}>
      {title || action ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-lg font-bold text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const NON_DIGITS = /\D/g;

/** A 6-digit authenticator code: numeric keyboard on phones, autofill from the OS. */
export function CodeField({ value, onChange, error, label = 'Authenticator code' }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(NON_DIGITS, '').slice(0, 6))}
      error={error}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="123456"
      maxLength={6}
      required
    />
  );
}

/** Two or three pill tabs; the active one is brand yellow. */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-full bg-surface p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx(
            'min-h-11 flex-1 cursor-pointer rounded-full px-4 text-base font-semibold transition',
            option.value === value ? 'bg-brand text-ink' : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The top of a sub-page: back arrow, centred title, one optional action. */
export function PageHeader({ title, back = -1, action }: { title: string; back?: string | -1; action?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="mb-6 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
      <IconButton icon="arrow-left" label="Back" onClick={() => void (back === -1 ? navigate(-1) : navigate(back))} />
      <h1 className="truncate text-center text-lg font-bold text-ink">{title}</h1>
      <div className="flex justify-end">{action}</div>
    </header>
  );
}

/** A modal question, drawn like the reference's delete dialog. Escape and the backdrop cancel. */
export function ConfirmDialog({ open, title, body, confirmLabel, tone = 'danger', icon = 'trash', busy, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'brand';
  icon?: IconName;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // Not a dependency below: a parent passing a new arrow each render would move focus back to Cancel.
  const onEscape = useEffectEvent(() => onCancel());

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/50 p-4 sm:items-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-3xl bg-surface p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={cx(
            'mx-auto flex size-16 items-center justify-center rounded-full ring-8',
            tone === 'danger' ? 'bg-danger text-white ring-danger-soft' : 'bg-brand text-ink ring-brand-soft',
          )}
        >
          <Icon name={icon} className="size-7" />
        </span>
        <h2 id={titleId} className="mt-5 text-xl font-bold text-ink">
          {title}
        </h2>
        <div className="mt-2 text-sm text-ink-muted">{body}</div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface px-6 py-10 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-ink">
        <Icon name={icon} className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** 0–1 as a thick rounded bar, brand on cream. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2.5 rounded-full bg-brand-soft">
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** 0–1 as a ring, for the dark hero cards. */
export function ProgressRing({ value, size = 56, children }: { value: number; size?: number; children?: ReactNode }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-brand transition-all"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - clamped)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{children}</span>
    </span>
  );
}
