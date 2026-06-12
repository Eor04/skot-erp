'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/session-context';
import {
    ArrowLeft, Bell, AlertTriangle, XCircle, Clock,
    RefreshCw, Store, ChevronDown, PackageOpen
} from 'lucide-react';

type AlertItem = {
    id: string;
    branchId: string;
    productId: string;
    currentStock: number;
    minStock: number;
    dailyAverage?: number;
    daysRemaining?: number | null;
    severity?: 'CRITICO' | 'ALTO' | 'MEDIO';
    product: { id: string; name: string; sku: string; type: string; unit: string };
    branch: { id: string; name: string };
};

type ExpiringItem = {
    id: string;
    branchId: string;
    productId: string;
    currentStock: number;
    expirationDate: string;
    product: { id: string; name: string; sku: string; type: string; unit: string };
    branch: { id: string; name: string };
};

type PendingOrder = {
    id: string;
    orderNumber: string;
    fromBranch: { name: string };
    toBranch: { name: string };
};

type PendingTransfer = {
    id: string;
    transferNumber: string;
    fromBranch: { name: string };
    toBranch: { name: string };
};

type Branch = { id: string; name: string; type: string };

const SEVERITY_CONFIG = {
    CRITICO: { label: 'Sin Stock', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, border: 'border-l-red-500' },
    ALTO: { label: 'Crítico', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle, border: 'border-l-orange-500' },
    MEDIO: { label: 'Bajo', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertTriangle, border: 'border-l-yellow-500' },
};

