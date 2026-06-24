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
    DRAFT: { label: 'Borrador', color: 'bg-white/10 text-white/60' },
    SCHEDULED: { label: 'Programada', color: 'bg-blue-500/20 text-blue-400' },
    IN_PROGRESS: { label: 'En proceso', color: 'bg-yellow-500/20 text-yellow-400' },
    COMPLETED: { label: 'Completada', color: 'bg-green-500/20 text-green-400' },
    CANCELLED: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400' },
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
            icon: <PlayCircle className="h-10 w-10 text-green-400" />,
            color: 'border-green-500',
            href: '/factory/production?status=IN_PROGRESS',
        },
        {
            label: 'Pendientes',
            value: summary.pendingOrders,
            sub: 'Borrador o programadas',
            icon: <Clock className="h-10 w-10 text-orange-400" />,
            color: 'border-orange-500',
            href: '/factory/production?status=SCHEDULED',
        },
        {
            label: 'Recetas activas',
            value: summary.activeRecipes,
            sub: 'En catálogo de recetas',
            icon: <FileText className="h-10 w-10 text-blue-400" />,
            color: 'border-blue-500',
            href: '/factory/recipes',
        },
        {
            label: 'Producción hoy',
            value: `${summary.productionToday.toFixed(1)} kg`,
            sub: 'Yield real completado',
            icon: <Package2 className="h-10 w-10 text-purple-400" />,
            color: 'border-purple-500',
            href: '/factory/production',
        },
    ] : [];

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-8 space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-6">
                    <div>
                        <Link href="/" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-3">
                            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Factory className="h-8 w-8 text-blue-400" /> Almacén y Dashboard de Fábrica
                        </h1>
                        <p className="text-white/60 mt-1 text-sm">
                            Producción de açaí, carne y pan de hamburguesa
                            {lastUpdate && <span className="ml-2 text-white/40">· Actualizado {lastUpdate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <NotificationBell enabled={true} />
                        <button onClick={loadData} disabled={loading}
                            className="flex items-center gap-2 text-sm text-white/70 hover:text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl hover:bg-white/10 transition disabled:opacity-40">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                        <Link href="/factory/production/new"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition">
                            <Plus className="h-4 w-4" /> Nueva orden
                        </Link>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-pulse">
                                <div className="h-4 bg-white/10 rounded mb-3 w-3/4" />
                                <div className="h-8 bg-white/10 rounded w-1/2" />
                            </div>
                        ))
                    ) : kpis.map(kpi => (
                        <Link key={kpi.label} href={kpi.href}
                            className={`bg-white/5 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-lg transition p-5 border-l-4 border-white/10 hover:${kpi.color} group`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-white/60 font-medium">{kpi.label}</p>
                                {kpi.icon}
                            </div>
                            <p className="text-3xl font-black text-white/90">{kpi.value}</p>
                            <p className="text-xs text-white/40 mt-1">{kpi.sub}</p>
                        </Link>
                    ))}
                </div>

                {/* Main Grid: Accesos + Últimas órdenes */}
                <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
                    
                    {/* Accesos rápidos integrados */}
                    <div>
                        <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-blue-400" /> Módulos Operativos
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[
                                {
                                    href: '/factory/receiving',
                                    icon: <PackagePlus className="h-7 w-7 text-green-400" />,
                                    title: 'Recepción',
                                    desc: 'Registrá la entrada de mercadería de proveedores',
                                    bg: 'bg-green-500/10 hover:bg-green-500/20',
                                    border: 'border-green-500/30'
                                },
                                {
                                    href: '/factory/production',
                                    icon: <PlayCircle className="h-7 w-7 text-green-400" />,
                                    title: 'Órdenes',
                                    desc: 'Consultá y gestioná las órdenes en curso o terminadas',
                                    bg: 'bg-green-500/10 hover:bg-green-500/20',
                                    border: 'border-green-500/30'
                                },
                                {
                                    href: '/factory/production/new',
                                    icon: <Plus className="h-7 w-7 text-emerald-400" />,
                                    title: 'Nueva Orden',
                                    desc: 'Iniciá una nueva tanda calculando merma automáticamente',
                                    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
                                    border: 'border-emerald-500/30'
                                },
                                {
                                    href: '/factory/recipes',
                                    icon: <FileText className="h-7 w-7 text-purple-400" />,
                                    title: 'Recetas (BOM)',
                                    desc: 'Administrá las recetas (BOM) y rendimientos esperados',
                                    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
                                    border: 'border-purple-500/30'
                                },
                                {
                                    href: '/factory/materials',
                                    icon: <Package className="h-7 w-7 text-cyan-400" />,
                                    title: 'Inventario',
                                    desc: 'Verificá existencias completas, puntos de reorden y escasez',
                                    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
                                    border: 'border-cyan-500/30'
                                },
                                {
                                    href: '/inventory/transfers',
                                    icon: <ArrowLeftRight className="h-7 w-7 text-indigo-400" />,
                                    title: 'Transferencias',
                                    desc: 'Gestioná envíos de productos hacia los locales',
                                    bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
                                    border: 'border-indigo-500/30'
                                },
                                {
                                    href: '/inventory/internal-orders',
                                    icon: <Truck className="h-7 w-7 text-orange-400" />,
                                    title: 'Pedidos Internos',
                                    desc: 'Aprobá y despachá solicitudes de las sucursales',
                                    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
                                    border: 'border-orange-500/30'
                                },
                                {
                                    href: '/inventory/kardex',
                                    icon: <BarChart2 className="h-7 w-7 text-rose-400" />,
                                    title: 'Kardex',
                                    desc: 'Auditoría de entradas, salidas y transferencias',
                                    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
                                    border: 'border-rose-500/30'
                                },
                                {
                                    href: '/inventory/adjustments',
                                    icon: <SlidersHorizontal className="h-7 w-7 text-amber-400" />,
                                    title: 'Ajuste de Stock',
                                    desc: 'Registrá mermas o ajustá diferencias en el inventario',
                                    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
                                    border: 'border-amber-500/30'
                                }
                            ].map(link => (
                                <Link key={link.href} href={link.href}
                                    className={`${link.bg} backdrop-blur-md rounded-2xl shadow-sm transition p-5 border ${link.border} group hover:scale-[1.02]`}>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="bg-black/20 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                                            {link.icon}
                                        </div>
                                        <h3 className="font-semibold text-white/90 text-sm">{link.title}</h3>
                                    </div>
                                    <p className="text-xs text-white/60 ml-1">{link.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Últimas órdenes */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="h-5 w-5 text-purple-400" /> Últimas órdenes
                            </h2>
                            <Link href="/factory/production" className="text-sm text-blue-400 hover:text-blue-300 transition">Ver todas →</Link>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-lg">
                            {loading ? (
                                <div className="p-8 text-center text-white/40 text-sm">Cargando órdenes…</div>
                            ) : !summary?.recentOrders.length ? (
                                <div className="p-8 text-center text-white/40 text-sm flex flex-col items-center">
                                    <Factory className="h-10 w-10 mb-3 opacity-30" />
                                    <p>No hay órdenes de producción aún</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {summary.recentOrders.map(order => {
                                        const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-white/10 text-white/60' };
                                        return (
                                            <Link key={order.id} href="/factory/production"
                                                className="flex items-center gap-3 px-5 py-4 hover:bg-white/10 transition group">
                                                <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                    {order.status === 'COMPLETED'
                                                        ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                                                        : order.status === 'IN_PROGRESS'
                                                            ? <PlayCircle className="h-5 w-5 text-yellow-400" />
                                                            : <Clock className="h-5 w-5 text-blue-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-white/90 text-sm truncate">{order.recipeName}</p>
                                                    <p className="text-xs text-white/50">{order.orderNumber} · {order.branchName}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <p className="text-xs text-white/40 mt-1.5">
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
        </div>
    );
}
