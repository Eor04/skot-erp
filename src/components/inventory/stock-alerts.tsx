'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Timer, Package } from 'lucide-react';

interface AlertItem {
    id: string;
    productId: string;
    product: {
        name: string;
        sku: string;
    };
    currentStock: number;
    minStock: number;
    dailyAverage?: number;
    daysRemaining?: number | null;
    severity: 'CRITICO' | 'ALTO' | 'MEDIO';
    expirationDate?: Date;
}

interface StockAlertsProps {
    branchId?: string;
    onCreateTransfer?: (productId: string) => void;
}

export function StockAlerts({ branchId, onCreateTransfer }: StockAlertsProps) {
    const [alerts, setAlerts] = useState<{
        lowStock: AlertItem[];
        expiringSoon: any[];
        summary: any;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, [branchId]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const query = branchId ? `?branchId=${branchId}` : '';
            const response = await fetch(`/api/inventory/alerts${query}`);
            const result = await response.json();

            if (result.success) {
                setAlerts(result.data);
            }
        } catch (error) {
            console.error('Error al cargar alertas:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-24 bg-gray-200 rounded-lg"></div>
                <div className="h-24 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    if (!alerts) return null;

    const { lowStock, expiringSoon, summary } = alerts;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICO':
                return 'bg-red-100 border-red-500 text-red-800';
            case 'ALTO':
                return 'bg-orange-100 border-orange-500 text-orange-800';
            default:
                return 'bg-yellow-100 border-yellow-500 text-yellow-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">Stock Crítico</span>
                    </div>
                    <p className="text-3xl font-bold text-red-700 mt-2">{summary.critical}</p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-900">Stock Bajo</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-700 mt-2">
                        {summary.totalLowStock}
                    </p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-900">Próximo a Vencer</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-700 mt-2">
                        {summary.totalExpiring}
                    </p>
                </div>
            </div>

            {/* Lista de Productos con Stock Bajo */}
            {lowStock.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Productos con Stock Bajo
                    </h3>
                    <div className="space-y-2">
                        {lowStock.map((alert) => (
                            <div
                                key={alert.id}
                                className={`border-l-4 p-4 rounded-lg ${getSeverityColor(alert.severity)}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{alert.product.name}</h4>
                                        <p className="text-sm opacity-75">SKU: {alert.product.sku}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            <span>Stock actual: <strong>{alert.currentStock}</strong></span>
                                            <span>Mínimo: <strong>{alert.minStock}</strong></span>
                                            {alert.dailyAverage && (
                                                <span>Promedio diario: <strong>{alert.dailyAverage.toFixed(2)}</strong></span>
                                            )}
                                            {alert.daysRemaining !== null && alert.daysRemaining !== undefined && (
                                                <span className="font-semibold">
                                                    ⏱️ {alert.daysRemaining} día(s) restantes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {onCreateTransfer && (
                                        <button
                                            onClick={() => onCreateTransfer(alert.productId)}
                                            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Solicitar Transferencia
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Productos Próximos a Vencer */}
            {expiringSoon.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Productos Próximos a Vencer
                    </h3>
                    <div className="space-y-2">
                        {expiringSoon.map((item) => (
                            <div
                                key={item.id}
                                className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-yellow-900">{item.product.name}</h4>
                                        <p className="text-sm text-yellow-700">
                                            Vence: {new Date(item.expirationDate).toLocaleDateString('es-ES')}
                                        </p>
                                        <p className="text-sm text-yellow-700">
                                            Stock: {item.currentStock} | Lote: {item.batchNumber || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {lowStock.length === 0 && expiringSoon.length === 0 && (
                <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
                    <Package className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-800 font-medium">¡Todo en orden!</p>
                    <p className="text-green-600 text-sm">No hay alertas de stock en este momento.</p>
                </div>
            )}
        </div>
    );
}
