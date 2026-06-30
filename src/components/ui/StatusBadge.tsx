import type { CSSProperties } from 'react';

interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'default';
}

const variantClasses = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
  default: 'bg-surface-muted text-content-muted',
};

const variantStyles: Record<string, CSSProperties> = {
  success: { backgroundColor: 'color-mix(in srgb, var(--color-status-success) 15%, transparent)' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-status-warning) 15%, transparent)' },
  error: { backgroundColor: 'color-mix(in srgb, var(--color-status-error) 15%, transparent)' },
};

export function StatusBadge({ label, variant = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
      style={variantStyles[variant]}
    >
      {label}
    </span>
  );
}
