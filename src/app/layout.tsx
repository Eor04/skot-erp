import type { Metadata } from 'next';
import './globals.css';
import './pase-de-cocina.css';
import { SessionProvider } from '@/lib/session-context';
import localFont from 'next/font/local';

const lexend = localFont({ src: '../assets/fonts/lexend-latin.woff2', variable: '--font-lexend', display: 'swap', weight: '100 900' });
const sourceSans = localFont({ src: '../assets/fonts/source-sans-3-latin.woff2', variable: '--font-source-sans', display: 'swap', weight: '200 900' });

export const metadata: Metadata = {
    title: 'Skot ERP',
    description: 'Sistema de gestión multi-sucursal para Skot Açaí y Burgers',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <head>
                {/* PWA */}
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#4f46e5" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Skot ERP" />
                <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                                        console.warn('SW registration failed:', err);
                                    });
                                });
                            }
                        `,
                    }}
                />
            </head>
            <body className={`${lexend.variable} ${sourceSans.variable}`}>
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
