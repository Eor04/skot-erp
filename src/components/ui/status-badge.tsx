import type { HTMLAttributes } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info';
const tones: Record<Tone, string> = {
    neutral: 'bg-[var(--status-neutral-bg)] text-ink',
    success: 'bg-[var(--status-success-bg)] text-success',
    warning: 'bg-[var(--status-warning-bg)] text-warning',
    error: 'bg-[var(--status-error-bg)] text-danger',
    info: 'bg-[var(--status-info-bg)] text-info',
};

export function StatusBadge({ tone = 'neutral', className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`} {...props} />;
}
