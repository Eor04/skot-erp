'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Boxes, ChartNoAxesCombined, Factory, LogOut, Package, Receipt, RefreshCw, Settings2, ShoppingCart, Store, User, Wallet } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { NotificationBell } from '@/components/notification-bell';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';

type Module = {
    href: string; title: string; description: string; Icon: ElementType;
    showWhen: (role: string, types: string[]) => boolean;
};

// Preserve the current home-page visibility rules. Authorization still lives on the server.
const ALL_MODULES: Module[] = [
    { href: '/acai', title: 'POS Açaí', description: 'Venta por peso y complementos', Icon: ShoppingCart,
      showWhen: (role, types) => ['MANAGER', 'CASHIER'].includes(role) && types.includes('ACAI') },
    { href: '/burgers', title: 'POS Hamburguesas', description: 'Productos, combos y modificadores', Icon: Store,
      showWhen: (role, types) => ['MANAGER', 'CASHIER'].includes(role) && types.includes('HAMBURGUESAS') },
    { href: '/cash-close', title: 'Cierre de caja', description: 'Turno y diferencias de caja', Icon: Wallet,
      showWhen: role => ['MANAGER', 'CASHIER'].includes(role) },
    { href: '/expenses', title: 'Gastos', description: 'Pagos operativos', Icon: Receipt,
      showWhen: role => ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE'].includes(role) },
    { href: '/factory', title: 'Almacén y fábrica', description: 'Producción y pedidos internos', Icon: Factory,
      showWhen: role => ['ADMIN'].includes(role) || role === 'WAREHOUSE' },
    { href: '/inventory', title: 'Inventario', description: 'Stock, alertas y transferencias', Icon: Package,
      showWhen: role => ['ADMIN', 'MANAGER', 'CASHIER'].includes(role) },
    { href: '/admin', title: 'Administración', description: 'Usuarios, sucursales y catálogo', Icon: Settings2,
      showWhen: role => ['ADMIN'].includes(role) },
];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrador', MANAGER: 'Gerente', CASHIER: 'Cajero', WAREHOUSE: 'Almacén',
};
type DayStats = { totalSales: number; totalOrders: number };
type AlertSummary = { critical: number; totalLowStock: number; totalExpiring: number };
type CashStatus = { openCount: number; branches: string[] };

