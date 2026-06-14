import { Metadata } from 'next';
import Link from 'next/link';
import {
    Users, Store, Package, BarChart3, Settings, TrendingUp, DollarSign,
    Bell, Scale, ClipboardList, Settings2, Layers, Receipt, ShoppingBag,
    PackagePlus, ArrowLeftRight, Warehouse,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'Administración | Skot ERP',
    description: 'Panel de administración del sistema Skot ERP',
};

const colorMap: Record<string, string> = {
    blue:    'border-blue-500 text-blue-400 bg-blue-500/20',
    green:   'border-green-500 text-green-400 bg-green-500/20',
    orange:  'border-orange-500 text-orange-400 bg-orange-500/20',
    indigo:  'border-indigo-500 text-indigo-400 bg-indigo-500/20',
    purple:  'border-purple-500 text-purple-400 bg-purple-500/20',
    emerald: 'border-emerald-500 text-emerald-400 bg-emerald-500/20',
    red:     'border-red-500 text-red-400 bg-red-500/20',
    slate:   'border-slate-500 text-slate-400 bg-slate-500/20',
    violet:  'border-violet-500 text-violet-400 bg-violet-500/20',
    amber:   'border-amber-500 text-amber-400 bg-amber-500/20',
    teal:    'border-teal-500 text-teal-400 bg-teal-500/20',
    rose:    'border-rose-500 text-rose-400 bg-rose-500/20',
    cyan:    'border-cyan-500 text-cyan-400 bg-cyan-500/20',
    gray:    'border-white/30 text-white/70 bg-white/5',
};

type NavSection = { heading: string; items: { href: string; icon: any; title: string; description: string; color: string }[] };

const navSections: NavSection[] = [
    {
        heading: '🏢 Gestión Operacional',
        items: [
            {
                href: '/admin/users',
                icon: Users,
                title: 'Usuarios',
                description: 'Gestionar usuarios, roles y accesos al sistema',
                color: 'blue',
            },
            {
                href: '/admin/branches',
                icon: Store,
                title: 'Sucursales',
                description: 'Configurar y gestionar sucursales activas',
                color: 'green',
            },
            {
                href: '/admin/cash-closes',
                icon: ClipboardList,
                title: 'Cierres de Caja',
                description: 'Historial centralizado de sesiones de caja por sucursal',
                color: 'slate',
            },
            {
                href: '/admin/expenses',
                icon: Receipt,
                title: 'Gastos',
                description: 'Historial centralizado de gastos por sucursal y categoría',
                color: 'rose',
            },
        ],
    },
    {
        heading: '📦 Inventario & Catálogo',
        items: [
            {
                href: '/admin/products',
                icon: Package,
                title: 'Productos',
                description: 'Catálogo de productos — define qué existe en el inventario',
                color: 'orange',
            },
            {
                href: '/admin/combos',
                icon: Layers,
                title: 'Combos',
                description: 'Paquetes de productos a precio especial para el POS',
                color: 'teal',
            },
            {
                href: '/admin/modifiers',
                icon: Settings2,
                title: 'Modificadores',
                description: 'Extras y complementos para burgers, açaí y más',
                color: 'amber',
            },
            {
                href: '/admin/branch-products',
                icon: DollarSign,
                title: 'Precios por Sucursal',
                description: 'Asignar productos y precios a cada sucursal',
                color: 'emerald',
            },
            {
                href: '/admin/alerts',
                icon: Bell,
                title: 'Alertas de Stock',
                description: 'Productos con stock bajo o crítico por sucursal',
                color: 'red',
            },
            {
                href: '/inventory/kardex',
                icon: ArrowLeftRight,
                title: 'Kardex de Movimientos',
                description: 'Registro histórico de entradas, salidas y ajustes de stock',
                color: 'cyan',
            },
            {
                href: '/inventory',
                icon: Warehouse,
                title: 'Gestión de Inventario',
                description: 'Stock, transferencias, kardex y ajustes multi-sucursal',
                color: 'cyan',
            },
            {
                href: '/admin/purchase-orders',
                icon: ShoppingBag,
                title: 'Pedidos a Proveedores',
                description: 'Gestionar compras de materia prima e insumos',
                color: 'indigo',
            },
        ],
    },
    {
        heading: '📊 Ventas & Finanzas',
        items: [
            {
                href: '/admin/sales',
                icon: TrendingUp,
                title: 'Ventas',
                description: 'Historial de ventas con filtros por fecha y sucursal',
                color: 'indigo',
            },
            {
                href: '/admin/reports',
                icon: BarChart3,
                title: 'Reportes',
                description: 'Gráficos de ventas, ingresos y métodos de pago',
                color: 'purple',
            },
        ],
    },
    {
        heading: '⚙️ Configuración',
        items: [
            {
                href: '/admin/scale-config',
                icon: Scale,
                title: 'Configuración Balanza',
                description: 'Parámetros de la balanza Prix 4 por sucursal',
                color: 'violet',
            },
        ],
    },
];

export default function AdminPage() {
    return (
        <div className="min-h-screen relative overflow-hidden p-4 md:p-8" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="mb-10">
                    <Link href="/" className="text-sm text-white/60 hover:text-white/80 mb-2 inline-block">
                        ← Volver al Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                        <Settings className="h-8 w-8 text-slate-600" />
                        Panel de Administración
                    </h1>
                    <p className="text-white/60 mt-1">Gestión completa del sistema Skot ERP</p>
                </div>

                {/* Secciones agrupadas */}
                <div className="space-y-10">
                    {navSections.map(section => (
                        <div key={section.heading}>
                            <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3 pl-1">
                                {section.heading}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.items.map(item => {
                                    const Icon = item.icon;
                                    const classes = colorMap[item.color];
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow hover:shadow-lg transition-all p-5 border-l-4 ${classes.split(' ')[0]} group`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${classes.split(' ')[2]}`}>
                                                    <Icon className={`h-6 w-6 ${classes.split(' ')[1]}`} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base text-white/90 group-hover:text-white/80">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-white/60">{item.description}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info del sistema */}
                <div className="mt-10 bg-slate-800 text-white rounded-2xl p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Información del Sistema
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-slate-400">Versión</p>
                            <p className="font-medium">1.0.0</p>
                        </div>
                        <div>
                            <p className="text-slate-400">Framework</p>
                            <p className="font-medium">Next.js 14</p>
                        </div>
                        <div>
                            <p className="text-slate-400">Base de datos</p>
                            <p className="font-medium">PostgreSQL</p>
                        </div>
                        <div>
                            <p className="text-slate-400">Estado</p>
                            <p className="font-medium text-green-400">🟢 Activo</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

