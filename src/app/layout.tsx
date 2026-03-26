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
            <body>
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
