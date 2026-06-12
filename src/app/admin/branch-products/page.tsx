'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, DollarSign, Search, CheckCircle2, AlertCircle,
    Store, Save, ToggleRight, ToggleLeft
} from 'lucide-react';

type Branch = { id: string; name: string; type: string };
type BPRow = {
    productId: string;
    productName: string;
    sku: string;
    type: string;
    unit: string;
    branchProductId: string | null;
    customPrice: number | null;
    pricePerKg: number | null;
    active: boolean;
    assigned: boolean;
};

const TYPE_LABELS: Record<string, string> = {
    ACAI_BASE: 'Base Açaí', ACAI_TOPPING: 'Topping Açaí',
    BURGER: 'Hamburguesa', BURGER_EXTRA: 'Extra / Porción',
    BEVERAGE: 'Bebida', RAW_MATERIAL: 'Materia Prima', PACKAGING: 'Empaque',
};
const TYPE_COLORS: Record<string, string> = {
    ACAI_BASE: 'bg-purple-100 text-purple-700', ACAI_TOPPING: 'bg-pink-100 text-pink-700',
    BURGER: 'bg-orange-100 text-orange-700', BURGER_EXTRA: 'bg-amber-100 text-amber-700',
    BEVERAGE: 'bg-blue-100 text-blue-700', RAW_MATERIAL: 'bg-gray-100 text-gray-700',
    PACKAGING: 'bg-teal-100 text-teal-700',
};

