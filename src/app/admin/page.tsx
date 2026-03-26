import { Metadata } from 'next';
import Link from 'next/link';
import { Users, Store, Package, BarChart3, Settings, TrendingUp, DollarSign, Bell, Scale, ClipboardList, Settings2, Layers, Receipt, ShoppingBag } from 'lucide-react';


export const metadata: Metadata = {
    title: 'Administración | Skot ERP',
    description: 'Panel de administración del sistema Skot ERP',
};

const sections = [
    {
        href: '/admin/users',
        icon: Users,
        title: 'Usuarios',
        description: 'Gestionar usuarios y roles del sistema',
        color: 'blue',
    },
    {
        href: '/admin/branches',
        icon: Store,
        title: 'Sucursales',
        description: 'Configurar y gestionar sucursales',
        color: 'green',
    },
    {
        href: '/admin/products',
        icon: Package,
        title: 'Productos',
        description: 'Catálogo de productos y precios',
        color: 'orange',
    },
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
        description: 'Productos con stock bajo o por vencer',
        color: 'red',
    },
    {
        href: '/admin/cash-closes',
        icon: ClipboardList,
        title: 'Cierres de Caja',
        description: 'Historial centralizado de sesiones de caja por sucursal',
        color: 'slate',
    },
    {
        href: '/admin/scale-config',
        icon: Scale,
        title: 'Configuración Balanza',
        description: 'Parámetros de la balanza Prix 4 por sucursal',
        color: 'violet',
    },
    {
        href: '/admin/modifiers',
        icon: Settings2,
        title: 'Modificadores',
        description: 'Extras y complementos para burgers, açaí y más',
        color: 'amber',
    },
    {
        href: '/admin/combos',
        icon: Layers,
        title: 'Combos',
        description: 'Paquetes de productos a precio especial para el POS',
        color: 'teal',
    },
    {
        href: '/admin/expenses',
        icon: Receipt,
        title: 'Gastos',
        description: 'Historial centralizado de gastos por sucursal y categoría',
        color: 'rose',
    },
    {
        href: '/admin/purchase-orders',
        icon: ShoppingBag,
        title: 'Pedidos a Proveedores',
        description: 'Gestionar compras de materia prima e insumos',
        color: 'indigo',
    },
];

const colorMap: Record<string, string> = {
    blue: 'border-blue-500 text-blue-600 bg-blue-50',
    green: 'border-green-500 text-green-600 bg-green-50',
    orange: 'border-orange-500 text-orange-600 bg-orange-50',
    indigo: 'border-indigo-500 text-indigo-600 bg-indigo-50',
    purple: 'border-purple-500 text-purple-600 bg-purple-50',
    emerald: 'border-emerald-500 text-emerald-600 bg-emerald-50',
    red: 'border-red-500 text-red-600 bg-red-50',
    slate: 'border-slate-500 text-slate-600 bg-slate-50',
    violet: 'border-violet-500 text-violet-600 bg-violet-50',
    amber: 'border-amber-500 text-amber-600 bg-amber-50',
    teal: 'border-teal-500 text-teal-600 bg-teal-50',
    rose: 'border-rose-500 text-rose-600 bg-rose-50',
};


export default function AdminPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
                        ← Volver al Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Settings className="h-8 w-8 text-slate-600" />
                        Panel de Administración
                    </h1>
                    <p className="text-gray-500 mt-1">Gestión completa del sistema Skot ERP</p>
                </div>

                {/* Secciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const classes = colorMap[section.color];
                        return (
                            <Link
                                key={section.href}
                                href={section.href}
                                className={`bg-white rounded-2xl shadow hover:shadow-lg transition-all p-6 border-l-4 ${classes.split(' ')[0]} group`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${classes.split(' ')[2]}`}>
                                        <Icon className={`h-7 w-7 ${classes.split(' ')[1]}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-gray-700">
                                            {section.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">{section.description}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Info del sistema */}
                <div className="mt-8 bg-slate-800 text-white rounded-2xl p-6">
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
