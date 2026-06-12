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
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Sin alertas de stock">
                <Bell className="h-5 w-5" />
            </Link>
        );
    }

    return (
        <Link href="/admin/alerts"
            className={`relative p-2 rounded-xl transition ${critical > 0
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                    : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                }`}
            title={`${total} alerta${total !== 1 ? 's' : ''} de stock`}>

            <Bell className={`h-5 w-5 ${critical > 0 ? 'animate-pulse' : ''}`} />

            {/* Badge */}
            <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center text-white leading-none px-0.5 ${critical > 0 ? 'bg-red-500' : 'bg-yellow-500'
                }`}>
                {total > 99 ? '99+' : total}
            </span>
        </Link>
    );
}
