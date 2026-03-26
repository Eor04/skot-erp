'use client';

import { useSession } from '@/lib/session-context';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ShieldCheck, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';


/* ─── Módulos del sistema ─────────────────────────────────────────── */
const ALL_MODULES = [
    {
        href: '/acai', emoji: '🥤', title: 'POS Açaí',
        description: 'Punto de venta con balanza Prix 4. Venta por peso, toppings y pagos.',
        gradient: 'from-purple-500 to-pink-500', shadow: 'hover:shadow-purple-200', badge: 'Balanza Prix 4',
        showWhen: (role: string, types: string[]) =>
            ['ADMIN', 'MANAGER'].includes(role) || (role === 'CASHIER' && (types.length === 0 || types.includes('ACAI'))),
    },
    {
        href: '/burgers', emoji: '🍔', title: 'POS Burgers',
        description: 'Punto de venta táctil con modificadores, combos y gestión de carrito.',
        gradient: 'from-orange-500 to-amber-500', shadow: 'hover:shadow-orange-200', badge: 'Táctil',
        showWhen: (role: string, types: string[]) =>
            ['ADMIN', 'MANAGER'].includes(role) || (role === 'CASHIER' && (types.length === 0 || types.includes('HAMBURGUESAS'))),
    },
    {
        href: '/cash-close', emoji: '💰', title: 'Cierre de Caja',
        description: 'Registrá el cierre del turno: efectivo, tarjeta y diferencias.',
        gradient: 'from-slate-500 to-slate-700', shadow: 'hover:shadow-slate-200', badge: 'Turno',
        showWhen: (role: string) => ['ADMIN', 'MANAGER', 'CASHIER'].includes(role),
    },
    {
        href: '/expenses', emoji: '🧾', title: 'Gastos',
        description: 'Registrá pagos a proveedores, servicios y otros gastos operativos.',
        gradient: 'from-rose-500 to-red-500', shadow: 'hover:shadow-rose-200', badge: 'Proveedores',
        showWhen: (role: string) => ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE'].includes(role),
    },
    {
        href: '/factory', emoji: '🏭', title: 'Fábrica',
        description: 'Gestión de recetas, órdenes de producción y kardex de movimientos.',
        gradient: 'from-blue-500 to-cyan-500', shadow: 'hover:shadow-blue-200', badge: 'Producción',
        showWhen: (role: string, types: string[]) =>
            ['ADMIN', 'MANAGER'].includes(role) || (role === 'WAREHOUSE' && (types.length === 0 || types.includes('FABRICA'))),
    },
    {
        href: '/inventory', emoji: '📦', title: 'Inventario',
        description: 'Stock en tiempo real, alertas automáticas y transferencias entre sucursales.',
        gradient: 'from-green-500 to-teal-500', shadow: 'hover:shadow-green-200', badge: 'Multi-sucursal',
        showWhen: (role: string) => ['ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER'].includes(role),
    },
    {
        href: '/admin', emoji: '⚙️', title: 'Administración',
        description: 'Usuarios, sucursales, productos, reportes de ventas y configuración.',
        gradient: 'from-slate-600 to-slate-800', shadow: 'hover:shadow-slate-200', badge: 'Admin',
        showWhen: (role: string) => ['ADMIN', 'MANAGER'].includes(role),
    },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
    MANAGER: { label: 'Gerente', color: 'bg-blue-100 text-blue-700' },
    CASHIER: { label: 'Cajero', color: 'bg-green-100 text-green-700' },
    WAREHOUSE: { label: 'Almacén', color: 'bg-orange-100 text-orange-700' },
};

type DayStats = {
    totalSales: number;
    totalOrders: number;
};
type AlertSummary = {
    critical: number;
    totalLowStock: number;
    totalExpiring: number;
};
type CashStatus = {
    openCount: number;   // Cajas abiertas ahora mismo
    branches: string[];  // Nombres de sucursales con caja abierta
};