export default function AlertsPage() {
    const { user } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    
    // Si no es ADMIN y tiene sucursales, forzar esa sucursal
    const initialBranch = user?.role !== 'ADMIN' && user?.branchIds?.length ? user.branchIds[0] : '';
    const [selectedBranch, setSelectedBranch] = useState(initialBranch);
    
    // Sincronizar si el usuario carga después
    useEffect(() => {
        if (user?.role !== 'ADMIN' && user?.branchIds?.length) {
            setSelectedBranch(user.branchIds[0]);
        }
    }, [user]);

    const [data, setData] = useState<{
        lowStock: AlertItem[];
        expiringSoon: ExpiringItem[];
        pendingOrders: PendingOrder[];
        pendingTransfers: PendingTransfer[];
        summary: { totalLowStock: number; totalExpiring: number; critical: number; totalPendingOrders: number; totalPendingTransfers: number };
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) setBranches(d.data);
        });
    }, []);

    const loadAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const query = selectedBranch ? `?branchId=${selectedBranch}` : '';
            const res = await fetch(`/api/inventory/alerts${query}`);
            const d = await res.json();
            if (d.success) {
                setData(d.data);
                setLastUpdated(new Date());
            }
        } catch { }
        finally { setLoading(false); }
    }, [selectedBranch]);

    useEffect(() => { loadAlerts(); }, [loadAlerts]);

    const totalAlerts = (data?.summary.totalLowStock ?? 0) + (data?.summary.totalExpiring ?? 0) + (data?.summary.totalPendingOrders ?? 0) + (data?.summary.totalPendingTransfers ?? 0);

    function daysLabel(days: number | null | undefined) {
        if (days === null || days === undefined) return '—';
        if (days === 0) return 'Hoy';
        return `~${days}d`;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Admin
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Bell className="h-8 w-8 text-red-500" />
                                Alertas de Stock
                                {totalAlerts > 0 && (
                                    <span className="bg-red-500 text-white text-sm font-bold rounded-full px-2.5 py-0.5">
                                        {totalAlerts}
                                    </span>
                                )}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Productos con stock bajo o por vencer
                                {lastUpdated && (
                                    <span className="ml-2 text-xs text-gray-400">
                                        · Actualizado {lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={loadAlerts}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Filtro de sucursal (Solo ADMIN) */}
                {user?.role === 'ADMIN' && (
                <div className="bg-white rounded-2xl shadow p-4 mb-6 flex gap-2 flex-wrap items-center">
                    <Store className="h-4 w-4 text-gray-400" />
                    <button
                        onClick={() => setSelectedBranch('')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!selectedBranch ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Todas
                    </button>
                    {branches.map(b => (
                        <button
                            key={b.id}
                            onClick={() => setSelectedBranch(b.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedBranch === b.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {b.type === 'ACAI' ? '🥤' : b.type === 'HAMBURGUESAS' ? '🍔' : '🏭'} {b.name}
                        </button>
                    ))}
                </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-gray-400">
                        <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-3 opacity-40" />
                        Cargando alertas…
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        {data && (
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Sin Stock</p>
                                    <p className="text-3xl font-bold text-red-700 mt-1">{data.summary.critical}</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                                    <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">Stock Bajo</p>
                                    <p className="text-3xl font-bold text-yellow-700 mt-1">{data.summary.totalLowStock - data.summary.critical}</p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Por Vencer</p>
                                    <p className="text-3xl font-bold text-orange-700 mt-1">{data.summary.totalExpiring}</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Pedidos Ptes</p>
                                    <p className="text-3xl font-bold text-blue-700 mt-1">{data.summary.totalPendingOrders}</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                                    <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Transf. Ptes</p>
                                    <p className="text-3xl font-bold text-purple-700 mt-1">{data.summary.totalPendingTransfers}</p>
                                </div>
                            </div>
                        )}

                        {/* Pedidos Pendientes */}
                        <Section title="📦 Pedidos Internos Pendientes" count={data?.summary.totalPendingOrders ?? 0} defaultOpen={data?.summary.totalPendingOrders ? true : false}>
                            {data?.pendingOrders?.length === 0 ? (
                                <Empty text="No tienes pedidos internos pendientes" />
                            ) : data?.pendingOrders?.map(order => (
                                <div key={order.id} className="flex items-center justify-between p-4 border-l-4 border-l-blue-400 bg-white rounded-r-xl shadow-sm mb-2">
                                    <div className="flex items-start gap-3">
                                        <PackageOpen className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-900">Pedido #{order.orderNumber}</p>
                                            <p className="text-xs text-gray-500">De: {order.fromBranch.name} → Para: {order.toBranch.name}</p>
                                        </div>
                                    </div>
                                    <Link href="/inventory/internal-orders" className="text-sm px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition">
                                        Revisar
                                    </Link>
                                </div>
                            ))}
                        </Section>

                        {/* Transferencias Pendientes */}
                        <Section title="🚚 Transferencias Pendientes" count={data?.summary.totalPendingTransfers ?? 0} defaultOpen={data?.summary.totalPendingTransfers ? true : false}>
                            {data?.pendingTransfers?.length === 0 ? (
                                <Empty text="No tienes transferencias pendientes por aprobar" />
                            ) : data?.pendingTransfers?.map(transfer => (
                                <div key={transfer.id} className="flex items-center justify-between p-4 border-l-4 border-l-purple-400 bg-white rounded-r-xl shadow-sm mb-2">
                                    <div className="flex items-start gap-3">
                                        <PackageOpen className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-900">Transferencia #{transfer.transferNumber}</p>
                                            <p className="text-xs text-gray-500">Origen: {transfer.fromBranch.name} → Destino: {transfer.toBranch.name}</p>
                                        </div>
                                    </div>
                                    <Link href="/inventory/transfers" className="text-sm px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 transition">
                                        Revisar
                                    </Link>
                                </div>
                            ))}
                        </Section>

                        {/* Stock bajo */}
                        <Section title="🚨 Stock Bajo / Sin Stock" count={data?.summary.totalLowStock ?? 0} defaultOpen>
                            {data?.lowStock.length === 0 ? (
                                <Empty text="¡Todo el stock está en buen nivel! 🎉" />
                            ) : data?.lowStock.map(item => {
                                const sev = item.severity || 'MEDIO';
                                const cfg = SEVERITY_CONFIG[sev];
                                const Icon = cfg.icon;
                                return (
                                    <div key={item.id} className={`flex items-center justify-between p-4 border-l-4 ${cfg.border} bg-white rounded-r-xl shadow-sm mb-2`}>
                                        <div className="flex items-start gap-3">
                                            <Icon className="h-5 w-5 text-current mt-0.5 flex-shrink-0" style={{ color: sev === 'CRITICO' ? '#dc2626' : sev === 'ALTO' ? '#ea580c' : '#d97706' }} />
                                            <div>
                                                <p className="font-semibold text-gray-900">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{item.branch.name} · SKU: {item.product.sku}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-right">
                                            <div>
                                                <p className="text-xs text-gray-400">Stock actual</p>
                                                <p className={`font-bold text-lg ${sev === 'CRITICO' ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {item.currentStock} <span className="text-xs font-normal text-gray-400">{item.product.unit}</span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Mínimo</p>
                                                <p className="font-medium text-gray-600">{item.minStock} <span className="text-xs font-normal text-gray-400">{item.product.unit}</span></p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Días restantes</p>
                                                <p className="font-medium text-gray-700">{daysLabel(item.daysRemaining)}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </Section>

                        {/* Por vencer */}
                        <Section title="⏰ Próximos a Vencer (30 días)" count={data?.summary.totalExpiring ?? 0}>
                            {data?.expiringSoon.length === 0 ? (
                                <Empty text="No hay productos próximos a vencer" />
                            ) : data?.expiringSoon.map(item => {
                                const exp = new Date(item.expirationDate);
                                const daysLeft = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={item.id} className="flex items-center justify-between p-4 border-l-4 border-l-orange-400 bg-white rounded-r-xl shadow-sm mb-2">
                                        <div className="flex items-start gap-3">
                                            <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-gray-900">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{item.branch.name} · SKU: {item.product.sku}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-right">
                                            <div>
                                                <p className="text-xs text-gray-400">Stock</p>
                                                <p className="font-bold text-gray-900">{item.currentStock} <span className="text-xs font-normal text-gray-400">{item.product.unit}</span></p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Vence</p>
                                                <p className="font-medium text-gray-700">{exp.toLocaleDateString('es-BO')}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${daysLeft <= 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                                {daysLeft <= 0 ? '¡Vencido!' : `En ${daysLeft}d`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </Section>
                    </>
                )}
            </div>
        </div>
    );
}

function Section({ title, count, children, defaultOpen }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className="mb-6">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between bg-white rounded-2xl shadow px-5 py-4 text-left hover:bg-gray-50 transition"
            >
                <span className="font-semibold text-gray-800">
                    {title}
                    {count > 0 && (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                    )}
                </span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="mt-3">{children}</div>}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl shadow-sm">
            <p>{text}</p>
        </div>
    );
}