export default function BranchProductsPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [rows, setRows] = useState<BPRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [editedRows, setEditedRows] = useState<Record<string, Partial<BPRow>>>({});

    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) setBranches(d.data);
        });
    }, []);

    const loadProducts = useCallback(async (branchId: string) => {
        if (!branchId) return;
        setLoading(true);
        setEditedRows({});
        try {
            const res = await fetch(`/api/admin/branch-products?branchId=${branchId}`);
            const d = await res.json();
            if (d.success) setRows(d.data);
        } catch { showToast('error', 'Error al cargar productos'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (selectedBranch) loadProducts(selectedBranch);
    }, [selectedBranch, loadProducts]);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    }

    function handleFieldChange(productId: string, field: string, value: any) {
        setEditedRows(prev => ({
            ...prev,
            [productId]: { ...prev[productId], [field]: value },
        }));
    }

    function getRowValue(row: BPRow, field: keyof BPRow) {
        const edited = editedRows[row.productId];
        if (edited && field in edited) return (edited as any)[field];
        return row[field];
    }

    function isRowDirty(productId: string) {
        return !!editedRows[productId];
    }

    async function handleSave(row: BPRow) {
        const edited = editedRows[row.productId] || {};
        const customPrice = edited.customPrice !== undefined ? edited.customPrice : row.customPrice;
        const pricePerKg = edited.pricePerKg !== undefined ? edited.pricePerKg : row.pricePerKg;
        const active = edited.active !== undefined ? edited.active : row.active;

        setSaving(row.productId);
        try {
            const res = await fetch('/api/admin/branch-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: selectedBranch,
                    productId: row.productId,
                    customPrice: customPrice ? Number(customPrice) : null,
                    pricePerKg: pricePerKg ? Number(pricePerKg) : null,
                    active,
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', `✅ ${row.productName} guardado`);
                // Limpiar edición y recargar
                setEditedRows(prev => {
                    const next = { ...prev };
                    delete next[row.productId];
                    return next;
                });
                loadProducts(selectedBranch);
            } else {
                showToast('error', d.error || 'Error al guardar');
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSaving(null); }
    }

    async function handleToggleActive(row: BPRow) {
        const newActive = !getRowValue(row, 'active');
        setSaving(row.productId);
        try {
            const res = await fetch('/api/admin/branch-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: selectedBranch,
                    productId: row.productId,
                    customPrice: row.customPrice,
                    pricePerKg: row.pricePerKg,
                    active: newActive,
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', newActive ? `✅ ${row.productName} activado` : `⏸ ${row.productName} desactivado`);
                loadProducts(selectedBranch);
            }
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSaving(null); }
    }

    // Tipos únicos para filtro
    const uniqueTypes = [...new Set(rows.map(r => r.type))];

    // Filtrado
    const filtered = rows.filter(r => {
        const matchSearch = r.productName.toLowerCase().includes(search.toLowerCase()) ||
            r.sku.toLowerCase().includes(search.toLowerCase());
        const matchType = !typeFilter || r.type === typeFilter;
        return matchSearch && matchType;
    });

    const assignedCount = rows.filter(r => r.assigned).length;
    const branch = branches.find(b => b.id === selectedBranch);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Volver a Admin
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-green-600" /> Precios por Sucursal
                    </h1>
                    <p className="text-gray-500 mt-1">Asigna productos y precios personalizados a cada sucursal</p>
                </div>

                {/* Selector de sucursal */}
                <div className="bg-white rounded-2xl shadow p-6 mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Store className="inline h-4 w-4 mr-1" /> Seleccionar sucursal
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {branches.map(b => (
                            <button
                                key={b.id}
                                onClick={() => setSelectedBranch(b.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedBranch === b.id
                                    ? 'bg-green-600 text-white shadow'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {b.type === 'ACAI' ? '🥤' : b.type === 'HAMBURGUESAS' ? '🍔' : '🏭'} {b.name}
                            </button>
                        ))}
                    </div>
                    {branch && (
                        <p className="text-xs text-gray-400 mt-3">
                            {assignedCount} de {rows.length} productos asignados a esta sucursal
                        </p>
                    )}
                </div>

                {!selectedBranch ? (
                    <div className="text-center py-20 text-gray-400">
                        <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Seleccioná una sucursal para gestionar sus precios</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando productos…</div>
                ) : (
                    <>
                        {/* Filtros */}
                        <div className="flex gap-4 mb-4 items-center flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <input
                                    type="text" placeholder="Buscar producto o SKU…"
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                />
                            </div>
                            <select
                                value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                            >
                                <option value="">Todos los tipos</option>
                                {uniqueTypes.map(t => (
                                    <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tabla */}
                        <div className="bg-white rounded-2xl shadow overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Producto</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Precio (Bs.)</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Precio/Kg (Bs.)</th>
                                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Disponible</th>
                                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(row => {
                                        const dirty = isRowDirty(row.productId);
                                        const isAcai = row.type === 'ACAI_BASE' || row.type === 'ACAI_TOPPING';
                                        const rowActive = getRowValue(row, 'active') as boolean;
                                        return (
                                            <tr
                                                key={row.productId}
                                                className={`border-b border-gray-50 hover:bg-gray-50/50 ${!row.assigned ? 'opacity-60' : ''} ${dirty ? 'bg-yellow-50/50' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900">{row.productName}</p>
                                                    <p className="font-mono text-xs text-gray-400">{row.sku}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLORS[row.type] || 'bg-gray-100 text-gray-600'}`}>
                                                        {TYPE_LABELS[row.type] || row.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number" min="0" step="0.5"
                                                        value={getRowValue(row, 'customPrice') ?? ''}
                                                        onChange={e => handleFieldChange(row.productId, 'customPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                        placeholder=""
                                                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-300 text-right"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isAcai ? (
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={getRowValue(row, 'pricePerKg') ?? ''}
                                                            onChange={e => handleFieldChange(row.productId, 'pricePerKg', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                            placeholder=""
                                                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-300 text-right"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleActive(row)}
                                                        disabled={saving === row.productId}
                                                        className="inline-flex items-center gap-1 disabled:opacity-50"
                                                        title={rowActive ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {rowActive ? (
                                                            <ToggleRight className="h-6 w-6 text-green-600" />
                                                        ) : (
                                                            <ToggleLeft className="h-6 w-6 text-gray-300" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {dirty && (
                                                        <button
                                                            onClick={() => handleSave(row)}
                                                            disabled={saving === row.productId}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                                                        >
                                                            <Save className="h-3.5 w-3.5" />
                                                            {saving === row.productId ? '…' : 'Guardar'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                                No se encontraron productos
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="px-4 py-3 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                                {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
                                {Object.keys(editedRows).length > 0 && (
                                    <span className="ml-3 text-yellow-600 font-medium">
                                        • {Object.keys(editedRows).length} sin guardar
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