export default function HomePage() {
    const { user, loading, logout } = useSession();
    const router = useRouter();

    const [dayStats, setDayStats] = useState<DayStats | null>(null);
    const [alertStats, setAlertStats] = useState<AlertSummary | null>(null);
    const [cashStatus, setCashStatus] = useState<CashStatus | null>(null);
    const [statsLoaded, setStatsLoaded] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [loading, user, router]);

    // Cargar KPIs del día (solo para ADMIN/MANAGER)
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
                    totalSales: salesData.summary?.totalRevenue ?? items.reduce((s: number, x: any) => s + (x.total ?? 0), 0),
                    totalOrders: salesData.pagination?.total ?? items.length,
                });
            }
            if (alertsData.success) {
                const { summary } = alertsData.data;
                setAlertStats({
                    critical: summary.critical ?? 0,
                    totalLowStock: summary.totalLowStock ?? 0,
                    totalExpiring: summary.totalExpiring ?? 0,
                });
            }
            if (cashData.success) {
                const opens = (cashData.data || []).filter((s: any) => s.sessionStatus === 'OPEN');
                setCashStatus({
                    openCount: opens.length,
                    branches: opens.map((s: any) => s.branch?.name || '').filter(Boolean),
                });
            }
        } catch { /* silencioso */ }
        finally { setStatsLoaded(true); }
    };

    useEffect(() => { if (user) loadStats(); }, [user]);

    const visibleModules = useMemo(() => {
        if (!user) return [];
        const types = user.branchTypes || [];
        return ALL_MODULES.filter(m => m.showWhen(user.role, types));
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-[3px] border-white/20 border-t-purple-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            </div>
        );
    }

    const roleInfo = user ? ROLE_LABELS[user.role] : null;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const hasCritical = (alertStats?.critical ?? 0) > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

            {/* Barra superior */}
            {user && (
                <div className="border-b border-white/5 px-6 py-3">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <span className="text-white font-black text-lg">
                            <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">Skot</span> ERP
                        </span>
                        <div className="flex items-center gap-3">
                            <Link href="/profile" className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1 transition-colors group">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:ring-2 group-hover:ring-purple-400/50 transition-all">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-white text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
                                </div>
                            </Link>
                            {roleInfo && (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                                    {roleInfo.label}
                                </span>
                            )}
                            {user.branchTypes?.length > 0 && user.role !== 'ADMIN' && (
                                <div className="hidden sm:flex gap-1">
                                    {user.branchTypes.map(t => (
                                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                            {t === 'ACAI' ? '🥤' : t === 'HAMBURGUESAS' ? '🍔' : '🏭'} {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Notificaciones de stock — solo admin/manager */}
                            {isAdmin && <NotificationBell enabled={true} />}
                            <button onClick={logout}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner de alerta crítica */}
            {isAdmin && hasCritical && (
                <div className="bg-red-600/90 border-b border-red-500 px-6 py-2.5">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 animate-pulse" />
                            {alertStats!.critical} producto{alertStats!.critical !== 1 ? 's' : ''} sin stock · Acción requerida
                        </div>
                        <Link href="/admin/alerts"
                            className="text-xs font-bold text-white underline underline-offset-2 hover:no-underline">
                            Ver alertas →
                        </Link>
                    </div>
                </div>
            )}

            {/* Header hero */}
            <div className="px-8 pt-10 pb-8 text-center">
                <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 bg-white/10 backdrop-blur rounded-full border border-white/20">
                    <ShieldCheck className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-white/70 font-medium">
                        {user ? `Sesión activa — ${user.name}` : 'Sistema ERP Multi-Sucursal'}
                    </span>
                </div>
                <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                        Skot
                    </span>{' '}ERP
                </h1>
                <p className="text-slate-400 text-base max-w-xl mx-auto">
                    {user ? 'Seleccioná el módulo al que querés acceder' : 'Iniciá sesión para continuar'}
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-8 pb-16">

                {/* Panel de KPIs — solo ADMIN/MANAGER */}
                {isAdmin && statsLoaded && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        {/* Ventas del día */}
                        <div className="col-span-2 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Ventas de hoy</p>
                                <p className="text-2xl font-black text-white">
                                    Bs. {(dayStats?.totalSales ?? 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-400">{dayStats?.totalOrders ?? 0} pedidos</p>
                            </div>
                        </div>

                        {/* Estado de Caja */}
                        <Link href="/cash-close"
                            className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 flex items-center gap-3 hover:bg-white/15 transition-colors cursor-pointer">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cashStatus?.openCount ? 'bg-green-600' : 'bg-slate-600'
                                }`}>
                                <span className="text-lg">💰</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Estado de caja</p>
                                {cashStatus?.openCount ? (
                                    <>
                                        <p className="text-lg font-black text-green-400 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                                            Abierta
                                        </p>
                                        <p className="text-xs text-slate-400">{cashStatus.branches.join(', ')}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg font-black text-slate-400">Cerrada</p>
                                        <p className="text-xs text-slate-400">Sin sesión activa</p>
                                    </>
                                )}
                            </div>
                        </Link>

                        {/* Alertas de stock */}
                        <Link href="/admin/alerts"
                            className={`bg-white/10 backdrop-blur rounded-2xl p-4 border flex items-center gap-3 hover:bg-white/15 transition-colors cursor-pointer
                                ${hasCritical ? 'border-red-500/50' : 'border-white/10'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${hasCritical ? 'bg-red-600' : 'bg-yellow-600'}`}>
                                <span className="text-xl">🔔</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Stock bajo</p>
                                <p className={`text-2xl font-black ${hasCritical ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {alertStats?.totalLowStock ?? 0}
                                </p>
                                {alertStats?.critical ? (
                                    <p className="text-xs text-red-400">{alertStats.critical} sin stock</p>
                                ) : (
                                    <p className="text-xs text-slate-400">productos</p>
                                )}
                            </div>
                        </Link>

                        {/* Botón actualizar */}
                        <button onClick={loadStats}
                            className="col-span-2 md:col-span-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition py-1">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Actualizar datos
                        </button>
                    </div>
                )}

                {/* Grilla de módulos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleModules.map((mod) => (
                        <Link key={mod.href} href={mod.href}
                            className={`group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl ${mod.shadow} transition-all duration-200 hover:-translate-y-1 border border-slate-100`}>
                            {/* Badge */}
                            <span className={`absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${mod.gradient} text-white opacity-80`}>
                                {mod.badge}
                            </span>
                            {/* Icono */}
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-3xl mb-4 shadow-md group-hover:scale-105 transition-transform duration-200`}>
                                {mod.emoji}
                            </div>
                            {/* Texto */}
                            <h2 className="text-xl font-bold text-slate-800 mb-1">{mod.title}</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">{mod.description}</p>
                            {/* Flecha */}
                            <div className="mt-4 flex items-center text-sm font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
                                Abrir módulo
                                <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-10 text-center">
                    <p className="text-slate-500 text-xs">
                        🟢 Conectado &nbsp;·&nbsp; Skot ERP v1.0.0 &nbsp;·&nbsp;
                        <span className="text-slate-400">{user?.email}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
