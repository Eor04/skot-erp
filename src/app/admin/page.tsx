import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowLeftRight, BarChart3, Bell, ClipboardList, DollarSign, Layers, Package, Receipt, Scale, Settings2, ShoppingBag, Store, TrendingUp, Users, Warehouse } from 'lucide-react';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
    title: 'Administración | Skot ERP',
    description: 'Panel de administración del sistema Skot ERP',
};

const navSections = [
    { heading: 'Gestión operacional', items: [
        { href: '/admin/users', Icon: Users, title: 'Usuarios', description: 'Usuarios, roles y accesos' },
        { href: '/admin/branches', Icon: Store, title: 'Sucursales', description: 'Configuración de sucursales' },
        { href: '/admin/cash-closes', Icon: ClipboardList, title: 'Cierres de caja', description: 'Historial de turnos por sucursal' },
        { href: '/admin/expenses', Icon: Receipt, title: 'Gastos', description: 'Gastos por sucursal y categoría' },
    ] },
    { heading: 'Inventario y catálogo', items: [
        { href: '/admin/products', Icon: Package, title: 'Productos', description: 'Catálogo e inventario' },
        { href: '/admin/combos', Icon: Layers, title: 'Combos', description: 'Paquetes de productos para el POS' },
        { href: '/admin/modifiers', Icon: Settings2, title: 'Modificadores', description: 'Extras y complementos' },
        { href: '/admin/branch-products', Icon: DollarSign, title: 'Precios por sucursal', description: 'Asignación de productos y precios' },
        { href: '/admin/alerts', Icon: Bell, title: 'Alertas de stock', description: 'Productos con stock bajo o crítico' },
        { href: '/inventory/kardex', Icon: ArrowLeftRight, title: 'Kardex de movimientos', description: 'Entradas, salidas y ajustes de stock' },
        { href: '/inventory', Icon: Warehouse, title: 'Gestión de inventario', description: 'Stock y transferencias entre sucursales' },
        { href: '/admin/purchase-orders', Icon: ShoppingBag, title: 'Pedidos a proveedores', description: 'Compras de materia prima e insumos' },
    ] },
    { heading: 'Ventas y finanzas', items: [
        { href: '/admin/sales', Icon: TrendingUp, title: 'Ventas', description: 'Historial con filtros por fecha y sucursal' },
        { href: '/admin/reports', Icon: BarChart3, title: 'Reportes', description: 'Ingresos y métodos de pago' },
    ] },
    { heading: 'Configuración', items: [
        { href: '/admin/scale-config', Icon: Scale, title: 'Configuración de balanza', description: 'Parámetros Prix 4 por sucursal' },
    ] },
];

export default async function AdminPage() {
    const session = await getSession();
    return <main data-brand="admin" className="skot-experience px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
            <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} /> Volver al inicio</Link>
            <header className="mb-8"><h1 className="text-3xl font-semibold">Administración</h1><p className="mt-2 text-muted">Gestioná el catálogo, las sucursales y las operaciones.</p></header>
            <div className="space-y-8">{navSections.map(section => <section key={section.heading} aria-labelledby={`section-${section.heading.replaceAll(' ', '-')}`}>
                <h2 id={`section-${section.heading.replaceAll(' ', '-')}`} className="mb-3 text-lg font-semibold">{section.heading}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{section.items.filter(item => item.href !== '/admin/users' || session?.role === 'ADMIN').map(item => <Link key={item.href} href={item.href} className="group flex min-h-28 items-start gap-3 rounded-xl border border-line-subtle bg-surface p-5 hover:border-brand">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--status-neutral-bg)] text-brand"><item.Icon size={20} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><strong className="block font-display">{item.title}</strong><span className="mt-1 block text-sm text-muted">{item.description}</span></span><ArrowRight size={17} className="mt-2 text-muted group-hover:text-brand" aria-hidden="true" />
                </Link>)}</div>
            </section>)}</div>
            <section className="mt-8 rounded-xl border border-line-subtle bg-surface p-5" aria-label="Información del sistema"><h2 className="font-semibold">Información del sistema</h2><div className="mt-3 grid gap-3 text-sm sm:grid-cols-4"><p><span className="block text-muted">Versión</span>1.0.0</p><p><span className="block text-muted">Framework</span>Next.js 14</p><p><span className="block text-muted">Base de datos</span>PostgreSQL</p><p><span className="block text-muted">Estado</span>Activo</p></div></section>
        </div>
    </main>;
}
