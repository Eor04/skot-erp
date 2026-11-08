'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Bell, ChevronDown, Clock, PackageOpen, RefreshCw, Store, Truck, XCircle } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

type AlertItem = {
    id: string; branchId: string; productId: string; currentStock: number; minStock: number;
    dailyAverage?: number; daysRemaining?: number | null; severity?: 'CRITICO' | 'ALTO' | 'MEDIO';
    product: { id: string; name: string; sku: string; type: string; unit: string };
    branch: { id: string; name: string };
};
type ExpiringItem = {
    id: string; branchId: string; productId: string; currentStock: number; expirationDate: string;
    product: { id: string; name: string; sku: string; type: string; unit: string };
    branch: { id: string; name: string };
};
type PendingOrder = { id: string; orderNumber: string; fromBranch: { name: string }; toBranch: { name: string } };
type PendingTransfer = { id: string; transferNumber: string; fromBranch: { name: string }; toBranch: { name: string } };
type Branch = { id: string; name: string; type: string };
type AlertData = {
    lowStock: AlertItem[];
    expiringSoon: ExpiringItem[];
    pendingOrders: PendingOrder[];
    pendingTransfers: PendingTransfer[];
    summary: { totalLowStock: number; totalExpiring: number; critical: number; totalPendingOrders: number; totalPendingTransfers: number };
};

const severity = {
    CRITICO: { label: 'Sin stock', tone: 'error' as const, Icon: XCircle },
    ALTO: { label: 'Crítico', tone: 'error' as const, Icon: AlertTriangle },
    MEDIO: { label: 'Bajo', tone: 'warning' as const, Icon: AlertTriangle },
};

function daysLabel(days: number | null | undefined) {
    if (days === null || days === undefined) return '—';
    if (days === 0) return 'Hoy';
    return `~${days}d`;
}

