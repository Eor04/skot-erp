'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    AlertTriangle, ArrowLeft, ArrowLeftRight, BarChart2, CheckCircle, ChevronRight,
    ClipboardList, Factory, FileText, Loader2, Package, PackagePlus, RefreshCw,
    Send, SlidersHorizontal, Trash2, TrendingUp, XCircle, type LucideIcon,
} from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

interface StockItem {
    id: string;
    productId: string;
    product: { id: string; name: string; sku: string; type: string; unit: string; category: string | null };
    branch: { id: string; name: string };
    currentStock: number;
    minStock: number;
    maxStock: number | null;
    isLow: boolean;
    isCritical: boolean;
    lastUpdated: string;
    status: string;
}
interface Summary { total: number; low: number; critical: number; ok: number }
type StockFilter = 'ALL' | 'LOW' | 'CRITICAL' | 'OK';
type Module = { href: string; title: string; description: string; Icon: LucideIcon };

const adminModules: Module[] = [
    { href: '/inventory/stock', title: 'Stock por sucursal', description: 'Ver y monitorear el inventario de cada sucursal', Icon: BarChart2 },
    { href: '/inventory/transfers', title: 'Transferencias', description: 'Gestionar y aprobar transferencias entre sucursales', Icon: ArrowLeftRight },
    { href: '/inventory/transfers/request', title: 'Solicitar transferencia', description: 'Pedir productos de otra sucursal o fábrica', Icon: Send },
    { href: '/inventory/kardex', title: 'Kardex', description: 'Ver historial de movimientos', Icon: FileText },
    { href: '/inventory/suggestions', title: 'Sugerencias de reabasto', description: 'Análisis predictivo de stock', Icon: TrendingUp },
    { href: '/inventory/internal-orders', title: 'Pedidos internos', description: 'Solicitudes de stock a la fábrica', Icon: Package },
    { href: '/inventory/mermas', title: 'Registro de merma', description: 'Dar de baja stock por daño, vencimiento u otros', Icon: Trash2 },
    { href: '/inventory/adjustments', title: 'Ajuste de stock', description: 'Entrada, salida o corrección manual de inventario', Icon: SlidersHorizontal },
];

const factoryModules: Module[] = [
    { href: '/factory/receiving', title: 'Recepción de mercancía', description: 'Registrar ingreso de productos desde proveedores', Icon: PackagePlus },
    { href: '/factory', title: 'Dashboard fábrica', description: 'Resumen de producción, KPI y últimas órdenes', Icon: Factory },
    { href: '/factory/production', title: 'Órdenes de producción', description: 'Ver y gestionar órdenes activas y programadas', Icon: ClipboardList },
    { href: '/factory/production/new', title: 'Nueva orden', description: 'Crear una nueva orden de producción', Icon: TrendingUp },
    { href: '/factory/recipes', title: 'Recetas (BOM)', description: 'Gestionar recetas y lista de materiales', Icon: FileText },
    { href: '/factory/materials', title: 'Materia prima', description: 'Stock de ingredientes y materiales en almacén', Icon: Package },
    { href: '/inventory/transfers', title: 'Transferencias', description: 'Enviar stock a sucursales o recibir desde ellas', Icon: ArrowLeftRight },
    { href: '/inventory/internal-orders', title: 'Pedidos internos', description: 'Atender pedidos de stock de las sucursales', Icon: Send },
    { href: '/inventory/kardex', title: 'Kardex', description: 'Historial de entradas y salidas de inventario', Icon: BarChart2 },
    { href: '/inventory/adjustments', title: 'Ajuste de stock', description: 'Corrección manual de inventario en almacén', Icon: SlidersHorizontal },
];

function InventoryFrame({ title, description, context, action, children }: {
    title: string; description: string; context?: string; action?: ReactNode; children: ReactNode;
}) {
    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
            <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver al inicio</Link>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted"><Package size={16} aria-hidden="true" /> Inventario {context && <><ChevronRight size={14} aria-hidden="true" /><span>{context}</span></>}</div>
                    <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
                    <p className="mt-2 text-muted">{description}</p>
                </div>
                {action}
            </header>
            {children}
        </div>
    </main>;
}

function ModuleGrid({ modules }: { modules: Module[] }) {
    return <nav aria-label="Accesos de inventario" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map(({ href, title, description, Icon }) => <Link key={href} href={href}
            className="group flex min-h-28 items-start gap-4 rounded-xl border border-line-subtle bg-surface p-5 hover:border-brand">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--status-neutral-bg)] text-brand"><Icon size={21} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><strong className="block font-display text-base">{title}</strong><span className="mt-1 block text-sm text-muted">{description}</span></span>
            <ChevronRight size={18} className="mt-3 shrink-0 text-muted group-hover:text-brand" aria-hidden="true" />
        </Link>)}
    </nav>;
}

