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
        href: '/acai', emoji: '🥤', logo: '/logo-acai.png', title: 'POS Açaí',
        description: 'Punto de venta con balanza Prix 4. Venta por peso, toppings y pagos.',
        gradient: 'linear-gradient(135deg,#9333ea,#ec4899)', badge: 'Balanza Prix 4', glow: 'rgba(147,51,234,0.35)',
        showWhen: (role: string, types: string[]) =>
            ['ADMIN', 'MANAGER'].includes(role) || (role === 'CASHIER' && (types.length === 0 || types.includes('ACAI'))),
    },
    {
        href: '/burgers', emoji: '🍔', logo: '/logo-burger.png', title: 'POS Burgers',
        description: 'Punto de venta táctil con modificadores, combos y gestión de carrito.',
        gradient: 'linear-gradient(135deg,#f97316,#eab308)', badge: 'Táctil', glow: 'rgba(249,115,22,0.35)',
        showWhen: (role: string, types: string[]) =>
            ['ADMIN', 'MANAGER'].includes(role) || (role === 'CASHIER' && (types.length === 0 || types.includes('HAMBURGUESAS'))),
    },
    {
        href: '/cash-close', emoji: '💰', logo: '', title: 'Cierre de Caja',
        description: 'Registrá el cierre del turno: efectivo, tarjeta y diferencias.',
        gradient: 'linear-gradient(135deg,#64748b,#334155)', badge: 'Turno', glow: 'rgba(100,116,139,0.3)',
        showWhen: (role: string) => ['ADMIN', 'MANAGER', 'CASHIER'].includes(role),
    },
    {
        href: '/expenses', emoji: '🧾', logo: '', title: 'Gastos',
        description: 'Registrá pagos a proveedores, servicios y otros gastos operativos.',
        gradient: 'linear-gradient(135deg,#dc2626,#db2777)', badge: 'Proveedores', glow: 'rgba(220,38,38,0.3)',
        showWhen: (role: string) => ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE'].includes(role),
    },
    {
        href: '/factory', emoji: '🏭', logo: '', title: 'Fábrica',
        description: 'Gestión de recetas, órdenes de producción y kardex de movimientos.',
        gradient: 'linear-gradient(135deg,#2563eb,#0891b2)', badge: 'Producción', glow: 'rgba(37,99,235,0.3)',
        showWhen: (role: string, types: string[]) =>
            ['ADMIN', 'MANAGER'].includes(role) || (role === 'WAREHOUSE' && (types.length === 0 || types.includes('FABRICA'))),
    },
    {
        href: '/inventory', emoji: '📦', logo: '', title: 'Inventario',
        description: 'Stock en tiempo real, alertas automáticas y transferencias entre sucursales.',
        gradient: 'linear-gradient(135deg,#059669,#0d9488)', badge: 'Multi-sucursal', glow: 'rgba(5,150,105,0.3)',
        showWhen: (role: string) => ['ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER'].includes(role),
    },
    {
        href: '/admin', emoji: '⚙️', logo: '', title: 'Administración',
        description: 'Usuarios, sucursales, productos, reportes de ventas y configuración.',
        gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)', badge: 'Admin', glow: 'rgba(79,70,229,0.3)',
        showWhen: (role: string) => ['ADMIN', 'MANAGER'].includes(role),
    },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Administrador', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
    MANAGER: { label: 'Gerente', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
    CASHIER: { label: 'Cajero', color: 'bg-green-500/20 text-green-300 border border-green-500/30' },
    WAREHOUSE: { label: 'Almacén', color: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
};

type DayStats = { totalSales: number; totalOrders: number };
type AlertSummary = { critical: number; totalLowStock: number; totalExpiring: number };
type CashStatus = { openCount: number; branches: string[] };

// Fondo idéntico al login
const BG_STYLE = {
    background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)',
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
                setAlertStats({ critical: summary.critical ?? 0, totalLowStock: summary.totalLowStock ?? 0, totalExpiring: summary.totalExpiring ?? 0 });
            }
            if (cashData.success) {
                const opens = (cashData.data || []).filter((s: any) => s.sessionStatus === 'OPEN');
                setCashStatus({ openCount: opens.length, branches: opens.map((s: any) => s.branch?.name || '').filter(Boolean) });
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

    // Loading screen
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={BG_STYLE}>
                <div className="text-center">
                    <div className="w-12 h-12 border-[3px] border-white/20 border-t-pink-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando...</p>
                </div>
            </div>
        );
    }

    const roleInfo = user ? ROLE_LABELS[user.role] : null;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const hasCritical = (alertStats?.critical ?? 0) > 0;

    return (
        <div className="min-h-screen relative overflow-hidden" style={BG_STYLE}>

            {/* Glows de fondo — igual que el login */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: '56px 100px',
                    }} />
            </div>

            {/* ── Navbar ── */}
            {user && (
                <div className="relative z-10 border-b px-6 py-3"
                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)' }}>
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        {/* Logo */}
                        <img src="/logo-skot.png" alt="Skot" className="h-9 w-auto object-contain"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.5))' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />

                        <div className="flex items-center gap-3">
                            <Link href="/profile"
                                className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors"
                                style={{ color: 'rgba(255,255,255,0.8)' }}>
                                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#9333ea,#ec4899)' }}>
                                    <User className="h-4 w-4 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-white text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
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
                                        <span key={t} className="text-xs px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                                            {t === 'ACAI' ? '🥤' : t === 'HAMBURGUESAS' ? '🍔' : '🏭'} {t}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {isAdmin && <NotificationBell enabled={true} />}

                            <button onClick={logout}
                                className="flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-lg"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner alerta crítica */}
            {isAdmin && hasCritical && (
                <div className="relative z-10 px-6 py-2.5"
                    style={{ background: 'rgba(220,38,38,0.85)', borderBottom: '1px solid rgba(220,38,38,0.5)' }}>
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 animate-pulse" />
                            {alertStats!.critical} producto{alertStats!.critical !== 1 ? 's' : ''} sin stock · Acción requerida
                        </div>
                        <Link href="/admin/alerts" className="text-xs font-bold text-white underline underline-offset-2 hover:no-underline">
                            Ver alertas →
                        </Link>
                    </div>
                </div>
            )}

            {/* ── Hero ── */}
            <div className="relative z-10 px-8 pt-10 pb-8 text-center flex flex-col items-center">
                {/* Logo grande centrado */}
                <div className="mb-5" style={{ filter: 'drop-shadow(0 0 50px rgba(236,72,153,0.5))' }}>
                    <img src="/logo-skot.png" alt="Skot"
                        className="h-28 w-auto mx-auto object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>

                {/* Badge sesión activa */}
                <div className="inline-flex items-center gap-3 mb-3 px-4 py-2 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                    <ShieldCheck className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {user ? `Sesión activa — ${user.name}` : 'Sistema ERP Multi-Sucursal'}
                    </span>
                </div>

                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {user ? 'Seleccioná el módulo al que querés acceder' : 'Iniciá sesión para continuar'}
                </p>
            </div>

            {/* ── Contenido ── */}
            <div className="relative z-10 max-w-5xl mx-auto px-8 pb-16">

                {/* KPIs */}
                {isAdmin && statsLoaded && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        {/* Ventas del día */}
                        <div className="col-span-2 rounded-2xl p-4 flex items-center gap-4"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Ventas de hoy</p>
                                <p className="text-2xl font-black text-white">Bs. {(dayStats?.totalSales ?? 0).toFixed(2)}</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{dayStats?.totalOrders ?? 0} pedidos</p>
                            </div>
                        </div>

                        {/* Estado de Caja */}
                        <Link href="/cash-close" className="rounded-2xl p-4 flex items-center gap-3 transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: cashStatus?.openCount ? '#16a34a' : '#334155' }}>
                                <span className="text-lg">💰</span>
                            </div>
                            <div>
                                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Estado de caja</p>
                                {cashStatus?.openCount ? (
                                    <>
                                        <p className="text-lg font-black text-green-400 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />Abierta
                                        </p>
                                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{cashStatus.branches.join(', ')}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.4)' }}>Cerrada</p>
                                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin sesión activa</p>
                                    </>
                                )}
                            </div>
                        </Link>

                        {/* Alertas de stock */}
                        <Link href="/admin/alerts" className="rounded-2xl p-4 flex items-center gap-3 transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: hasCritical ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(12px)',
                            }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: hasCritical ? '#dc2626' : '#92400e' }}>
                                <span className="text-xl">🔔</span>
                            </div>
                            <div>
                                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Stock bajo</p>
                                <p className={`text-2xl font-black ${hasCritical ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {alertStats?.totalLowStock ?? 0}
                                </p>
                                <p className="text-xs" style={{ color: hasCritical ? 'rgba(248,113,113,0.8)' : 'rgba(255,255,255,0.3)' }}>
                                    {alertStats?.critical ? `${alertStats.critical} sin stock` : 'productos'}
                                </p>
                            </div>
                        </Link>

                        <button onClick={loadStats}
                            className="col-span-2 md:col-span-4 flex items-center justify-center gap-1.5 text-xs transition py-1"
                            style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <RefreshCw className="h-3.5 w-3.5" /> Actualizar datos
                        </button>
                    </div>
                )}

                {/* Grilla de módulos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleModules.map((mod) => (
                        <Link key={mod.href} href={mod.href}
                            className="group relative rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${mod.glow}, 0 4px 24px rgba(0,0,0,0.4)`;
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                            }}>
                            {/* Badge */}
                            <span className="absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                                style={{ background: mod.gradient, opacity: 0.85 }}>
                                {mod.badge}
                            </span>
                            {/* Ícono — logo si existe, sino fondo degradado con emoji */}
                            {mod.logo ? (
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-200"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <img src={mod.logo} alt={mod.title}
                                        className="w-full h-full object-contain p-1"
                                        onError={e => {
                                            const parent = (e.target as HTMLImageElement).parentElement!;
                                            parent.style.background = mod.gradient;
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            parent.innerHTML = `<span style='font-size:2rem'>${mod.emoji}</span>`;
                                        }} />
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-105 transition-transform duration-200"
                                    style={{ background: mod.gradient }}>
                                    {mod.emoji}
                                </div>
                            )}
                            {/* Texto */}
                            <h2 className="text-xl font-bold text-white mb-1">{mod.title}</h2>
                            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{mod.description}</p>
                            {/* Flecha */}
                            <div className="mt-4 flex items-center text-sm font-semibold transition-colors"
                                style={{ color: 'rgba(255,255,255,0.3)' }}>
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
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        🟢 Conectado &nbsp;·&nbsp; Skot v1.0 &nbsp;·&nbsp; {user?.email}
                    </p>
                </div>
            </div>
        </div>
    );
}
