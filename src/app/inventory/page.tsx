import { Metadata } from 'next';
import Link from 'next/link';
import { StockAlerts } from '@/components/inventory/stock-alerts';
import { Package, TrendingUp, FileText, ArrowLeftRight, BarChart2, Send, Trash2, SlidersHorizontal } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Gestión de Inventario | Skot ERP',
    description: 'Panel de control de inventario multi-ubicación y alertas inteligentes',
};

export default function InventoryDashboardPage() {
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
                        Control de stock multi-ubicación con alertas inteligentes
                    </p>
                </div>

                {/* Alertas de Stock */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Alertas de Stock</h2>
                    <StockAlerts />
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
