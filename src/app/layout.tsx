import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/lib/session-context';

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
            <body>
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
