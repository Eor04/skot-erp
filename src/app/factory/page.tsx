'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Factory, FileText, PlayCircle, Package2, Package, Clock, CheckCircle2, RefreshCw, Plus, ChevronRight } from 'lucide-react';

type Order = {
    id: string; orderNumber: string; recipeName: string; branchName: string;
    status: string; plannedYield: number; actualYield: number | null; createdAt: string;
};
type Summary = {
    activeOrders: number; pendingOrders: number; activeRecipes: number;
    productionToday: number; recentOrders: Order[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
    SCHEDULED: { label: 'Programada', color: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'En proceso', color: 'bg-yellow-100 text-yellow-700' },
    COMPLETED: { label: 'Completada', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
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
            icon: <PlayCircle className="h-10 w-10 text-green-500" />,
            color: 'border-green-500',
            href: '/factory/production?status=IN_PROGRESS',
        },
        {
            label: 'Pendientes',
            value: summary.pendingOrders,
            sub: 'Borrador o programadas',
            icon: <Clock className="h-10 w-10 text-orange-500" />,
            color: 'border-orange-500',
            href: '/factory/production?status=SCHEDULED',
        },
        {
            label: 'Recetas activas',
            value: summary.activeRecipes,
            sub: 'En catálogo de recetas',
            icon: <FileText className="h-10 w-10 text-blue-500" />,
            color: 'border-blue-500',
            href: '/factory/recipes',
        },
        {
            label: 'Producción hoy',
            value: `${summary.productionToday.toFixed(1)} kg`,
            sub: 'Yield real completado',
            icon: <Package2 className="h-10 w-10 text-purple-500" />,
            color: 'border-purple-500',
            href: '/factory/production',
        },
    ] : [];

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Factory className="h-8 w-8 text-blue-600" /> Dashboard de Fábrica
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            Producción de açaí, carne y pan de hamburguesa
                            {lastUpdate && <span className="ml-2 text-gray-400">· Actualizado {lastUpdate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={loadData} disabled={loading}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-40">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                        <Link href="/factory/production/new"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                            <Plus className="h-4 w-4" /> Nueva orden
                        </Link>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow p-6 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
                                <div className="h-8 bg-gray-200 rounded w-1/2" />
                            </div>
                        ))
                    ) : kpis.map(kpi => (
                        <Link key={kpi.label} href={kpi.href}
                            className={`bg-white rounded-2xl shadow hover:shadow-md transition p-5 border-l-4 ${kpi.color} group`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                                {kpi.icon}
                            </div>
                            <p className="text-3xl font-black text-gray-900">{kpi.value}</p>
                            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                        </Link>
                    ))}
                </div>

                {/* Grid de accesos + Últimas órdenes */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Accesos rápidos */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Accesos rápidos</h2>
                        {[
                            { href: '/factory/production', icon: <PlayCircle className="h-6 w-6 text-green-600" />, title: 'Órdenes de Producción', desc: 'Ver, crear y gestionar órdenes', color: 'border-green-500' },
                            { href: '/factory/production/new', icon: <Plus className="h-6 w-6 text-blue-600" />, title: 'Nueva Orden', desc: 'Crear nueva orden de producción', color: 'border-blue-500' },
                            { href: '/factory/recipes', icon: <FileText className="h-6 w-6 text-purple-600" />, title: 'Gestión de Recetas', desc: 'Ver y editar recetas (BOM)', color: 'border-purple-500' },
                            { href: '/factory/materials', icon: <Package className="h-6 w-6 text-cyan-600" />, title: 'Inventario de Materia Prima', desc: 'Stock de ingredientes y materiales', color: 'border-cyan-500' },
                            { href: '/inventory/kardex', icon: <Package2 className="h-6 w-6 text-indigo-600" />, title: 'Kardex de Movimientos', desc: 'Historial de entradas y salidas', color: 'border-indigo-500' },
                        ].map(link => (
                            <Link key={link.href} href={link.href}
                                className={`flex items-center gap-4 bg-white rounded-2xl shadow hover:shadow-md transition p-4 border-l-4 ${link.color} group`}>
                                <div className="flex-shrink-0">{link.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm">{link.title}</h3>
                                    <p className="text-xs text-gray-500">{link.desc}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                            </Link>
                        ))}
                    </div>

                    {/* Últimas órdenes */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Últimas órdenes</h2>
                            <Link href="/factory/production" className="text-sm text-blue-600 hover:underline">Ver todas →</Link>
                        </div>
                        <div className="bg-white rounded-2xl shadow overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400 text-sm">Cargando órdenes…</div>
                            ) : !summary?.recentOrders.length ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    <Factory className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>No hay órdenes de producción aún</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {summary.recentOrders.map(order => {
                                        const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
                                        return (
                                            <Link key={order.id} href="/factory/production"
                                                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    {order.status === 'COMPLETED'
                                                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        : order.status === 'IN_PROGRESS'
                                                            ? <PlayCircle className="h-4 w-4 text-yellow-500" />
                                                            : <Clock className="h-4 w-4 text-blue-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{order.recipeName}</p>
                                                    <p className="text-xs text-gray-400">{order.orderNumber} · {order.branchName}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <p className="text-xs text-gray-400 mt-1">
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
