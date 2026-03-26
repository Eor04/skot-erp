'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ArrowUp, ArrowDown, Minus, Search, Download, CalendarDays } from 'lucide-react';

type Movement = {
    id: string;
    product: { name: string };
    branch: { name: string };
    type: string;
    quantity: number;
    previousStock?: number;
    newStock?: number;
    notes?: string;
    reference?: string;
    createdAt: string;
};

const MOV_CFG: Record<string, { color: string; bg: string; Icon: React.ElementType; label: string }> = {
    IN:           { color: 'text-green-700',  bg: 'bg-green-100',  Icon: ArrowUp,   label: 'ENTRADA' },
    OUT:          { color: 'text-red-700',    bg: 'bg-red-100',    Icon: ArrowDown, label: 'SALIDA' },
    ENTRADA:      { color: 'text-green-700',  bg: 'bg-green-100',  Icon: ArrowUp,   label: 'ENTRADA' },
    SALIDA:       { color: 'text-red-700',    bg: 'bg-red-100',    Icon: ArrowDown, label: 'SALIDA' },
    AJUSTE:       { color: 'text-yellow-700', bg: 'bg-yellow-100', Icon: Minus,     label: 'AJUSTE' },
    PRODUCTION:   { color: 'text-blue-700',   bg: 'bg-blue-100',   Icon: ArrowUp,   label: 'PRODUCCIÓN' },
    TRANSFER_IN:  { color: 'text-teal-700',   bg: 'bg-teal-100',   Icon: ArrowUp,   label: 'TRANSFER IN' },
    TRANSFER_OUT: { color: 'text-orange-700', bg: 'bg-orange-100', Icon: ArrowDown, label: 'TRANSFER OUT' },
    MERMA:        { color: 'text-rose-700',   bg: 'bg-rose-100',   Icon: ArrowDown, label: 'MERMA' },
};

function exportCSV(rows: Movement[]) {
    const header = ['Fecha', 'Producto', 'Sucursal', 'Tipo', 'Cantidad', 'Stock anterior', 'Stock nuevo', 'Referencia', 'Notas'];
    const lines = rows.map(m => [
        new Date(m.createdAt).toLocaleString('es-BO'),
        m.product?.name || '',
        m.branch?.name || '',
        MOV_CFG[m.type]?.label || m.type,
        m.quantity,
        m.previousStock ?? '',
        m.newStock ?? '',
        m.reference || '',
        (m.notes || '').replace(/,/g, ';'),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `kardex_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function MovementsPage() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading,   setLoading]   = useState(true);

    // Filtros
    const [typeFilter,   setTypeFilter]   = useState('');
    const [searchTerm,   setSearchTerm]   = useState('');
    const [dateFrom,     setDateFrom]     = useState('');
    const [dateTo,       setDateTo]       = useState('');

    useEffect(() => {
        fetch('/api/inventory/movements?limit=500')
            .then(r => r.json())
            .then(d => { if (d.success) setMovements(Array.isArray(d.data) ? d.data : (d.data?.movements ?? [])); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        return movements.filter(m => {
            if (typeFilter && m.type !== typeFilter) return false;
            if (searchTerm && !m.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !m.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (dateFrom && new Date(m.createdAt) < new Date(dateFrom)) return false;
            if (dateTo) {
                const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
                if (new Date(m.createdAt) > end) return false;
            }
            return true;
        });
    }, [movements, typeFilter, searchTerm, dateFrom, dateTo]);

    // Totales
    const totalEntradas = filtered.filter(m => ['IN', 'ENTRADA', 'TRANSFER_IN', 'PRODUCTION'].includes(m.type)).reduce((s, m) => s + Math.abs(m.quantity), 0);
    const totalSalidas  = filtered.filter(m => ['OUT', 'SALIDA', 'TRANSFER_OUT', 'MERMA'].includes(m.type)).reduce((s, m) => s + Math.abs(m.quantity), 0);

    const hasFilters = typeFilter || searchTerm || dateFrom || dateTo;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Inventario
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText className="h-7 w-7 text-purple-600" /> Kardex de Movimientos
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {movements.length} movimientos totales
                        </p>
                    </div>
                    <button
                        onClick={() => exportCSV(filtered)}
                        disabled={filtered.length === 0}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow">
                        <Download className="h-4 w-4" /> Exportar CSV ({filtered.length})
                    </button>
                </div>

                {/* KPIs rápidos */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs text-gray-500 font-medium">Total movimientos</p>
                        <p className="text-2xl font-black text-gray-800 mt-1">{filtered.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
                        <p className="text-xs text-green-600 font-medium">↑ Entradas</p>
                        <p className="text-2xl font-black text-green-700 mt-1">{totalEntradas.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
                        <p className="text-xs text-red-600 font-medium">↓ Salidas</p>
                        <p className="text-2xl font-black text-red-700 mt-1">{totalSalidas.toFixed(2)}</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
                    <div className="flex flex-wrap gap-3">
                        {/* Búsqueda */}
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar producto, sucursal o nota…"
                                className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                        </div>
                        {/* Fecha desde */}
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>
                        {/* Fecha hasta */}
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>
                        {/* Tipo */}
                        <div className="flex gap-1.5 flex-wrap items-center">
                            {['', ...Object.keys(MOV_CFG)].map(type => (
                                <button key={type} onClick={() => setTypeFilter(type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${typeFilter === type ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {type ? (MOV_CFG[type]?.label || type) : 'Todos'}
                                </button>
                            ))}
                        </div>
                        {hasFilters && (
                            <button onClick={() => { setTypeFilter(''); setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                                className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1">
                                ✕ Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando movimientos…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>{hasFilters ? 'No hay movimientos con esos filtros' : 'No hay movimientos registrados'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Producto</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Cantidad</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Ant. → Nuevo</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Sucursal</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Notas</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(m => {
                                        const cfg = MOV_CFG[m.type] || MOV_CFG['AJUSTE'];
                                        const Icon = cfg.Icon;
                                        return (
                                            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 font-medium text-gray-900">{m.product?.name || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${cfg.bg} ${cfg.color}`}>
                                                        <Icon className="h-3 w-3" /> {cfg.label}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 font-bold ${cfg.color}`}>
                                                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                                                    {m.previousStock !== undefined
                                                        ? <>{m.previousStock} → <span className="font-semibold text-gray-600">{m.newStock}</span></>
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{m.branch?.name || '—'}</td>
                                                <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate hidden lg:table-cell">
                                                    {m.notes || m.reference || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                    {new Date(m.createdAt).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-100 flex justify-between">
                            <span>{filtered.length} de {movements.length} movimientos</span>
                            {hasFilters && <span className="text-purple-600 font-medium">Filtros activos</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
