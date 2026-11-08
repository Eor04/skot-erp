/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: 'var(--brand-primary)',
                'brand-secondary': 'var(--brand-secondary)',
                accent: 'var(--brand-accent)',
                canvas: 'var(--background)',
                surface: 'var(--surface)',
                ink: 'var(--foreground)',
                muted: 'var(--muted)',
                line: 'var(--border)',
                'line-subtle': 'var(--line-subtle)',
                success: 'var(--success)',
                warning: 'var(--warning)',
                danger: 'var(--error)',
                info: 'var(--info)',
            },
            fontFamily: {
                display: ['var(--font-lexend)', 'sans-serif'],
                body: ['var(--font-source-sans)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