function CashierInventoryView({ branchId, branchName }: { branchId: string; branchName: string }) {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<StockFilter>('ALL');

    const loadStock = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/stock?branchId=${branchId}`).then(response => response.json());
            if (res.success) { setStock(res.data); setSummary(res.summary); }
        } finally { setLoading(false); }
    }, [branchId]);
    useEffect(() => { if (branchId) loadStock(); }, [branchId, loadStock]);

    const filtered = stock.filter(item => {
        const query = search.toLowerCase();
        const name = item.product?.name ?? '';
        const sku = item.product?.sku ?? '';
        const matchSearch = name.toLowerCase().includes(query) || sku.toLowerCase().includes(query);
        const matchFilter = filter === 'ALL' ? true
            : filter === 'CRITICAL' ? item.isCritical
            : filter === 'LOW' ? item.isLow && !item.isCritical
            : !item.isLow;
        return matchSearch && matchFilter;
    });

    const metrics: { label: string; value: number; valueFilter: StockFilter; tone: string }[] = summary ? [
        { label: 'Total ítems', value: summary.total, valueFilter: 'ALL', tone: 'text-brand' },
        { label: 'Stock OK', value: summary.ok, valueFilter: 'OK', tone: 'text-success' },
        { label: 'Stock bajo', value: summary.low, valueFilter: 'LOW', tone: 'text-warning' },
        { label: 'Sin stock', value: summary.critical, valueFilter: 'CRITICAL', tone: 'text-danger' },
    ] : [];

    return <InventoryFrame title="Mi sucursal" description="Consultá el stock y gestioná solicitudes desde tu sucursal." context={branchName}
        action={<Button variant="secondary" size="touch" onClick={loadStock} disabled={loading}><RefreshCw size={18} aria-hidden="true" /> Actualizar</Button>}>
        <div className="space-y-6">
            <ModuleGrid modules={[
                { href: '/inventory/transfers', title: 'Transferencias entre sucursales', description: 'Solicitar o confirmar envíos de stock', Icon: ArrowLeftRight },
                { href: '/inventory/internal-orders', title: 'Pedidos a fábrica', description: 'Solicitar productos al área de producción', Icon: Factory },
            ]} />

            {summary && <section aria-label="Resumen de stock" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metrics.map(metric => <button key={metric.valueFilter} type="button" aria-pressed={filter === metric.valueFilter}
                    onClick={() => setFilter(metric.valueFilter)}
                    className={`min-h-28 rounded-xl border bg-surface p-4 text-left hover:border-brand ${filter === metric.valueFilter ? 'border-brand ring-1 ring-brand' : 'border-line-subtle'}`}>
                    <span className="block text-sm text-muted">{metric.label}</span>
                    <strong className={`mt-2 block font-display text-3xl tabular-nums ${metric.tone}`}>{metric.value}</strong>
                </button>)}
            </section>}

            {summary && (summary.critical > 0 || summary.low > 0) && <Card className="flex flex-wrap items-center gap-3 border-l-4 border-l-warning p-4" role="status">
                <AlertTriangle size={20} className={summary.critical > 0 ? 'text-danger' : 'text-warning'} aria-hidden="true" />
                <div className="min-w-0 flex-1"><strong>{summary.critical > 0
                    ? `${summary.critical} producto${summary.critical === 1 ? '' : 's'} sin stock`
                    : `${summary.low} producto${summary.low === 1 ? '' : 's'} con stock bajo`}</strong>
                    <p className="mt-1 text-sm text-muted">Considerá hacer un pedido a fábrica o solicitar una transferencia.</p>
                </div>
                <Link href="/inventory/internal-orders" className="font-semibold text-brand underline underline-offset-2">Pedir a fábrica</Link>
            </Card>}

            <section aria-labelledby="stock-list-title">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div><h2 id="stock-list-title" className="font-display text-xl font-semibold">Stock de {branchName}</h2>
                        <p className="mt-1 text-sm text-muted">{filtered.length} producto{filtered.length === 1 ? '' : 's'} en esta vista</p></div>
                    <div className="w-full sm:w-80"><label htmlFor="inventory-search" className="mb-1 block text-sm font-semibold">Buscar producto o SKU</label>
                        <input id="inventory-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
                            placeholder="Nombre o SKU" className="min-h-12 w-full rounded-lg border border-line bg-surface px-4 text-ink placeholder:text-muted" /></div>
                </div>
                <Card className="overflow-hidden">
                    {loading ? <div className="flex items-center justify-center gap-3 p-12 text-muted" role="status"><Loader2 size={22} className="animate-spin" aria-hidden="true" /> Cargando stock…</div>
                        : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
                            <thead className="bg-canvas text-muted"><tr><th scope="col" className="px-4 py-3 text-left">Producto</th><th scope="col" className="px-4 py-3 text-left">SKU</th><th scope="col" className="px-4 py-3 text-right">Stock</th><th scope="col" className="px-4 py-3 text-right">Mín.</th><th scope="col" className="px-4 py-3 text-left">Estado</th></tr></thead>
                            <tbody>{filtered.map(item => <tr key={item.id} className="border-t border-line-subtle hover:bg-canvas">
                                <th scope="row" className="break-words px-4 py-3 text-left font-semibold">{item.product?.name ?? '—'}</th>
                                <td className="px-4 py-3 font-mono text-xs text-muted">{item.product?.sku ?? '—'}</td>
                                <td className="px-4 py-3 text-right font-semibold tabular-nums">{item.currentStock} <span className="font-normal text-muted">{item.product?.unit ?? ''}</span></td>
                                <td className="px-4 py-3 text-right tabular-nums text-muted">{item.minStock}</td>
                                <td className="px-4 py-3">{item.isCritical ? <StatusBadge tone="error"><XCircle size={14} className="mr-1" aria-hidden="true" /> Sin stock</StatusBadge>
                                    : item.isLow ? <StatusBadge tone="warning"><AlertTriangle size={14} className="mr-1" aria-hidden="true" /> Bajo</StatusBadge>
                                    : <StatusBadge tone="success"><CheckCircle size={14} className="mr-1" aria-hidden="true" /> OK</StatusBadge>}</td>
                            </tr>)}</tbody>
                        </table>{filtered.length === 0 && <p className="border-t border-line-subtle p-8 text-center text-muted">No se encontraron productos.</p>}</div>}
                </Card>
            </section>

            <Card className="flex gap-3 p-4 text-sm text-info"><ClipboardList size={20} className="shrink-0" aria-hidden="true" />
                <p>Solo ves el stock de tu sucursal. Para ajustes, contactá a tu administrador. Podés solicitar productos desde{' '}
                    <Link href="/inventory/internal-orders" className="font-semibold underline">Pedidos a fábrica</Link> o pedir traslados desde{' '}
                    <Link href="/inventory/transfers" className="font-semibold underline">Transferencias</Link>.</p>
            </Card>
        </div>
    </InventoryFrame>;
}

function AdminInventoryView() {
    return <InventoryFrame title="Gestión de inventario" description="Stock, transferencias y ajustes entre sucursales.">
        <div className="space-y-6"><ModuleGrid modules={adminModules} />
            <Card className="border-l-4 border-l-brand p-5"><h2 className="font-semibold">Sugerencias de reabasto</h2>
                <p className="mt-1 text-sm text-muted">El sistema calcula días restantes a partir del promedio de ventas para orientar el reabastecimiento.</p>
                <Link href="/inventory/suggestions" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-2">Ver sugerencias</Link>
            </Card>
        </div>
    </InventoryFrame>;
}

function FactoryInventoryView({ branchName }: { branchName: string }) {
    return <InventoryFrame title="Panel de fábrica" description="Producción, materia prima y pedidos internos." context={branchName}>
        <div className="space-y-6"><ModuleGrid modules={factoryModules} />
            <Card className="flex gap-3 p-5 text-sm text-info"><Factory size={20} className="shrink-0" aria-hidden="true" />
                <p>Sos parte de <strong>{branchName}</strong>. Desde acá gestionás la producción y el stock de materia prima. Las sucursales te envían{' '}
                    <Link href="/inventory/internal-orders" className="font-semibold underline">pedidos internos</Link>.</p>
            </Card>
        </div>
    </InventoryFrame>;
}

export default function InventoryDashboardPage() {
    const { user, loading } = useSession();
    const [branchName, setBranchName] = useState('');
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const isFactory = !isAdmin && (user?.branchTypes ?? []).includes('FABRICA');
    const branchId = user?.branchIds?.[0] ?? '';

    useEffect(() => {
        if (!isAdmin && branchId) {
            fetch('/api/admin/branches').then(response => response.json()).then(data => {
                if (data.success) {
                    const branch = data.data.find((entry: { id: string; name: string }) => entry.id === branchId);
                    if (branch) setBranchName(branch.name);
                }
            });
        }
    }, [isAdmin, branchId]);

    if (loading) return <div data-brand="admin" className="skot-experience grid min-h-dvh place-items-center" role="status"><Loader2 size={28} className="animate-spin text-brand" aria-hidden="true" /><span className="sr-only">Cargando inventario…</span></div>;
    if (!isAdmin && !branchId) return <InventoryFrame title="Sin sucursal asignada" description="Contactá a tu administrador para que te asigne una sucursal."><Card className="p-6 text-muted">No hay inventario de sucursal disponible para esta cuenta.</Card></InventoryFrame>;
    if (isFactory) return <FactoryInventoryView branchName={branchName || 'Fábrica'} />;
    if (!isAdmin) return <CashierInventoryView branchId={branchId} branchName={branchName || 'Mi sucursal'} />;
    return <AdminInventoryView />;
}
