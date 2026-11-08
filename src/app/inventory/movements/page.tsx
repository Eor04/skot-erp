'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ArrowUp, ArrowDown, Minus, Search, Download, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

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
    IN:           { color: 'text-success', bg: 'bg-[var(--status-success-bg)]', Icon: ArrowUp, label: 'ENTRADA' },
    OUT:          { color: 'text-danger', bg: 'bg-[var(--status-error-bg)]', Icon: ArrowDown, label: 'SALIDA' },
    ENTRADA:      { color: 'text-success', bg: 'bg-[var(--status-success-bg)]', Icon: ArrowUp, label: 'ENTRADA' },
    SALIDA:       { color: 'text-danger', bg: 'bg-[var(--status-error-bg)]', Icon: ArrowDown, label: 'SALIDA' },
    AJUSTE:       { color: 'text-warning', bg: 'bg-[var(--status-warning-bg)]', Icon: Minus, label: 'AJUSTE' },
    PRODUCTION:   { color: 'text-info', bg: 'bg-[var(--status-info-bg)]', Icon: ArrowUp, label: 'PRODUCCIÓN' },
    TRANSFER_IN:  { color: 'text-success', bg: 'bg-[var(--status-success-bg)]', Icon: ArrowUp, label: 'TRANSFER IN' },
    TRANSFER_OUT: { color: 'text-warning', bg: 'bg-[var(--status-warning-bg)]', Icon: ArrowDown, label: 'TRANSFER OUT' },
    MERMA:        { color: 'text-danger', bg: 'bg-[var(--status-error-bg)]', Icon: ArrowDown, label: 'MERMA' },
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

    return <main data-brand="admin" className="skot-experience min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href="/inventory" className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline"><ArrowLeft size={18} aria-hidden="true" /> Volver a inventario</Link>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted"><FileText size={16} aria-hidden="true" /> Inventario <span aria-hidden="true">›</span> Movimientos</div>
                    <h1 className="font-display text-2xl font-semibold sm:text-3xl">Kardex de movimientos</h1>
                    <p className="mt-2 text-muted">{movements.length} movimientos registrados</p>
                </div>
                <Button size="touch" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}><Download size={18} aria-hidden="true" /> Exportar CSV ({filtered.length})</Button>
            </header>

            <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Resumen de movimientos">
                <Card className="p-3 sm:p-5"><p className="text-xs text-muted sm:text-sm">Movimientos</p><p className="mt-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{filtered.length}</p></Card>
                <Card className="p-3 sm:p-5"><p className="text-xs text-muted sm:text-sm">Entradas</p><p className="mt-2 font-display text-2xl font-semibold tabular-nums text-success sm:text-3xl">{totalEntradas.toFixed(2)}</p></Card>
                <Card className="p-3 sm:p-5"><p className="text-xs text-muted sm:text-sm">Salidas</p><p className="mt-2 font-display text-2xl font-semibold tabular-nums text-danger sm:text-3xl">{totalSalidas.toFixed(2)}</p></Card>
            </div>

            <Card className="space-y-4 p-4" aria-label="Filtros de movimientos">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-1"><label htmlFor="movement-search" className="mb-1 flex items-center gap-2 text-sm font-semibold"><Search size={16} aria-hidden="true" /> Buscar</label>
                        <input id="movement-search" type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Producto, sucursal o nota" className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink placeholder:text-muted" /></div>
                    <div><label htmlFor="movement-from" className="mb-1 flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} aria-hidden="true" /> Desde</label>
                        <input id="movement-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink" /></div>
                    <div><label htmlFor="movement-to" className="mb-1 flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} aria-hidden="true" /> Hasta</label>
                        <input id="movement-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink" /></div>
                </div>
                <div role="group" aria-label="Tipo de movimiento" className="flex flex-wrap gap-2">
                    {['', ...Object.keys(MOV_CFG)].map(type => <button key={type} type="button" aria-pressed={typeFilter === type} onClick={() => setTypeFilter(type)}
                        className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold ${typeFilter === type ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:bg-canvas'}`}>
                        {type ? (MOV_CFG[type]?.label || type) : 'Todos'}
                    </button>)}
                </div>
                {hasFilters && <Button variant="quiet" onClick={() => { setTypeFilter(''); setSearchTerm(''); setDateFrom(''); setDateTo(''); }}>Limpiar filtros</Button>}
            </Card>

            {loading ? <Card role="status" className="p-12 text-center text-muted">Cargando movimientos…</Card>
                : filtered.length === 0 ? <Card className="p-12 text-center text-muted"><FileText size={32} className="mx-auto mb-3" aria-hidden="true" />{hasFilters ? 'No hay movimientos con esos filtros' : 'No hay movimientos registrados'}</Card>
                    : <Card className="overflow-hidden"><div className="divide-y divide-line-subtle md:hidden">{filtered.map(m => {
                        const cfg = MOV_CFG[m.type] || MOV_CFG.AJUSTE;
                        const Icon = cfg.Icon;
                        return <article key={m.id} className="space-y-3 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 flex-1 break-words font-display font-semibold">{m.product?.name || '—'}</h2>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}><Icon size={14} className="mr-1" aria-hidden="true" />{cfg.label}</span></div>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div><dt className="text-muted">Cantidad</dt><dd className={`font-display font-semibold tabular-nums ${cfg.color}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</dd></div>
                                <div><dt className="text-muted">Anterior → Nuevo</dt><dd className="tabular-nums">{m.previousStock !== undefined ? `${m.previousStock} → ${m.newStock}` : '—'}</dd></div>
                                <div><dt className="text-muted">Sucursal</dt><dd className="break-words">{m.branch?.name || '—'}</dd></div>
                                <div><dt className="text-muted">Fecha</dt><dd>{new Date(m.createdAt).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</dd></div>
                                <div className="col-span-2"><dt className="text-muted">Notas</dt><dd className="break-words">{m.notes || m.reference || '—'}</dd></div>
                            </dl>
                        </article>;
                    })}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[800px] text-sm">
                        <thead className="bg-canvas text-muted"><tr>
                            <th scope="col" className="px-4 py-3 text-left">Producto</th><th scope="col" className="px-4 py-3 text-left">Tipo</th>
                            <th scope="col" className="px-4 py-3 text-right">Cantidad</th><th scope="col" className="px-4 py-3 text-left">Anterior → Nuevo</th>
                            <th scope="col" className="px-4 py-3 text-left">Sucursal</th><th scope="col" className="px-4 py-3 text-left">Notas</th><th scope="col" className="px-4 py-3 text-left">Fecha</th>
                        </tr></thead><tbody>{filtered.map(m => {
                            const cfg = MOV_CFG[m.type] || MOV_CFG.AJUSTE;
                            const Icon = cfg.Icon;
                            return <tr key={m.id} className="border-t border-line-subtle hover:bg-canvas">
                                <th scope="row" className="max-w-48 break-words px-4 py-3 text-left font-semibold">{m.product?.name || '—'}</th>
                                <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}><Icon size={14} className="mr-1" aria-hidden="true" />{cfg.label}</span></td>
                                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${cfg.color}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                                <td className="px-4 py-3 text-muted tabular-nums">{m.previousStock !== undefined ? <>{m.previousStock} → <strong className="text-ink">{m.newStock}</strong></> : '—'}</td>
                                <td className="max-w-40 break-words px-4 py-3">{m.branch?.name || '—'}</td>
                                <td className="max-w-48 break-words px-4 py-3 text-muted">{m.notes || m.reference || '—'}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(m.createdAt).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>;
                        })}</tbody>
                    </table></div><p className="border-t border-line-subtle px-4 py-3 text-sm text-muted">{filtered.length} de {movements.length} movimientos{hasFilters && <span className="ml-2"><StatusBadge tone="info">Filtros activos</StatusBadge></span>}</p></Card>}
        </div>
    </main>;
}
