'use client';

/**
 * NotificationBell — Campana de alertas de stock con contador animado.
 * Se usa en el header del dashboard y otros layouts.
 */

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useStockAlerts } from '@/hooks/use-stock-alerts';
import { useSession } from '@/lib/session-context';

interface Props {
    /** Si es false, no hace polling (p.ej. para usuarios sin rol ADMIN/MANAGER) */
    enabled?: boolean;
}

export function NotificationBell({ enabled = true }: Props) {
    const { user } = useSession();
    // Obtener la sucursal del usuario si no es ADMIN, para ver solo las notificaciones de su sucursal.
    const branchId = user?.role !== 'ADMIN' && user?.branchIds?.length ? user.branchIds[0] : undefined;
    const { alerts } = useStockAlerts(enabled, branchId);

    const total = alerts?.total ?? 0;
    const critical = alerts?.critical ?? 0;

    if (!enabled || total === 0) {
        return (
            <Link href="/admin/alerts"
                className="relative grid h-11 w-11 place-items-center rounded-lg border border-line-subtle text-muted hover:bg-canvas"
                aria-label="Sin alertas de stock">
                <Bell className="h-5 w-5" />
            </Link>
        );
    }

    return (
        <Link href="/admin/alerts"
            className={`relative grid h-11 w-11 place-items-center rounded-lg border border-line-subtle ${critical > 0
                    ? 'text-danger hover:bg-[var(--status-error-bg)]'
                    : 'text-warning hover:bg-[var(--status-warning-bg)]'
                }`}
            aria-label={`${total} alerta${total !== 1 ? 's' : ''} de stock`}>

            <Bell className={`h-5 w-5 ${critical > 0 ? 'animate-pulse' : ''}`} />

            {/* Badge */}
            <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center text-white leading-none px-0.5 ${critical > 0 ? 'bg-danger' : 'bg-warning'
                }`}>
                {total > 99 ? '99+' : total}
            </span>
        </Link>
    );
}
