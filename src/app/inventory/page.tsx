'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Package, TrendingUp, FileText, ArrowLeftRight, BarChart2,
    Send, Trash2, SlidersHorizontal, AlertTriangle, XCircle,
    CheckCircle, Loader2, RefreshCw, ArrowLeft, Factory,
    ClipboardList, ChevronRight, PackagePlus,
} from 'lucide-react';

import { useSession } from '@/lib/session-context';

/* ── Tipos ── */
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
interface Summary { total: number; low: number; critical: number; ok: number; }

/* ── Vista Cajero / Almacén ── */
function CashierInventoryView({ branchId, branchName }: { branchId: string; branchName: string }) {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'LOW' | 'CRITICAL' | 'OK'>('ALL');

    const loadStock = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/stock?branchId=${branchId}`).then(r => r.json());
            if (res.success) { setStock(res.data); setSummary(res.summary); }
        } finally { setLoading(false); }
    }, [branchId]);

    useEffect(() => { if (branchId) loadStock(); }, [branchId, loadStock]);

    const filtered = stock.filter(item => {
        const q = search.toLowerCase();
        const name = item.product?.name ?? '';
        const sku = item.product?.sku ?? '';
        const matchSearch = name.toLowerCase().includes(q) || sku.toLowerCase().includes(q);
        const matchFilter =
            filter === 'ALL' ? true :
                filter === 'CRITICAL' ? item.isCritical :
                    filter === 'LOW' ? (item.isLow && !item.isCritical) :
                        !item.isLow;
        return matchSearch && matchFilter;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header sucursal */}
            <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Package className="h-4 w-4" />
                            <span>Inventario</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-semibold text-gray-900">{branchName}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Mi Sucursal</h1>
                    </div>
                    <button
                        onClick={loadStock}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition"
                    >
                        <RefreshCw className="h-4 w-4" /> Actualizar
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">

                {/* Acciones rápidas */}
                <div className="grid grid-cols-2 gap-4">
                    <Link
                        href="/inventory/transfers"
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-blue-300 hover:shadow-md transition group"
                    >
                        <div className="bg-blue-100 rounded-xl p-3 group-hover:bg-blue-200 transition">
                            <ArrowLeftRight className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-sm">Transferencias entre Sucursales</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Solicitar o confirmar envíos de stock</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-400 transition" />
                    </Link>

                    <Link
                        href="/inventory/internal-orders"
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-green-300 hover:shadow-md transition group"
                    >
                        <div className="bg-green-100 rounded-xl p-3 group-hover:bg-green-200 transition">
                            <Factory className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-sm">Pedidos a Fábrica</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Solicitar productos al área de producción</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-green-400 transition" />
                    </Link>
                </div>

                {/* KPIs */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total ítems', value: summary.total, color: 'bg-blue-50 text-blue-700 border-blue-100', f: 'ALL' as const },
                            { label: 'Stock OK', value: summary.ok, color: 'bg-green-50 text-green-700 border-green-100', f: 'OK' as const },
                            { label: 'Stock bajo', value: summary.low, color: 'bg-yellow-50 text-yellow-700 border-yellow-100', f: 'LOW' as const },
                            { label: 'Sin stock', value: summary.critical, color: 'bg-red-50 text-red-700 border-red-100', f: 'CRITICAL' as const },
                        ].map(kpi => (
                            <button key={kpi.label} onClick={() => setFilter(kpi.f)}
                                className={`${kpi.color} border rounded-2xl p-4 text-left transition-all ${filter === kpi.f ? 'ring-2 ring-current shadow' : 'hover:shadow-sm'}`}>
                                <p className="text-xs font-semibold opacity-70">{kpi.label}</p>
                                <p className="text-3xl font-black mt-1">{kpi.value}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* Alertas de stock bajo */}
                {summary && (summary.critical > 0 || summary.low > 0) && (
                    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${summary.critical > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${summary.critical > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
                        <div>
                            <p className={`text-sm font-bold ${summary.critical > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
                                {summary.critical > 0
                                    ? `⚠️ ${summary.critical} producto${summary.critical !== 1 ? 's' : ''} sin stock`
                                    : `📉 ${summary.low} producto${summary.low !== 1 ? 's' : ''} con stock bajo`
                                }
                            </p>
                            <p className={`text-xs mt-0.5 ${summary.critical > 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                                Considerá hacer un pedido a fábrica o solicitar una transferencia.
                            </p>
                        </div>
                        <Link
                            href="/inventory/internal-orders"
                            className={`ml-auto flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${summary.critical > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                        >
                            Pedir a fábrica →
                        </Link>
                    </div>
                )}

                {/* Buscador */}
                <div className="relative">
                    <Package className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o SKU…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                </div>

                {/* Tabla de stock */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Producto</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">SKU</th>
                                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Stock</th>
                                    <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Mín.</th>
                                    <th className="text-center px-5 py-3 font-semibold text-gray-600">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => (
                                    <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 ${item.isCritical ? 'bg-red-50/40' : item.isLow ? 'bg-yellow-50/40' : ''}`}>
                                        <td className="px-5 py-3 font-medium text-gray-900">{item.product?.name ?? '—'}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-gray-400 hidden md:table-cell">{item.product?.sku ?? '—'}</td>
                                        <td className={`px-5 py-3 text-right font-bold ${item.isCritical ? 'text-red-600' : item.isLow ? 'text-yellow-600' : 'text-green-700'}`}>
                                            {item.currentStock} <span className="text-xs font-normal text-gray-400">{item.product?.unit ?? ''}</span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm text-gray-400 hidden sm:table-cell">{item.minStock}</td>
                                        <td className="px-5 py-3 text-center">
                                            {item.isCritical ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                    <XCircle className="h-3 w-3" /> Sin stock
                                                </span>
                                            ) : item.isLow ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                                                    <AlertTriangle className="h-3 w-3" /> Bajo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                    <CheckCircle className="h-3 w-3" /> OK
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                            <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                            No se encontraron productos
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 bg-gray-50 border-t text-xs text-gray-400">
                            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} · {branchName}
                        </div>
                    </div>
                )}

                {/* Nota informativa */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-800">
                    <ClipboardList className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p>
                        Solo ves el stock de tu sucursal. Para ajustes de inventario contactá a tu administrador. Podés solicitar productos desde{' '}
                        <Link href="/inventory/internal-orders" className="underline font-semibold hover:text-blue-900">Pedidos a Fábrica</Link>{' '}
                        o pedir traslados desde{' '}
                        <Link href="/inventory/transfers" className="underline font-semibold hover:text-blue-900">Transferencias</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Vista Admin / Manager (panel completo) ── */
function AdminInventoryView() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Package className="h-8 w-8 text-green-600" />
                        Gestión de Inventario
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Control de stock multi-sucursal con alertas inteligentes
                    </p>
                </div>

                {/* Accesos Rápidos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    <Link href="/inventory/stock" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center gap-4">
                            <BarChart2 className="h-10 w-10 text-green-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Stock por Sucursal</h3>
                                <p className="text-sm text-gray-600">Ver y monitorear el inventario de cada sucursal</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/transfers" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                            <ArrowLeftRight className="h-10 w-10 text-blue-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Transferencias</h3>
                                <p className="text-sm text-gray-600">Gestionar y aprobar transferencias entre sucursales</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/transfers/request" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-teal-500">
                        <div className="flex items-center gap-4">
                            <Send className="h-10 w-10 text-teal-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Solicitar Transferencia</h3>
                                <p className="text-sm text-gray-600">Pedir productos de otra sucursal o fábrica</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/kardex" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-purple-500">
                        <div className="flex items-center gap-4">
                            <FileText className="h-10 w-10 text-purple-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Kardex</h3>
                                <p className="text-sm text-gray-600">Ver historial de movimientos</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/suggestions" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center gap-4">
                            <TrendingUp className="h-10 w-10 text-yellow-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Sugerencias de Reabasto</h3>
                                <p className="text-sm text-gray-600">Análisis predictivo de stock</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/internal-orders" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-cyan-500">
                        <div className="flex items-center gap-4">
                            <Package className="h-10 w-10 text-cyan-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Pedidos Internos</h3>
                                <p className="text-sm text-gray-600">Solicitudes de stock a la fábrica</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/mermas" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-red-500">
                        <div className="flex items-center gap-4">
                            <Trash2 className="h-10 w-10 text-red-500" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Registro de Merma</h3>
                                <p className="text-sm text-gray-600">Dar de baja stock por daño, vencimiento u otros</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/inventory/adjustments" className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-amber-500">
                        <div className="flex items-center gap-4">
                            <SlidersHorizontal className="h-10 w-10 text-amber-600" />
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">Ajuste de Stock</h3>
                                <p className="text-sm text-gray-600">Entrada, salida o corrección manual de inventario</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Nota Informativa */}
                <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-2">💡 Sistema Inteligente:</h3>
                    <p className="text-green-800">
                        El sistema de inventario calcula automáticamente los días restantes de stock
                        basándose en el promedio de ventas. Las sugerencias de reabastecimiento se
                        generan usando análisis predictivo para evitar quiebres de stock.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Vista Fábrica / Almacén ── */
function FactoryInventoryView({ branchName }: { branchName: string }) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Factory className="h-4 w-4" />
                        <span>Fábrica / Almacén</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="font-semibold text-gray-900">{branchName}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Panel de Fábrica</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Producción, materia prima y pedidos internos</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">

                {/* Módulos principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        {
                            href: '/factory/receiving',
                            icon: <PackagePlus className="h-7 w-7 text-green-700" />,
                            title: 'Recepción de Mercancía',
                            desc: 'Registrar ingreso de productos desde proveedores',
                            border: 'border-green-600',
                            bg: 'bg-green-50',
                        },
                        {
                            href: '/factory',
                            icon: <Factory className="h-7 w-7 text-blue-600" />,
                            title: 'Dashboard Fábrica',
                            desc: 'Resumen de producción, KPIs y últimas órdenes',
                            border: 'border-blue-500',
                            bg: 'bg-blue-50',
                        },
                        {
                            href: '/factory/production',
                            icon: <ClipboardList className="h-7 w-7 text-green-600" />,
                            title: 'Órdenes de Producción',
                            desc: 'Ver y gestionar órdenes activas y programadas',
                            border: 'border-green-500',
                            bg: 'bg-green-50',
                        },
                        {
                            href: '/factory/production/new',
                            icon: <TrendingUp className="h-7 w-7 text-emerald-600" />,
                            title: 'Nueva Orden',
                            desc: 'Crear una nueva orden de producción',
                            border: 'border-emerald-500',
                            bg: 'bg-emerald-50',
                        },
                        {
                            href: '/factory/recipes',
                            icon: <FileText className="h-7 w-7 text-purple-600" />,
                            title: 'Recetas (BOM)',
                            desc: 'Gestionar recetas y lista de materiales',
                            border: 'border-purple-500',
                            bg: 'bg-purple-50',
                        },
                        {
                            href: '/factory/materials',
                            icon: <Package className="h-7 w-7 text-cyan-600" />,
                            title: 'Materia Prima',
                            desc: 'Stock de ingredientes y materiales en almacén',
                            border: 'border-cyan-500',
                            bg: 'bg-cyan-50',
                        },
                        {
                            href: '/inventory/transfers',
                            icon: <ArrowLeftRight className="h-7 w-7 text-indigo-600" />,
                            title: 'Transferencias',
                            desc: 'Enviar stock a sucursales o recibir desde ellas',
                            border: 'border-indigo-500',
                            bg: 'bg-indigo-50',
                        },
                        {
                            href: '/inventory/internal-orders',
                            icon: <Send className="h-7 w-7 text-orange-600" />,
                            title: 'Pedidos Internos',
                            desc: 'Atender pedidos de stock de las sucursales',
                            border: 'border-orange-500',
                            bg: 'bg-orange-50',
                        },
                        {
                            href: '/inventory/kardex',
                            icon: <BarChart2 className="h-7 w-7 text-slate-600" />,
                            title: 'Kardex',
                            desc: 'Historial de entradas y salidas de inventario',
                            border: 'border-slate-500',
                            bg: 'bg-slate-50',
                        },
                        {
                            href: '/inventory/adjustments',
                            icon: <SlidersHorizontal className="h-7 w-7 text-amber-600" />,
                            title: 'Ajuste de Stock',
                            desc: 'Corrección manual de inventario en almacén',
                            border: 'border-amber-500',
                            bg: 'bg-amber-50',
                        },
                    ].map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition group border-l-4 ${item.border}`}
                        >
                            <div className={`${item.bg} rounded-xl p-3 flex-shrink-0`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition" />
                        </Link>
                    ))}
                </div>

                {/* Nota */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-800">
                    <Factory className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p>
                        Sos parte de <strong>{branchName}</strong>. Desde acá gestionás la producción y el stock de materia prima.
                        Las sucursales te envían pedidos internos que podés gestionar desde{' '}
                        <Link href="/inventory/internal-orders" className="underline font-semibold hover:text-blue-900">Pedidos Internos</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Página principal — enruta por rol y tipo de sucursal ── */
export default function InventoryDashboardPage() {
    const { user, loading } = useSession();
    const [branchName, setBranchName] = useState('');

    const isAdmin    = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const isFactory  = !isAdmin && (user?.branchTypes ?? []).includes('FABRICA');
    const branchId   = user?.branchIds?.[0] ?? '';

    // Cargar nombre de la sucursal
    useEffect(() => {
        if (!isAdmin && branchId) {
            fetch('/api/admin/branches')
                .then(r => r.json())
                .then(d => {
                    if (d.success) {
                        const b = d.data.find((b: { id: string; name: string }) => b.id === branchId);
                        if (b) setBranchName(b.name);
                    }
                });
        }
    }, [isAdmin, branchId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    // Sin sucursal asignada
    if (!isAdmin && !branchId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-500">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-semibold">Sin sucursal asignada</p>
                <p className="text-sm mt-1">Contactá a tu administrador para que te asigne una sucursal.</p>
                <Link href="/" className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Volver al dashboard
                </Link>
            </div>
        );
    }

    // Fábrica / Almacén → dashboard de fábrica
    if (isFactory) {
        return <FactoryInventoryView branchName={branchName || 'Fábrica'} />;
    }

    // Cajero → vista de stock de su sucursal
    if (!isAdmin) {
        return <CashierInventoryView branchId={branchId} branchName={branchName || 'Mi sucursal'} />;
    }

    // Admin / Manager → menú completo
    return <AdminInventoryView />;
}