export default function HomePage() {
    const { user, loading, logout } = useSession();
    const router = useRouter();
    const [dayStats, setDayStats] = useState<DayStats | null>(null);
    const [alertStats, setAlertStats] = useState<AlertSummary | null>(null);
    const [cashStatus, setCashStatus] = useState<CashStatus | null>(null);
    const [statsLoaded, setStatsLoaded] = useState(false);

    useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);

    const loadStats = async () => {
        if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const [salesRes, alertsRes, cashRes] = await Promise.all([
                fetch(`/api/admin/sales?from=${today}&to=${today}&limit=1`),
                fetch('/api/inventory/alerts'),
                fetch('/api/cash-close?limit=20'),
            ]);
            const [salesData, alertsData, cashData] = await Promise.all([
                salesRes.json(), alertsRes.json(), cashRes.json(),
            ]);
            if (salesData.success) {
                const items: any[] = salesData.data || [];
                setDayStats({
                    totalSales: salesData.summary?.totalRevenue ?? items.reduce((sum: number, item: any) => sum + (item.total ?? 0), 0),
                    totalOrders: salesData.pagination?.total ?? items.length,
                });
            }
            if (alertsData.success) {
                const { summary } = alertsData.data;
                setAlertStats({ critical: summary.critical ?? 0, totalLowStock: summary.totalLowStock ?? 0, totalExpiring: summary.totalExpiring ?? 0 });
            }
            if (cashData.success) {
                const opens = (cashData.data || []).filter((session: any) => session.sessionStatus === 'OPEN');
                setCashStatus({ openCount: opens.length, branches: opens.map((session: any) => session.branch?.name || '').filter(Boolean) });
            }
        } catch { /* The original dashboard leaves unavailable metrics empty. */ }
        finally { setStatsLoaded(true); }
    };

    useEffect(() => { if (user) loadStats(); }, [user]);

    const visibleModules = useMemo(() => user
        ? ALL_MODULES.filter(module => module.showWhen(user.role, user.branchTypes || []))
        : [], [user]);

    if (loading || !user) return <div data-brand="admin" className="skot-experience grid min-h-screen place-items-center" role="status">Cargando Skot ERP…</div>;

    const canSeeMetrics = user.role === 'ADMIN' || user.role === 'MANAGER';
    const showBell = canSeeMetrics || user.role === 'WAREHOUSE';
    const hasCritical = (alertStats?.critical ?? 0) > 0;

    return (
        <div data-brand="admin" className="skot-experience skot-dashboard lg:grid lg:grid-cols-[234px_minmax(0,1fr)]">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-3">Saltar al contenido</a>
            <aside className="border-b border-line-subtle bg-surface lg:min-h-screen lg:border-b-0 lg:border-r" aria-label="Navegación principal">
                <div className="flex items-center justify-between px-5 py-5 lg:py-7">
                    <Link href="/" className="flex items-center gap-3" aria-current="page">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-accent" aria-hidden="true"><Boxes size={20} /></span>
                        <span className="font-display text-lg font-bold leading-tight">SKOT <small className="block text-xs font-semibold tracking-wide">ERP</small></span>
                    </Link>
                    <span className="text-xs text-muted lg:hidden">{ROLE_LABELS[user.role]}</span>
                </div>
                <nav className="flex gap-1 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1" aria-label="Módulos disponibles">
                    <p className="hidden px-3 pb-2 text-xs font-semibold text-muted lg:block">Operación</p>
                    <Link href="/" aria-current="page" className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg bg-[var(--status-neutral-bg)] px-3 font-semibold text-brand lg:mb-2"><ChartNoAxesCombined size={18} /> Inicio</Link>
                    {visibleModules.map(module => <Link key={module.href} href={module.href}
                        className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-canvas">
                        <module.Icon size={18} aria-hidden="true" /> {module.title}
                    </Link>)}
                </nav>
                <div className="hidden border-t border-line-subtle px-6 py-5 text-sm lg:block">
                    <strong>{ROLE_LABELS[user.role]}</strong><p className="mt-1 text-muted">{user.name}</p>
                </div>
            </aside>

            <div className="min-w-0">
                <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-3 sm:px-8">
                    <span className="text-sm text-muted">Skot ERP <span aria-hidden="true">›</span> <strong className="text-ink">Inicio</strong></span>
                    <div className="flex items-center gap-2">
                        <StatusBadge>{user.role === 'ADMIN' ? 'Todas las sucursales' : `${user.branchIds.length} sucursal${user.branchIds.length === 1 ? '' : 'es'}`}</StatusBadge>
                        {showBell && <NotificationBell enabled />}
                        <Link href="/profile" aria-label={`Perfil de ${user.name}`} className="grid h-11 w-11 place-items-center rounded-lg border border-line-subtle bg-surface text-brand"><User size={19} /></Link>
                        <Button variant="quiet" onClick={logout} aria-label="Cerrar sesión" className="px-2"><LogOut size={18} /><span className="hidden sm:inline">Salir</span></Button>
                    </div>
                </header>

                <main id="main-content" className="mx-auto max-w-[1280px] space-y-6 px-4 py-7 sm:px-8">
                    <div><h1 className="text-2xl font-semibold sm:text-3xl">Operación de hoy</h1><p className="mt-1 text-muted">Accedé a las tareas y revisá el estado de la jornada.</p></div>
                    {canSeeMetrics && statsLoaded && <section aria-labelledby="summary-title">
                        <div className="mb-3 flex items-center justify-between"><h2 id="summary-title" className="text-lg font-semibold">Resumen</h2><Button variant="quiet" onClick={loadStats} className="text-sm"><RefreshCw size={16} /> Actualizar datos</Button></div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Card className="border-l-4 border-l-brand p-5 sm:col-span-2 xl:col-span-1"><p className="text-sm text-muted">Ventas del día</p><p className="mt-3 break-words font-display text-2xl font-semibold tabular-nums text-brand">{dayStats ? `Bs. ${dayStats.totalSales.toFixed(2)}` : 'Sin datos'}</p></Card>
                            <Card className="p-5"><p className="text-sm text-muted">Pedidos</p><p className="mt-3 font-display text-2xl font-semibold tabular-nums">{dayStats?.totalOrders ?? 'Sin datos'}</p></Card>
                            <Card className="p-5"><p className="text-sm text-muted">Cajas abiertas</p><p className="mt-3 font-display text-2xl font-semibold tabular-nums">{cashStatus?.openCount ?? 'Sin datos'}</p></Card>
                            <Card className="p-5"><p className="text-sm text-muted">Alertas críticas</p><p className={`mt-3 font-display text-2xl font-semibold tabular-nums ${hasCritical ? 'text-danger' : ''}`}>{alertStats?.critical ?? 'Sin datos'}</p></Card>
                        </div>
                    </section>}

                    {showBell && hasCritical && <Card className="border-l-4 border-l-danger p-5" role="status"><div className="flex flex-wrap items-center gap-3"><AlertTriangle className="text-danger" size={22} aria-hidden="true" /><div className="flex-1"><h2 className="font-semibold">Revisar alertas de stock</h2><p className="text-sm text-muted">{alertStats!.critical} producto{alertStats!.critical === 1 ? '' : 's'} sin stock.</p></div><Link href="/admin/alerts" className="font-semibold text-brand underline underline-offset-2">Ver alertas</Link></div></Card>}

                    <section aria-labelledby="modules-title"><h2 id="modules-title" className="mb-3 text-lg font-semibold">Ir a un módulo</h2>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleModules.map(module => <Link key={module.href} href={module.href} className="group flex min-h-28 items-start gap-4 rounded-xl border border-line-subtle bg-surface p-5 hover:border-brand focus-visible:border-brand">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--status-neutral-bg)] text-brand"><module.Icon size={20} aria-hidden="true" /></span>
                            <span className="min-w-0 flex-1"><strong className="block font-display text-base">{module.title}</strong><span className="mt-1 block text-sm text-muted">{module.description}</span></span><ArrowRight size={18} className="mt-2 text-muted group-hover:text-brand" aria-hidden="true" />
                        </Link>)}</div>
                    </section>

                    {canSeeMetrics && cashStatus && <Card className="flex flex-wrap items-center gap-3 p-5"><Wallet size={20} className="text-brand" aria-hidden="true" /><span className="flex-1 font-semibold">{cashStatus.openCount ? `Caja abierta en ${cashStatus.openCount} sucursal${cashStatus.openCount === 1 ? '' : 'es'}` : 'Sin cajas abiertas'}</span><Link href="/cash-close" className="text-sm font-semibold text-brand underline underline-offset-2">Ver caja</Link></Card>}
                </main>
            </div>
        </div>
    );
}
