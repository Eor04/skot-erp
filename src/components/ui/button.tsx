import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Size = 'default' | 'touch';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
}

const variants: Record<Variant, string> = {
    primary: 'bg-brand text-white hover:brightness-90',
    secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
    quiet: 'text-brand hover:bg-canvas',
    danger: 'bg-danger text-white hover:brightness-90',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = 'primary', size = 'default', className = '', type = 'button', ...props }, ref,
) {
    return <button ref={ref} type={type} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${size === 'touch' ? 'min-h-12' : ''} ${variants[variant]} ${className}`} {...props} />;
});
