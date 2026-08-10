import React from "react";
import { WarningCircle } from "phosphor-react";
import { Card } from "./Card";
import { SquircleLoader } from "./SquircleLoader";

export function RecruiterPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mr-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="text-sm font-medium text-[var(--brand-orange)]">{eyebrow}</p>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <Card className="flex min-h-40 items-center justify-center p-8" role="status" aria-live="polite">
      <span className="mr-3"><SquircleLoader size={20} label="Loading" /></span>
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 size-10 rounded-full border border-[var(--border-strong)] bg-[var(--bg-soft)]" aria-hidden="true" />
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function ErrorState({ title = "Something went wrong", description, action }: { title?: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="flex min-h-40 flex-col items-center justify-center border-red-500/20 p-8 text-center" role="alert">
      <WarningCircle className="size-7 text-[var(--status-danger)]" weight="fill" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

const statusStyles = {
  neutral: "border-white/10 bg-white/[0.04] text-gray-300",
  brand: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/20 bg-red-500/10 text-red-300",
  info: "border-blue-500/20 bg-blue-500/10 text-blue-300",
};

export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof statusStyles }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[tone]}`}>{children}</span>;
}

export function Field({
  label,
  description,
  error,
  required,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const generatedId = React.useId();
  const controlId = children.props.id || `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  return (
    <div>
      <label htmlFor={controlId} className="block text-sm font-medium text-gray-300">
        {label}{required && <span className="ml-1 text-[var(--brand-orange)]" aria-hidden="true">*</span>}
      </label>
      {description && <p id={descriptionId} className="mt-1 text-xs text-[var(--text-subtle)]">{description}</p>}
      <div className="mt-2">
        {React.cloneElement(children, {
          id: controlId,
          "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
          "aria-invalid": Boolean(error) || undefined,
        })}
      </div>
      {error && <p id={errorId} className="mt-1.5 text-xs text-[var(--status-danger)]">{error}</p>}
    </div>
  );
}

export const controlClassName = "powr-control w-full text-sm text-white placeholder:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50";
