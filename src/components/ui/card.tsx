import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
    return <section className={`rounded-xl border border-line-subtle bg-surface ${className}`} {...props} />;
}
