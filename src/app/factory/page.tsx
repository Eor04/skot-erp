'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Factory, FileText, PlayCircle, Package2, Package, PackagePlus, Clock, CheckCircle2, RefreshCw, Plus, ChevronRight, Truck, ArrowLeft, ArrowLeftRight, Navigation, BarChart2, SlidersHorizontal } from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';

type Order = {
    id: string; orderNumber: string; recipeName: string; branchName: string;
    status: string; plannedYield: number; actualYield: number | null; createdAt: string;
};
type Summary = {
    activeOrders: number; pendingOrders: number; activeRecipes: number;
    productionToday: number; recentOrders: Order[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Borrador', color: 'bg-canvas text-muted' },
    SCHEDULED: { label: 'Programada', color: 'bg-[var(--status-info-bg)] text-info' },
    IN_PROGRESS: { label: 'En proceso', color: 'bg-[var(--status-warning-bg)] text-warning' },
    COMPLETED: { label: 'Completada', color: 'bg-[var(--status-success-bg)] text-success' },
    CANCELLED: { label: 'Cancelada', color: 'bg-[var(--status-error-bg)] text-danger' },
};

export default function FactoryDashboardPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    function loadData() {
        setLoading(true);
        fetch('/api/factory/summary').then(r => r.json()).then(d => {
            if (d.success) { setSummary(d.data); setLastUpdate(new Date()); }
        }).finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    const kpis = summary ? [
        {
            label: 'Órdenes activas',
            value: summary.activeOrders,
            sub: 'En proceso ahora',
            icon: <PlayCircle className="h-10 w-10 text-success" />,
            color: 'border-green-500',
            href: '/factory/production?status=IN_PROGRESS',
        },
        {
            label: 'Pendientes',
            value: summary.pendingOrders,
            sub: 'Borrador o programadas',
            icon: <Clock className="h-10 w-10 text-warning" />,
            color: 'border-orange-500',
            href: '/factory/production?status=SCHEDULED',
        },
        {
            label: 'Recetas activas',
            value: summary.activeRecipes,
            sub: 'En catálogo de recetas',
            icon: <FileText className="h-10 w-10 text-info" />,
            color: 'border-blue-500',
            href: '/factory/recipes',
        },
        {
            label: 'Producción hoy',
            value: `${summary.productionToday.toFixed(1)} kg`,
            sub: 'Yield real completado',
            icon: <Package2 className="h-10 w-10 text-brand" />,
            color: 'border-purple-500',
            href: '/factory/production',
        },
    ] : [];

    return (
        <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            
            <div className="mx-auto max-w-7xl space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-line-subtle pb-6">
                    <div>
                        <Link href="/" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-3">
                            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
                        </Link>
                        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl flex items-center gap-3">
                            <Factory className="h-8 w-8 text-info" /> Almacén y Dashboard de Fábrica
                        </h1>
                        <p className="text-muted mt-1 text-sm">
                            Producción de açaí, carne y pan de hamburguesa
                            {lastUpdate && <span className="ml-2 text-muted">· Actualizado {lastUpdate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <NotificationBell enabled={true} />
                        <button onClick={loadData} disabled={loading}
                            className="flex items-center gap-2 text-sm text-muted hover:text-ink bg-surface border border-line-subtle px-4 py-2.5 rounded-xl hover:bg-canvas transition disabled:opacity-40">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                        <Link href="/factory/production/new"
                            className="flex items-center gap-2 bg-brand hover:brightness-90 text-white px-4 py-2.5 rounded-xl text-sm font-medium  transition">
                            <Plus className="h-4 w-4" /> Nueva orden
                        </Link>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-surface  border border-line-subtle rounded-xl p-6 animate-pulse">
                                <div className="h-4 bg-canvas rounded mb-3 w-3/4" />
                                <div className="h-8 bg-canvas rounded w-1/2" />
                            </div>
                        ))
                    ) : kpis.map(kpi => (
                        <Link key={kpi.label} href={kpi.href}
                            className={`bg-surface  rounded-xl shadow-sm  transition p-5 border border-line-subtle hover:border-brand group`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted font-medium">{kpi.label}</p>
                                {kpi.icon}
                            </div>
                            <p className="text-3xl font-display font-semibold text-ink tabular-nums">{kpi.value}</p>
                            <p className="text-xs text-muted mt-1">{kpi.sub}</p>
                        </Link>
                    ))}
                </div>

                {/* Main Grid: Accesos + Últimas órdenes */}
                <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
                    
                    {/* Accesos rápidos integrados */}
                    <div>
                        <h2 className="font-display text-xl font-semibold text-ink mb-5 flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-info" /> Módulos Operativos
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[
                                {
                                    href: '/factory/receiving',
                                    icon: <PackagePlus className="h-7 w-7 text-success" />,
                                    title: 'Recepción',
                                    desc: 'Registrá la entrada de mercadería de proveedores',
                                    bg: 'bg-surface hover:bg-[var(--status-success-bg)]',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/factory/production',
                                    icon: <PlayCircle className="h-7 w-7 text-success" />,
                                    title: 'Órdenes',
                                    desc: 'Consultá y gestioná las órdenes en curso o terminadas',
                                    bg: 'bg-surface hover:bg-[var(--status-success-bg)]',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/factory/production/new',
                                    icon: <Plus className="h-7 w-7 text-brand" />,
                                    title: 'Nueva Orden',
                                    desc: 'Iniciá una nueva tanda calculando merma automáticamente',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/factory/recipes',
                                    icon: <FileText className="h-7 w-7 text-brand" />,
                                    title: 'Recetas (BOM)',
                                    desc: 'Administrá las recetas (BOM) y rendimientos esperados',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/factory/materials',
                                    icon: <Package className="h-7 w-7 text-brand" />,
                                    title: 'Inventario',
                                    desc: 'Verificá existencias completas, puntos de reorden y escasez',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/inventory/transfers',
                                    icon: <ArrowLeftRight className="h-7 w-7 text-brand" />,
                                    title: 'Transferencias',
                                    desc: 'Gestioná envíos de productos hacia los locales',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/inventory/internal-orders',
                                    icon: <Truck className="h-7 w-7 text-warning" />,
                                    title: 'Pedidos Internos',
                                    desc: 'Aprobá y despachá solicitudes de las sucursales',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/inventory/kardex',
                                    icon: <BarChart2 className="h-7 w-7 text-brand" />,
                                    title: 'Kardex',
                                    desc: 'Auditoría de entradas, salidas y transferencias',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                },
                                {
                                    href: '/inventory/adjustments',
                                    icon: <SlidersHorizontal className="h-7 w-7 text-brand" />,
                                    title: 'Ajuste de Stock',
                                    desc: 'Registrá mermas o ajustá diferencias en el inventario',
                                    bg: 'bg-surface hover:bg-canvas',
                                    border: 'border-line-subtle'
                                }
                            ].map(link => (
                                <Link key={link.href} href={link.href}
                                    className={`${link.bg}  rounded-xl shadow-sm transition p-5 border ${link.border} group hover:border-brand`}>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="bg-canvas p-2.5 rounded-xl  transition-transform">
                                            {link.icon}
                                        </div>
                                        <h3 className="font-semibold text-ink text-sm">{link.title}</h3>
                                    </div>
                                    <p className="text-xs text-muted ml-1">{link.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Últimas órdenes */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
                                <Clock className="h-5 w-5 text-brand" /> Últimas órdenes
                            </h2>
                            <Link href="/factory/production" className="text-sm font-semibold text-brand hover:underline transition">Ver todas →</Link>
                        </div>
                        <div className="bg-surface  rounded-xl border border-line-subtle overflow-hidden ">
                            {loading ? (
                                <div className="p-8 text-center text-muted text-sm">Cargando órdenes…</div>
                            ) : !summary?.recentOrders.length ? (
                                <div className="p-8 text-center text-muted text-sm flex flex-col items-center">
                                    <Factory className="h-10 w-10 mb-3 opacity-30" />
                                    <p>No hay órdenes de producción aún</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-line-subtle">
                                    {summary.recentOrders.map(order => {
                                        const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-canvas text-muted' };
                                        return (
                                            <Link key={order.id} href="/factory/production"
                                                className="flex items-center gap-3 px-5 py-4 hover:bg-canvas transition group">
                                                <div className="w-9 h-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0  transition-transform">
                                                    {order.status === 'COMPLETED'
                                                        ? <CheckCircle2 className="h-5 w-5 text-success" />
                                                        : order.status === 'IN_PROGRESS'
                                                            ? <PlayCircle className="h-5 w-5 text-warning" />
                                                            : <Clock className="h-5 w-5 text-info" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-ink text-sm truncate">{order.recipeName}</p>
                                                    <p className="text-xs text-muted">{order.orderNumber} · {order.branchName}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <p className="text-xs text-muted mt-1.5">
                                                        {order.actualYield ?? order.plannedYield} kg
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
