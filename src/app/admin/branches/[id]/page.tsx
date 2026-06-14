'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, Package, DollarSign, Receipt,
    AlertTriangle, XCircle, Store, BarChart3, Clock, CheckCircle, Loader2
} from 'lucide-react';

interface BranchData {
    branch: { id: string; name: string; type: string; address?: string; phone?: string; active: boolean };
    sales: {
        today: { amount: number; count: number };
        month: { amount: number; count: number };
    };
    stock: {
        criticalCount: number; lowCount: number; totalItems: number;
        criticalItems: { name: string; unit: string; current: number; min: number }[];
    };
    cashCloses: {
        id: string; createdAt: string; openedAt?: string; closedAt?: string;
        sessionStatus: string; user: string; openedBy?: string;
        totalSales: number; actualCash: number; difference: number; notes?: string;
    }[];
    expenses: { month: { amount: number; count: number } };
}

function S(n: number) { return 'S/ ' + n.toFixed(2); }

function KPI({ label, value, sub, color, icon: Icon }: {
    label: string; value: string; sub?: string;
    color: string; icon: React.ElementType;
}) {
    return (
        <div className={`${color} rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 opacity-70" />
                <span className="text-xs font-semibold opacity-70">{label}</span>
            </div>
            <p className="text-2xl font-black">{value}</p>
            {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
    );
}

export default function BranchOverviewPage({ params }: { params: { id: string } }) {
    const [data, setData] = useState<BranchData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/admin/branches/${params.id}/overview`)
            .then(r => r.json())
            .then(d => { if (d.success) setData(d.data); else setError(d.error); })
            .catch(() => setError('Error de conexión'))
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return (
        <div className="min-h-screen bg-white/5 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-white/5 flex items-center justify-center">
            <div className="text-center text-red-500">
                <XCircle className="h-10 w-10 mx-auto mb-2" />
                <p>{error || 'No se pudo cargar'}</p>
                <Link href="/admin/branches" className="mt-3 inline-block text-sm underline text-white/70">Volver</Link>
            </div>
        </div>
    );

    const { branch, sales, stock, cashCloses, expenses } = data;
    const typeEmoji = branch.type === 'ACAI' ? '🥤' : branch.type === 'HAMBURGUESAS' ? '🍔' : '🏭';

    return (
        <div className="min-h-screen bg-white/5 p-6">
            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <Link href="/admin/branches" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-1">
                            <ArrowLeft className="h-4 w-4" /> Sucursales
                        </Link>
                        <h1 className="text-2xl font-bold text-white/90">
                            {typeEmoji} {branch.name}
                        </h1>
                        <p className="text-sm text-white/60 mt-0.5">
                            {branch.type} {branch.address ? '· ' + branch.address : ''} {branch.phone ? '· ' + branch.phone : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/inventory/stock?branch=${branch.id}`}
                            className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                            📦 Inventario
                        </Link>
                        <Link href={`/admin/sales?branch=${branch.id}`}
                            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                            🛒 Ventas
                        </Link>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <KPI label="Ventas hoy" value={S(sales.today.amount)} sub={`${sales.today.count} transacciones`}
                        color="bg-green-50 text-green-800" icon={TrendingUp} />
                    <KPI label="Ventas del mes" value={S(sales.month.amount)} sub={`${sales.month.count} transacciones`}
                        color="bg-blue-50 text-blue-800" icon={BarChart3} />
                    <KPI label="Gastos del mes" value={S(expenses.month.amount)} sub={`${expenses.month.count} gastos`}
                        color="bg-rose-50 text-rose-800" icon={Receipt} />
                    <KPI label="Stock crítico" value={`${stock.criticalCount} sin stock`} sub={`${stock.lowCount} bajo mínimo`}
                        color={stock.criticalCount > 0 ? 'bg-red-50 text-red-800' : 'bg-white/5 text-white/80'} icon={Package} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock crítico */}
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <h2 className="font-bold text-white/90 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" /> Stock bajo / Crítico
                            </h2>
                            <Link href={`/inventory/stock`}
                                className="text-xs text-green-600 hover:underline font-medium">Ver todo →</Link>
                        </div>
                        {stock.criticalItems.length === 0 ? (
                            <div className="py-10 text-center text-white/40">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                                <p className="text-sm">¡Todo el stock está OK!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {stock.criticalItems.map((item, i) => (
                                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white/90">{item.name}</p>
                                            <p className="text-xs text-white/40">Mín: {item.min} {item.unit}</p>
                                        </div>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${item.current <= 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {item.current} {item.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Últimos cierres de caja */}
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <h2 className="font-bold text-white/90 flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-slate-500" /> Cierres de Caja
                            </h2>
                        </div>
                        {cashCloses.length === 0 ? (
                            <div className="py-10 text-center text-white/40">
                                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Sin cierres registrados</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {cashCloses.map(c => {
                                    const diff = c.difference;
                                    const openedAt = c.openedAt ? new Date(c.openedAt) : null;
                                    const closedAt = c.closedAt ? new Date(c.closedAt) : new Date(c.createdAt);
                                    const duration = openedAt
                                        ? Math.round((closedAt.getTime() - openedAt.getTime()) / 60000)
                                        : null;
                                    return (
                                        <div key={c.id} className="px-5 py-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <div>
                                                    <p className="text-sm font-semibold text-white/90">{c.user}</p>
                                                    <div className="flex items-center gap-2 text-xs text-white/40">
                                                        {openedAt && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {openedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} →{' '}
                                                                {closedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                                {duration !== null && ` (${duration} min)`}
                                                            </span>
                                                        )}
                                                        <span>{new Date(c.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-white/90">{S(c.totalSales)}</p>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff === 0 ? 'bg-green-100 text-green-700' : diff > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            {c.notes && <p className="text-xs text-white/40 italic mt-0.5">"{c.notes}"</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