export default function AlertsPage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const initialBranch = user?.role !== 'ADMIN' && user?.branchIds?.length ? user.branchIds[0] : '';
    const [selectedBranch, setSelectedBranch] = useState(initialBranch);
    const [data, setData] = useState<AlertData | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        if (user?.role !== 'ADMIN' && user?.branchIds?.length) setSelectedBranch(user.branchIds[0]);
    }, [user]);
    useEffect(() => {
        fetch('/api/admin/branches').then(response => response.json()).then(result => {
            if (result.success) setBranches(result.data);
        });
    }, []);
    const loadAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const query = selectedBranch ? `?branchId=${selectedBranch}` : '';
            const response = await fetch(`/api/inventory/alerts${query}`);
            const result = await response.json();
            if (result.success) {
                setData(result.data);
                setLastUpdated(new Date());
            }
        } catch { /* La consulta conserva el último resultado disponible. */ }
        finally { setLoading(false); }
    }, [selectedBranch]);
    useEffect(() => { loadAlerts(); }, [loadAlerts]);

    const totalAlerts = (data?.summary.totalLowStock ?? 0) + (data?.summary.totalExpiring ?? 0)
        + (data?.summary.totalPendingOrders ?? 0) + (data?.summary.totalPendingTransfers ?? 0);

    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
            <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href="/admin" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver a administración</Link>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted"><Bell size={16} aria-hidden="true" /> Administración <span aria-hidden="true">›</span> Alertas de stock</div>
                    <h1 className="flex flex-wrap items-center gap-3 font-display text-2xl font-semibold sm:text-3xl">Alertas de stock {totalAlerts > 0 && <StatusBadge tone="error">{totalAlerts} pendientes</StatusBadge>}</h1>
                    <p className="mt-2 text-muted">Stock bajo, vencimientos y movimientos pendientes.
                        {lastUpdated && <span className="ml-2 text-sm">Actualizado a las {lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </p>
                </div>
                <Button variant="secondary" size="touch" onClick={loadAlerts} disabled={loading}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar</Button>
            </header>

            {user?.role === 'ADMIN' && <Card className="mb-6 p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><Store size={18} aria-hidden="true" /> Sucursal</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por sucursal">
                    <BranchFilter active={!selectedBranch} onClick={() => setSelectedBranch('')}>Todas</BranchFilter>
                    {branches.map(branch => <BranchFilter key={branch.id} active={selectedBranch === branch.id} onClick={() => setSelectedBranch(branch.id)}>{branch.name}</BranchFilter>)}
                </div>
            </Card>}

            {loading ? <Card className="flex items-center justify-center gap-3 p-16 text-muted" role="status"><RefreshCw size={21} className="animate-spin" aria-hidden="true" /> Cargando alertas…</Card>
                : data ? <>
                    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Resumen de alertas">
                        <Metric label="Sin stock" value={data.summary.critical} tone="error" />
                        <Metric label="Stock bajo" value={data.summary.totalLowStock - data.summary.critical} tone="warning" />
                        <Metric label="Por vencer" value={data.summary.totalExpiring} tone="warning" />
                        <Metric label="Pedidos pendientes" value={data.summary.totalPendingOrders} tone="info" />
                        <Metric label="Transferencias pendientes" value={data.summary.totalPendingTransfers} tone="info" />
                    </div>

                    <div className="space-y-4">
                        <AlertSection title="Pedidos internos pendientes" count={data.summary.totalPendingOrders} Icon={PackageOpen} defaultOpen={data.summary.totalPendingOrders > 0}>
                            {data.pendingOrders.length === 0 ? <Empty text="No tienes pedidos internos pendientes" /> : data.pendingOrders.map(order =>
                                <AlertRow key={order.id} Icon={PackageOpen} title={`Pedido #${order.orderNumber}`} detail={`De: ${order.fromBranch.name} → Para: ${order.toBranch.name}`}>
                                    <Link className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-brand hover:bg-canvas" href="/inventory/internal-orders">Revisar pedido</Link>
                                </AlertRow>)}
                        </AlertSection>
                        <AlertSection title="Transferencias pendientes" count={data.summary.totalPendingTransfers} Icon={Truck} defaultOpen={data.summary.totalPendingTransfers > 0}>
                            {data.pendingTransfers.length === 0 ? <Empty text="No tienes transferencias pendientes por aprobar" /> : data.pendingTransfers.map(transfer =>
                                <AlertRow key={transfer.id} Icon={Truck} title={`Transferencia #${transfer.transferNumber}`} detail={`Origen: ${transfer.fromBranch.name} → Destino: ${transfer.toBranch.name}`}>
                                    <Link className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-brand hover:bg-canvas" href="/inventory/transfers">Revisar transferencia</Link>
                                </AlertRow>)}
                        </AlertSection>
                        <AlertSection title="Stock bajo o agotado" count={data.summary.totalLowStock} Icon={AlertTriangle} defaultOpen>
                            {data.lowStock.length === 0 ? <Empty text="Todo el stock está en buen nivel" /> : data.lowStock.map(item => {
                                const config = severity[item.severity || 'MEDIO'];
                                return <AlertRow key={item.id} Icon={config.Icon} title={item.product.name} detail={`${item.branch.name} · SKU: ${item.product.sku}`}>
                                    <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                        <div><dt className="text-muted">Stock actual</dt><dd className="font-display font-semibold tabular-nums">{item.currentStock} {item.product.unit}</dd></div>
                                        <div><dt className="text-muted">Mínimo</dt><dd className="tabular-nums">{item.minStock} {item.product.unit}</dd></div>
                                        <div><dt className="text-muted">Días restantes</dt><dd className="tabular-nums">{daysLabel(item.daysRemaining)}</dd></div>
                                    </dl>
                                    <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                                </AlertRow>;
                            })}
                        </AlertSection>
                        <AlertSection title="Próximos a vencer (30 días)" count={data.summary.totalExpiring} Icon={Clock}>
                            {data.expiringSoon.length === 0 ? <Empty text="No hay productos próximos a vencer" /> : data.expiringSoon.map(item => {
                                const expiration = new Date(item.expirationDate);
                                const daysLeft = Math.ceil((expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return <AlertRow key={item.id} Icon={Clock} title={item.product.name} detail={`${item.branch.name} · SKU: ${item.product.sku}`}>
                                    <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                                        <div><dt className="text-muted">Stock</dt><dd className="font-display font-semibold tabular-nums">{item.currentStock} {item.product.unit}</dd></div>
                                        <div><dt className="text-muted">Vence</dt><dd>{expiration.toLocaleDateString('es-BO')}</dd></div>
                                    </dl>
                                    <StatusBadge tone={daysLeft <= 7 ? 'error' : 'warning'}>{daysLeft <= 0 ? 'Vencido' : `En ${daysLeft}d`}</StatusBadge>
                                </AlertRow>;
                            })}
                        </AlertSection>
                    </div>
                </> : <Card className="p-8 text-center text-muted" role="status">No se pudieron cargar las alertas. Usa Actualizar para volver a intentarlo.</Card>}
        </div>
    </main>;
}

function BranchFilter({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold ${active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-canvas'}`}>{children}</button>;
}
function Metric({ label, value, tone }: { label: string; value: number; tone: 'error' | 'warning' | 'info' }) {
    return <Card className="p-4"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p><StatusBadge tone={tone} className="mt-3">{value === 0 ? 'Sin pendientes' : 'Requiere atención'}</StatusBadge></Card>;
}
function AlertSection({ title, count, Icon, children, defaultOpen = false }: { title: string; count: number; Icon: typeof Bell; children: ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return <section>
        <button type="button" aria-expanded={open} onClick={() => setOpen(previous => !previous)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line-subtle bg-surface px-4 py-3 text-left hover:border-brand">
            <Icon size={20} className="shrink-0 text-brand" aria-hidden="true" /><span className="min-w-0 flex-1 font-display font-semibold">{title}</span>
            {count > 0 && <StatusBadge tone="error">{count}</StatusBadge>}<ChevronDown size={19} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && <div className="mt-2 space-y-2">{children}</div>}
    </section>;
}
function AlertRow({ Icon, title, detail, children }: { Icon: typeof Bell; title: string; detail: string; children: ReactNode }) {
    return <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3"><Icon size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><div className="min-w-0"><h3 className="break-words font-semibold">{title}</h3><p className="mt-1 break-words text-sm text-muted">{detail}</p></div></div>
        <div className="flex w-full flex-wrap items-center gap-4 sm:w-auto">{children}</div>
    </Card>;
}
function Empty({ text }: { text: string }) {
    return <Card className="p-8 text-center text-muted">{text}</Card>;
}
